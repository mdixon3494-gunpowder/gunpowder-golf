import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

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

  // Skins
  const [skinsMatch, setSkinsMatch] = useState(null)

  // Admin state
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('gunpowder_admin') === 'true'
  })

  const hasLoadedData = useRef(false)

  // Load existing league on mount
  useEffect(() => {
    const loadExistingLeague = async () => {
      const existingLeagueId = CloudStorage.getLeagueId()
      console.log('Loading league:', existingLeagueId)

      if (existingLeagueId) {
        const data = await CloudStorage.loadData(existingLeagueId)
        console.log('Loaded data:', data)

        if (data) {
          setLeagueId(existingLeagueId)

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
          setIsSetup(true)
        }
      }
      setLoading(false)
    }

    loadExistingLeague()
  }, [])

  // Save to Supabase when data changes
  useEffect(() => {
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
          skinsMatch
        },
        () => setSaveStatus('saving'),
        (success) => setSaveStatus(success ? 'saved' : 'error')
      )
    }
  }, [players, history, pairingRequests, liveRound, teams, leagueId, isSetup,
      leagueSettings, pendingPlayerRequests, payoutFormats, holeInOnePot,
      moneyVisibility, defaultStartingHole, playerMoneyRecords, skinsMatch])

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

          // Check if round was started on another device
          if (parsedNewData.liveRound && !liveRound) {
            console.log('Round started on another device')
            setLiveRound(normalizeRound(parsedNewData.liveRound))
            return
          }

          // Check if round was finished on another device
          if (!parsedNewData.liveRound && liveRound) {
            console.log('Round finished on another device')
            setLiveRound(null)
            return
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
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [leagueId, liveRound?.id])

  // League actions
  const createNewLeague = () => {
    const newLeagueId = CloudStorage.generateLeagueId()
    setLeagueId(newLeagueId)
    CloudStorage.setLeagueId(newLeagueId)
    setIsSetup(true)
    hasLoadedData.current = true
    CloudStorage.saveData(newLeagueId, {
      players: [],
      history: [],
      pairingRequests: [],
      liveRound: null,
      teams: []
    })
  }

  const joinExistingLeague = async (code) => {
    const normalizedCode = code.toUpperCase().trim()
    const data = await CloudStorage.loadData(normalizedCode)

    if (data) {
      setLeagueId(normalizedCode)
      CloudStorage.setLeagueId(normalizedCode)
      setPlayers(data.players || [])
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
      if (data.payoutFormats) setPayoutFormats(data.payoutFormats)
      if (data.holeInOnePot) setHoleInOnePot(data.holeInOnePot)
      if (data.moneyVisibility) setMoneyVisibility(data.moneyVisibility)
      if (data.defaultStartingHole) setDefaultStartingHole(data.defaultStartingHole)
      if (data.playerMoneyRecords) setPlayerMoneyRecords(data.playerMoneyRecords)
      setIsSetup(true)
      hasLoadedData.current = true
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

  // Admin actions
  const adminLogin = (pin) => {
    if (pin === '1234') {
      setIsAdmin(true)
      localStorage.setItem('gunpowder_admin', 'true')
      return true
    }
    return false
  }

  const adminLogout = () => {
    setIsAdmin(false)
    localStorage.removeItem('gunpowder_admin')
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

    // Admin
    isAdmin,
    adminLogin,
    adminLogout,

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
