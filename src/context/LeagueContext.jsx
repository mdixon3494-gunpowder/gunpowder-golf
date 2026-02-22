import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_HANDICAP_SETTINGS, DEFAULT_COURSE_TEES } from '../utils/handicapCalculation'
import { addLeagueMember, getMemberRole } from '../lib/leagueService'
import { useAuth } from './AuthContext'
import { getTemplateById, getDefaultTemplate } from '../lib/formatTemplateService'
import { saveRoundHistory, recalculateAndStoreHandicap } from '../lib/roundHistoryService'

const LeagueContext = createContext(null)

// Cloud storage utilities
const CloudStorage = {
  getLeagueId: () => localStorage.getItem('leagueId'),
  setLeagueId: (id) => localStorage.setItem('leagueId', id),
  generateLeagueId: () => Math.random().toString(36).substring(2, 8).toUpperCase(),

  saveData: async (leagueId, data, onSaveStart, onSaveEnd) => {
    try {
      if (onSaveStart) onSaveStart()
      const { error } = await supabase
        .from('leagues')
        .upsert({
          id: leagueId,
          data: data,
          updated_at: new Date()
        })
      if (error) {
        console.error('Supabase save error:', error)
        if (onSaveEnd) onSaveEnd(false)
      } else {
        if (onSaveEnd) onSaveEnd(true)
      }
    } catch (err) {
      console.error('Save error:', err)
      if (onSaveEnd) onSaveEnd(false)
    }
  },

  loadData: async (leagueId) => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('data, deleted_at')
        .eq('id', leagueId)
        .single()
      if (error) {
        console.error('Supabase load error:', error)
        return null
      }

      // Don't load soft-deleted leagues
      if (data?.deleted_at) return null

      const parsedData = typeof data?.data === 'string'
        ? JSON.parse(data.data)
        : data?.data

      return parsedData || null
    } catch (err) {
      console.error('Load error:', err)
      return null
    }
  }
}

// Helper to normalize round data
const normalizeRound = (round) => {
  if (!round) return null
  return {
    ...round,
    teams: round.teams.map(team => ({
      ...team,
      isFinished: team.isFinished || false,
      players: team.players.map(player => ({
        ...player,
        isDNF: player.isDNF === true,
        includeInTeamScore: player.includeInTeamScore !== false,
        joinedLate: player.joinedLate === true,
        scores: player.scores || {}
      }))
    }))
  }
}

export function LeagueProvider({ children }) {
  const { profile } = useAuth()

  // League state
  const [leagueId, setLeagueId] = useState(null)
  const [isSetup, setIsSetup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved', 'saving', 'error'

  // Core data
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [history, setHistory] = useState([])
  const [liveRound, setLiveRound] = useState(null)
  const [pairingRequests, setPairingRequests] = useState([])

  // Settings
  const [leagueSettings, setLeagueSettings] = useState({
    contactInfoVisibility: 'admin',
    nextRoundDate: '',
    nextRoundTime: '',
    nextRoundMessage: '',
    sideGames: { enabled: false, allowSkins: true, allowNassau: true }
  })
  const [payoutFormats, setPayoutFormats] = useState({
    matchPlay: { name: "Match Play (2 Teams)", greeniePerHole: 1, front9: 5, back9: 5, overall: 5, holeInOne: 1 },
    standard: { name: "Standard (3+ Teams)", greeniePerHole: 1, front9: 7, back9: 7, overall: 0, holeInOne: 1 }
  })
  const [holeInOnePot, setHoleInOnePot] = useState({
    balance: 0,
    payoutMethod: 'percentage',
    payoutPercentage: 70,
    fixedRemainder: 50,
    minimumPlayers: 6,
    transactions: [],
    playerEligibility: {}
  })
  const [moneyVisibility, setMoneyVisibility] = useState({
    skins: 'off',
    greenies: 'off',
    teamCompetition: 'off',
    holeInOne: 'off'
  })
  const [defaultStartingHole, setDefaultStartingHole] = useState(1)
  const [playerMoneyRecords, setPlayerMoneyRecords] = useState([])
  const [pendingPlayerRequests, setPendingPlayerRequests] = useState([])

  // Handicap settings
  const [handicapSettings, setHandicapSettings] = useState(DEFAULT_HANDICAP_SETTINGS)
  const [courseTees, setCourseTees] = useState(DEFAULT_COURSE_TEES)

  // Skins
  const [skinsMatch, setSkinsMatch] = useState(null)
  const [quickSkinsMode, setQuickSkinsMode] = useState(false)
  const [quickSkinsHistory, setQuickSkinsHistory] = useState([])

  // Nassau
  const [nassauMatch, setNassauMatch] = useState(null)

  // Wolf
  const [wolfMatch, setWolfMatch] = useState(null)

  // Check-in state (persists across navigation)
  const [checkedInPlayers, setCheckedInPlayers] = useState([])
  const [manualTeams, setManualTeams] = useState([])

  // Per-round format override (ephemeral, not persisted)
  const [roundFormatOverride, setRoundFormatOverride] = useState(null)

  // Admin state
  const [isAdminPIN, setIsAdminPIN] = useState(() => {
    return localStorage.getItem('gunpowder_admin') === 'true'
  })

  // Site Owner state (higher privilege than admin)
  const [isSiteOwnerPIN, setIsSiteOwnerPIN] = useState(() => {
    return localStorage.getItem('gunpowder_site_owner') === 'true'
  })

  // Profile-based site owner (auto-detected from profiles.is_site_owner)
  const [isSiteOwnerProfile, setIsSiteOwnerProfile] = useState(false)

  // Role from league_members table (queried on league load)
  const [userRole, setUserRole] = useState(null)

  // "View As" role override for testing (null = no override, use real role)
  const [viewAsRole, setViewAsRole] = useState(null) // null | 'admin' | 'user'

  // Course mapping data for GPS
  const [courseMapping, setCourseMapping] = useState(null)

  // League type: 'league' | 'casual' | 'individual'
  const [leagueType, setLeagueType] = useState('league')

  // Test league flag (cloned leagues)
  const [isTestLeague, setIsTestLeague] = useState(false)

  // Format template for the league
  const [formatTemplate, setFormatTemplate] = useState(null)

  const hasLoadedData = useRef(false)
  const isUpdatingFromRealtime = useRef(false)

  // Shared helper to populate all state from a league's data blob
  const loadLeagueData = (lid, data, type = null) => {
    setLeagueId(lid)
    if (type) setLeagueType(type)

    // Data migration: Add IDs to rounds that don't have them
    const migratedPlayers = (data.players || []).map(player => {
      if (player.scoreHistory && player.scoreHistory.length > 0) {
        const migratedHistory = player.scoreHistory.map(round => {
          if (!round.id) {
            return { ...round, id: Date.now() + Math.random() + player.id }
          }
          return round
        })
        return { ...player, scoreHistory: migratedHistory }
      }
      return player
    })

    setPlayers(migratedPlayers)
    setHistory(data.history || [])
    setPairingRequests(data.pairingRequests || [])
    setLiveRound(normalizeRound(data.liveRound))
    setTeams(data.teams || [])
    setLeagueSettings(data.leagueSettings || {
      contactInfoVisibility: 'admin',
      nextRoundDate: '',
      nextRoundTime: '',
      nextRoundMessage: '',
      sideGames: { enabled: false, allowSkins: true, allowNassau: true }
    })
    setPendingPlayerRequests(data.pendingPlayerRequests || [])
    setSkinsMatch(data.skinsMatch || null)
    setNassauMatch(data.nassauMatch || null)
    setWolfMatch(data.wolfMatch || null)
    if (data.payoutFormats) setPayoutFormats(data.payoutFormats)
    if (data.holeInOnePot) setHoleInOnePot(data.holeInOnePot)
    if (data.moneyVisibility) setMoneyVisibility(data.moneyVisibility)
    if (data.defaultStartingHole) setDefaultStartingHole(data.defaultStartingHole)
    if (data.playerMoneyRecords) setPlayerMoneyRecords(data.playerMoneyRecords)
    if (data.quickSkinsHistory) setQuickSkinsHistory(data.quickSkinsHistory)
    if (data.quickSkinsMode) setQuickSkinsMode(data.quickSkinsMode)
    if (data.handicapSettings) setHandicapSettings({ ...DEFAULT_HANDICAP_SETTINGS, ...data.handicapSettings })
    if (data.courseTees) setCourseTees({ ...DEFAULT_COURSE_TEES, ...data.courseTees })
    if (data.courseMapping) setCourseMapping(data.courseMapping)
    setIsTestLeague(Boolean(data.isTestLeague))
    setCheckedInPlayers([])
    setManualTeams([])
    setIsSetup(true)
    hasLoadedData.current = true

    // Load format template from league metadata (non-blocking)
    loadFormatTemplate(lid)
  }

  // Switch to a different league (user is already a member)
  const switchLeague = async (newLeagueId) => {
    const data = await CloudStorage.loadData(newLeagueId)
    if (data) {
      CloudStorage.setLeagueId(newLeagueId)
      // Fetch type column
      let type = 'league'
      try {
        const { data: meta } = await supabase
          .from('leagues')
          .select('type')
          .eq('id', newLeagueId)
          .single()
        if (meta?.type) type = meta.type
      } catch (err) {
        console.warn('Could not fetch league type:', err)
      }
      loadLeagueData(newLeagueId, data, type)
      return true
    }
    return false
  }

  // Load existing league on mount
  useEffect(() => {
    const loadExistingLeague = async () => {
      const existingLeagueId = CloudStorage.getLeagueId()
      console.log('Loading league:', existingLeagueId)

      if (existingLeagueId) {
        const data = await CloudStorage.loadData(existingLeagueId)
        console.log('Loaded data:', data)

        if (data) {
          // Fetch type column
          let type = 'league'
          try {
            const { data: meta } = await supabase
              .from('leagues')
              .select('type')
              .eq('id', existingLeagueId)
              .single()
            if (meta?.type) type = meta.type
          } catch (err) {
            console.warn('Could not fetch league type:', err)
          }
          loadLeagueData(existingLeagueId, data, type)
        }
      }
      setLoading(false)
    }

    loadExistingLeague()
  }, [])

  // Save to Supabase when data changes
  useEffect(() => {
    // Skip saving if we're updating from a real-time subscription
    if (isUpdatingFromRealtime.current) {
      return
    }
    if (leagueId && isSetup && hasLoadedData.current) {
      CloudStorage.saveData(
        leagueId,
        {
          players,
          history,
          pairingRequests,
          liveRound,
          teams,
          leagueSettings,
          pendingPlayerRequests,
          payoutFormats,
          holeInOnePot,
          moneyVisibility,
          defaultStartingHole,
          playerMoneyRecords,
          skinsMatch,
          nassauMatch,
          wolfMatch,
          quickSkinsHistory,
          quickSkinsMode,
          handicapSettings,
          courseTees,
          courseMapping
        },
        () => setSaveStatus('saving'),
        (success) => setSaveStatus(success ? 'saved' : 'error')
      )
    }
  }, [players, history, pairingRequests, liveRound, teams, leagueId, isSetup,
      leagueSettings, pendingPlayerRequests, payoutFormats, holeInOnePot,
      moneyVisibility, defaultStartingHole, playerMoneyRecords, skinsMatch, nassauMatch, wolfMatch, quickSkinsHistory, quickSkinsMode,
      handicapSettings, courseTees, courseMapping])

  // Mark data as loaded
  useEffect(() => {
    if (players.length > 0 || history.length > 0) {
      hasLoadedData.current = true
    }
  }, [players, history])

  // Real-time subscription
  useEffect(() => {
    if (!leagueId) return

    console.log('Setting up real-time subscription for league:', leagueId)

    const channel = supabase
      .channel(`league-changes-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leagues',
          filter: `id=eq.${leagueId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          const newData = payload.new.data
          const parsedNewData = typeof newData === 'string' ? JSON.parse(newData) : newData

          // Set flag to prevent save loop
          isUpdatingFromRealtime.current = true

          // Check if round was started on another device
          if (parsedNewData.liveRound && !liveRound) {
            console.log('Round started on another device')
            setLiveRound(normalizeRound(parsedNewData.liveRound))
            setTimeout(() => { isUpdatingFromRealtime.current = false }, 100)
            return
          }

          // Check if round was finished on another device
          if (!parsedNewData.liveRound && liveRound) {
            console.log('Round finished on another device')
            setLiveRound(null)
            setTimeout(() => { isUpdatingFromRealtime.current = false }, 100)
            return
          }

          // Update quickSkinsMode if changed
          if (parsedNewData.quickSkinsMode !== undefined && parsedNewData.quickSkinsMode !== quickSkinsMode) {
            console.log('Quick Skins mode changed on another device')
            setQuickSkinsMode(parsedNewData.quickSkinsMode)
          }

          // Update live round if changed
          if (parsedNewData?.liveRound && liveRound) {
            const currentRoundStr = JSON.stringify(liveRound)
            const newRoundStr = JSON.stringify(parsedNewData.liveRound)

            if (currentRoundStr !== newRoundStr) {
              console.log('Updating live round with new data')
              setLiveRound(normalizeRound(parsedNewData.liveRound))
            }
          }

          // Update teams if changed
          if (parsedNewData?.teams) {
            const currentTeamsStr = JSON.stringify(teams)
            const newTeamsStr = JSON.stringify(parsedNewData.teams)

            if (currentTeamsStr !== newTeamsStr) {
              console.log('Updating teams with new data')
              setTeams(parsedNewData.teams)
            }
          }

          // Update players if changed
          if (parsedNewData?.players) {
            const currentPlayersStr = JSON.stringify(players)
            const newPlayersStr = JSON.stringify(parsedNewData.players)

            if (currentPlayersStr !== newPlayersStr) {
              setPlayers(parsedNewData.players)
            }
          }

          // Clear flag after state updates are processed
          setTimeout(() => { isUpdatingFromRealtime.current = false }, 100)
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [leagueId, liveRound?.id])

  // Fetch user role from league_members when league or profile changes
  useEffect(() => {
    if (!leagueId || !profile?.id) {
      setUserRole(null)
      return
    }
    let cancelled = false
    getMemberRole(leagueId, profile.id).then(role => {
      if (!cancelled) setUserRole(role)
    })
    return () => { cancelled = true }
  }, [leagueId, profile?.id])

  // Load format template for a league (checks league metadata for template_id, falls back to default)
  const loadFormatTemplate = async (lid) => {
    try {
      const { data: leagueMeta } = await supabase
        .from('leagues')
        .select('format_template_id')
        .eq('id', lid)
        .single()

      if (leagueMeta?.format_template_id) {
        const template = await getTemplateById(leagueMeta.format_template_id)
        if (template) {
          setFormatTemplate(template)
          return
        }
      }
      // Fall back to default template
      const defaultTemplate = await getDefaultTemplate()
      if (defaultTemplate) setFormatTemplate(defaultTemplate)
    } catch (err) {
      console.warn('Could not load format template:', err)
    }
  }

  // League actions
  const checkLeagueCodeAvailable = async (code) => {
    const normalizedCode = code.toUpperCase().trim().replace(/[^A-Z0-9]/g, '')
    if (normalizedCode.length < 3) return { available: false, error: 'Code must be at least 3 characters' }
    if (normalizedCode.length > 20) return { available: false, error: 'Code must be 20 characters or less' }

    const existingData = await CloudStorage.loadData(normalizedCode)
    if (existingData) {
      return { available: false, error: 'This code is already taken' }
    }
    return { available: true, normalizedCode }
  }

  const createNewLeague = async (customCode = null, { leagueName, profileId, initialSettings } = {}) => {
    let newLeagueId

    if (customCode) {
      const check = await checkLeagueCodeAvailable(customCode)
      if (!check.available) {
        return { success: false, error: check.error }
      }
      newLeagueId = check.normalizedCode
    } else {
      newLeagueId = CloudStorage.generateLeagueId()
    }

    // Reset all state to defaults for new league
    setPlayers([])
    setTeams([])
    setHistory([])
    setLiveRound(null)
    setPairingRequests([])
    setLeagueSettings({
      contactInfoVisibility: 'admin',
      nextRoundDate: '',
      nextRoundTime: '',
      nextRoundMessage: '',
      sideGames: { enabled: false, allowSkins: true, allowNassau: true }
    })
    setPendingPlayerRequests([])
    setPayoutFormats({})
    setHoleInOnePot({ amount: 0, history: [] })
    setMoneyVisibility('admin')
    setDefaultStartingHole(1)
    setPlayerMoneyRecords({})
    setSkinsMatch(null)
    setNassauMatch(null)
    setWolfMatch(null)
    setQuickSkinsHistory([])
    setQuickSkinsMode(false)
    setHandicapSettings(DEFAULT_HANDICAP_SETTINGS)
    setCourseTees(DEFAULT_COURSE_TEES)
    setCheckedInPlayers([])
    setManualTeams([])

    setLeagueId(newLeagueId)
    CloudStorage.setLeagueId(newLeagueId)
    setIsSetup(true)
    hasLoadedData.current = true

    // Get default format template id for the new league
    let formatTemplateId = null
    try {
      const defaultTemplate = await getDefaultTemplate()
      if (defaultTemplate) {
        formatTemplateId = defaultTemplate.id
        setFormatTemplate(defaultTemplate)
      }
    } catch (err) {
      console.warn('Could not load default template for new league:', err)
    }

    // Build initial players array — auto-add creator if authenticated
    const initialPlayers = []
    if (profileId && profile) {
      initialPlayers.push({
        id: profileId,
        name: profile.display_name,
        skillRating: 5,
        handicap: profile.handicap_index != null ? parseFloat(profile.handicap_index) : null,
        handicapSource: profile.handicap_index != null ? 'profile' : null,
        defaultTee: profile.default_tee || 'blue',
        externalRounds: [],
        phone: profile.phone || '',
        email: profile.email || '',
        emergencyName: '',
        emergencyPhone: '',
        gamesPlayed: 0,
        avgFrontNine: 0,
        avgBackNine: 0,
        avgTotal: 0,
        teammates: {},
        recentTeammates: [],
        lastRoundTeammates: [],
        scoreHistory: [],
        holeStats: {},
        isActive: true,
        profileId: profileId,
        profile_id: profileId
      })
    }

    await CloudStorage.saveData(newLeagueId, {
      players: initialPlayers,
      history: [],
      pairingRequests: [],
      liveRound: null,
      teams: []
    })

    // Set state so UI reflects the creator as a player immediately
    if (initialPlayers.length > 0) {
      setPlayers(initialPlayers)
    }

    // Set league metadata columns (non-blocking)
    try {
      await supabase
        .from('leagues')
        .update({
          name: leagueName || `League ${newLeagueId}`,
          owner_id: profileId || null,
          format_template_id: formatTemplateId
        })
        .eq('id', newLeagueId)
    } catch (err) {
      console.warn('Could not set league metadata:', err)
    }

    // Create league_members row if authenticated with a profile
    if (profileId) {
      try {
        await addLeagueMember(newLeagueId, profileId, 'owner')
      } catch (err) {
        console.warn('Could not create league member row:', err)
      }
    }

    // Apply initial settings from wizard if provided
    if (initialSettings) {
      if (initialSettings.handicapSettings) {
        setHandicapSettings(prev => ({ ...prev, ...initialSettings.handicapSettings }))
      }
      if (initialSettings.sideGames) {
        setLeagueSettings(prev => ({ ...prev, sideGames: { ...prev.sideGames, ...initialSettings.sideGames } }))
      }
      if (initialSettings.courseName) {
        setCourseTees(prev => ({ ...prev, courseName: initialSettings.courseName }))
      }
    }

    return { success: true, leagueId: newLeagueId }
  }

  const cloneLeagueToTest = async (testCode = null) => {
    // Generate test code if not provided
    const baseTestCode = testCode || `TEST-${leagueId}`
    const check = await checkLeagueCodeAvailable(baseTestCode)

    if (!check.available) {
      return { success: false, error: check.error }
    }

    const testLeagueId = check.normalizedCode

    // Clone all current data to the test league
    // Strip profileId from cloned players to prevent test rounds from
    // interfering with real players' round_history and handicap calculations
    const stripProfileId = (obj) => {
      if (obj == null) return obj
      const clone = JSON.parse(JSON.stringify(obj))
      const strip = (item) => { if (item && typeof item === 'object') { delete item.profileId } }
      // Strip from top-level players array
      if (Array.isArray(clone)) clone.forEach(strip)
      // Strip from nested team players
      if (clone.teams) clone.teams.forEach(t => { if (t.players) t.players.forEach(strip) })
      return clone
    }

    const clonedPlayers = JSON.parse(JSON.stringify(players)).map(p => {
      delete p.profileId
      return p
    })

    const clonedLiveRound = liveRound ? stripProfileId(liveRound) : null

    const clonedTeams = JSON.parse(JSON.stringify(teams)).map(team => {
      if (Array.isArray(team)) return team.map(p => { delete p.profileId; return p })
      if (team.players) team.players.forEach(p => { delete p.profileId })
      return team
    })

    const clonedData = {
      players: clonedPlayers,
      history: JSON.parse(JSON.stringify(history)),
      pairingRequests: JSON.parse(JSON.stringify(pairingRequests)),
      liveRound: clonedLiveRound,
      teams: clonedTeams,
      leagueSettings: JSON.parse(JSON.stringify(leagueSettings)),
      pendingPlayerRequests: JSON.parse(JSON.stringify(pendingPlayerRequests)),
      payoutFormats: JSON.parse(JSON.stringify(payoutFormats)),
      holeInOnePot: JSON.parse(JSON.stringify(holeInOnePot)),
      moneyVisibility,
      defaultStartingHole,
      playerMoneyRecords: JSON.parse(JSON.stringify(playerMoneyRecords)),
      quickSkinsHistory: JSON.parse(JSON.stringify(quickSkinsHistory)),
      quickSkinsMode,
      handicapSettings: JSON.parse(JSON.stringify(handicapSettings)),
      courseTees: JSON.parse(JSON.stringify(courseTees)),
      isTestLeague: true,
      sourceLeagueId: leagueId
    }

    await CloudStorage.saveData(testLeagueId, clonedData)

    return { success: true, testLeagueId }
  }

  const joinExistingLeague = async (code, { profileId, displayName, email } = {}) => {
    const normalizedCode = code.toUpperCase().trim()
    const data = await CloudStorage.loadData(normalizedCode)

    if (!data) return false

    // Check if join approval is required
    let approvalRequired = false
    try {
      const { data: meta } = await supabase
        .from('leagues')
        .select('join_approval_required')
        .eq('id', normalizedCode)
        .limit(1)
      if (meta?.[0]?.join_approval_required) approvalRequired = true
    } catch (err) {
      console.warn('Could not check approval setting:', err)
    }

    if (approvalRequired && profileId) {
      // Add to pending requests in the league JSONB blob
      const pending = data.pendingPlayerRequests || []
      // Don't add if already pending
      if (!pending.some(r => r.profileId === profileId)) {
        pending.push({
          id: Date.now().toString(),
          profileId,
          name: displayName || email || 'Unknown',
          email: email || null,
          requestedAt: new Date().toISOString()
        })
        // Save updated pending list directly
        await CloudStorage.saveData(normalizedCode, {
          ...data,
          pendingPlayerRequests: pending
        })
      }
      return 'pending'
    }

    CloudStorage.setLeagueId(normalizedCode)
    loadLeagueData(normalizedCode, data)

    // Create league_members row if authenticated with a profile
    if (profileId) {
      try {
        await addLeagueMember(normalizedCode, profileId, 'player')
      } catch (err) {
        console.warn('Could not create league member row:', err)
      }
    }

    return true
  }

  const leaveLeague = () => {
    localStorage.removeItem('leagueId')
    setLeagueId(null)
    setIsSetup(false)
    setPlayers([])
    setTeams([])
    setHistory([])
    setLiveRound(null)
    setUserRole(null)
    hasLoadedData.current = false
  }

  // Sync site owner status from profile
  const syncSiteOwnerFromProfile = (profile) => {
    if (profile?.is_site_owner) {
      setIsSiteOwnerProfile(true)
    }
  }

  // Computed roles (respecting "View As" override)
  const actualSiteOwner = isSiteOwnerPIN || isSiteOwnerProfile
  const roleBasedAdmin = userRole && ['owner', 'co_owner', 'admin'].includes(userRole)
  const actualAdmin = isAdminPIN || actualSiteOwner || roleBasedAdmin
  const isLeagueOwner = userRole === 'owner' || actualSiteOwner

  // When viewing as a lower role, downgrade privileges
  const isSiteOwner = viewAsRole ? false : actualSiteOwner
  const isAdmin = viewAsRole === 'user' ? false : (viewAsRole === 'admin' ? true : actualAdmin)

  // Admin actions
  const adminLogin = (pin) => {
    if (pin === '1234') {
      setIsAdminPIN(true)
      localStorage.setItem('gunpowder_admin', 'true')
      return true
    }
    return false
  }

  const adminLogout = () => {
    setIsAdminPIN(false)
    localStorage.removeItem('gunpowder_admin')
  }

  // Site Owner actions
  const siteOwnerLogin = (pin) => {
    if (pin === '3494') {
      setIsSiteOwnerPIN(true)
      localStorage.setItem('gunpowder_site_owner', 'true')
      return true
    }
    return false
  }

  const siteOwnerLogout = () => {
    setIsSiteOwnerPIN(false)
    localStorage.removeItem('gunpowder_site_owner')
    setViewAsRole(null)
  }

  // Casual game helpers
  const isCasualGame = leagueType === 'casual'
  const isIndividualRound = leagueType === 'individual'

  const saveCasualRoundHistory = async (roundPlayers, applyChoices = {}) => {
    // roundPlayers: array of { id, profileId, name, scores, front9, back9, total, handicap, tee }
    // applyChoices: { [profileId]: boolean } - whether to apply to handicap
    const entries = roundPlayers
      .filter(p => p.profileId && !p.isGuest)
      .map(p => ({
        profile_id: p.profileId,
        source_id: leagueId,
        round_type: 'casual',
        date: new Date().toISOString().split('T')[0],
        course_name: 'Gunpowder Golf Course',
        holes_played: 18,
        total_score: p.total || null,
        front_nine: p.front9 || null,
        back_nine: p.back9 || null,
        scores: p.scores || null,
        handicap_used: p.handicap || null,
        applied_to_handicap: applyChoices[p.profileId] !== false,
        format_name: null,
        metadata: { tee: p.tee || 'blue' }
      }))

    if (entries.length === 0) return []
    const result = await saveRoundHistory(entries)

    // Recalculate handicap for each player (non-blocking)
    entries.forEach(e => {
      if (e.applied_to_handicap) {
        recalculateAndStoreHandicap(e.profile_id, courseTees).catch(() => {})
      }
    })

    return result
  }

  const saveIndividualRoundHistory = async (profileId, roundData) => {
    // roundData: { scores, front9, back9, total, handicap, tee, holesPlayed, startingHole }
    const entry = {
      profile_id: profileId,
      source_id: leagueId,
      round_type: 'individual',
      date: new Date().toISOString().split('T')[0],
      course_name: 'Gunpowder Golf Course',
      holes_played: roundData.holesPlayed || 18,
      total_score: roundData.total || null,
      front_nine: roundData.front9 || null,
      back_nine: roundData.back9 || null,
      scores: roundData.scores || null,
      handicap_used: roundData.handicap || null,
      applied_to_handicap: true,
      format_name: null,
      metadata: {
        tee: roundData.tee || 'blue',
        startingHole: roundData.startingHole || 1
      }
    }
    const result = await saveRoundHistory([entry])

    // Recalculate handicap (non-blocking)
    recalculateAndStoreHandicap(profileId, courseTees).catch(() => {})

    return result
  }

  const saveLeagueRoundHistory = async (roundPlayers) => {
    // Skip saving for test leagues to avoid polluting real player data
    if (isTestLeague) return []

    // roundPlayers: array of { profileId, scores, front9, back9, total, handicap, tee }
    const entries = roundPlayers
      .filter(p => p.profileId)
      .map(p => ({
        profile_id: p.profileId,
        source_id: leagueId,
        round_type: 'league',
        date: new Date().toISOString().split('T')[0],
        course_name: 'Gunpowder Golf Course',
        holes_played: 18,
        total_score: p.total || null,
        front_nine: p.front9 || null,
        back_nine: p.back9 || null,
        scores: p.scores || null,
        handicap_used: p.handicap || null,
        applied_to_handicap: true,
        format_name: null,
        metadata: { tee: p.tee || 'blue' }
      }))

    if (entries.length === 0) return []
    try {
      const result = await saveRoundHistory(entries)

      // Recalculate handicap for each player (non-blocking)
      entries.forEach(e => {
        recalculateAndStoreHandicap(e.profile_id, courseTees).catch(() => {})
      })

      return result
    } catch (err) {
      console.warn('saveLeagueRoundHistory failed:', err.message)
      return []
    }
  }

  const value = {
    // League
    leagueId,
    isSetup,
    loading,
    saveStatus,
    leagueType,
    isCasualGame,
    isIndividualRound,
    createNewLeague,
    joinExistingLeague,
    leaveLeague,
    switchLeague,
    checkLeagueCodeAvailable,
    cloneLeagueToTest,
    saveCasualRoundHistory,
    saveIndividualRoundHistory,
    saveLeagueRoundHistory,

    // Admin & Roles
    isAdmin,
    userRole,
    isLeagueOwner,
    adminLogin,
    adminLogout,

    // Site Owner
    isSiteOwner,
    siteOwnerLogin,
    siteOwnerLogout,
    syncSiteOwnerFromProfile,
    actualSiteOwner,
    viewAsRole,
    setViewAsRole,

    // GPS Course Mapping
    courseMapping,
    setCourseMapping,

    // Format template
    formatTemplate,

    // Core data
    players,
    setPlayers,
    teams,
    setTeams,
    history,
    setHistory,
    liveRound,
    setLiveRound,
    pairingRequests,
    setPairingRequests,

    // Settings
    leagueSettings,
    setLeagueSettings,
    payoutFormats,
    setPayoutFormats,
    holeInOnePot,
    setHoleInOnePot,
    moneyVisibility,
    setMoneyVisibility,
    defaultStartingHole,
    setDefaultStartingHole,
    playerMoneyRecords,
    setPlayerMoneyRecords,
    pendingPlayerRequests,
    setPendingPlayerRequests,

    // Skins
    skinsMatch,
    setSkinsMatch,
    quickSkinsMode,

    // Nassau
    nassauMatch,
    setNassauMatch,

    // Wolf
    wolfMatch,
    setWolfMatch,
    setQuickSkinsMode,
    quickSkinsHistory,
    setQuickSkinsHistory,

    // Check-in state
    checkedInPlayers,
    setCheckedInPlayers,
    manualTeams,
    setManualTeams,

    // Round format override
    roundFormatOverride,
    setRoundFormatOverride,

    // Handicap settings
    handicapSettings,
    setHandicapSettings,
    courseTees,
    setCourseTees,

    // Utilities
    normalizeRound
  }

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague() {
  const context = useContext(LeagueContext)
  if (!context) {
    throw new Error('useLeague must be used within a LeagueProvider')
  }
  return context
}

export default LeagueContext
