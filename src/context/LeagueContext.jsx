import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_HANDICAP_SETTINGS, DEFAULT_COURSE_TEES } from '../utils/handicapCalculation'
import { addLeagueMember } from '../lib/leagueService'
import { getTemplateById, getDefaultTemplate } from '../lib/formatTemplateService'

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
        .select('data')
        .eq('id', leagueId)
        .single()
      if (error) {
        console.error('Supabase load error:', error)
        return null
      }

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
    nextRoundMessage: ''
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

  // Check-in state (persists across navigation)
  const [checkedInPlayers, setCheckedInPlayers] = useState([])
  const [manualTeams, setManualTeams] = useState([])

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

  // "View As" role override for testing (null = no override, use real role)
  const [viewAsRole, setViewAsRole] = useState(null) // null | 'admin' | 'user'

  // Course mapping data for GPS
  const [courseMapping, setCourseMapping] = useState(null)

  // Format template for the league
  const [formatTemplate, setFormatTemplate] = useState(null)

  const hasLoadedData = useRef(false)
  const isUpdatingFromRealtime = useRef(false)

  // Shared helper to populate all state from a league's data blob
  const loadLeagueData = (lid, data) => {
    setLeagueId(lid)

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
      nextRoundMessage: ''
    })
    setPendingPlayerRequests(data.pendingPlayerRequests || [])
    setSkinsMatch(data.skinsMatch || null)
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
      loadLeagueData(newLeagueId, data)
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
          loadLeagueData(existingLeagueId, data)
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
      moneyVisibility, defaultStartingHole, playerMoneyRecords, skinsMatch, quickSkinsHistory, quickSkinsMode,
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

  const createNewLeague = async (customCode = null, { leagueName, profileId } = {}) => {
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
      nextRoundMessage: ''
    })
    setPendingPlayerRequests([])
    setPayoutFormats({})
    setHoleInOnePot({ amount: 0, history: [] })
    setMoneyVisibility('admin')
    setDefaultStartingHole(1)
    setPlayerMoneyRecords({})
    setSkinsMatch(null)
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

    await CloudStorage.saveData(newLeagueId, {
      players: [],
      history: [],
      pairingRequests: [],
      liveRound: null,
      teams: []
    })

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
    const clonedData = {
      players: JSON.parse(JSON.stringify(players)),
      history: JSON.parse(JSON.stringify(history)),
      pairingRequests: JSON.parse(JSON.stringify(pairingRequests)),
      liveRound: liveRound ? JSON.parse(JSON.stringify(liveRound)) : null,
      teams: JSON.parse(JSON.stringify(teams)),
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

  const joinExistingLeague = async (code, { profileId } = {}) => {
    const normalizedCode = code.toUpperCase().trim()
    const data = await CloudStorage.loadData(normalizedCode)

    if (data) {
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
    return false
  }

  const leaveLeague = () => {
    localStorage.removeItem('leagueId')
    setLeagueId(null)
    setIsSetup(false)
    setPlayers([])
    setTeams([])
    setHistory([])
    setLiveRound(null)
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
  const actualAdmin = isAdminPIN || actualSiteOwner

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

  const value = {
    // League
    leagueId,
    isSetup,
    loading,
    saveStatus,
    createNewLeague,
    joinExistingLeague,
    leaveLeague,
    switchLeague,
    checkLeagueCodeAvailable,
    cloneLeagueToTest,

    // Admin
    isAdmin,
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
    setQuickSkinsMode,
    quickSkinsHistory,
    setQuickSkinsHistory,

    // Check-in state
    checkedInPlayers,
    setCheckedInPlayers,
    manualTeams,
    setManualTeams,

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
