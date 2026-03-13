import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getProfileByUserId, createProfile, updateProfile, unlinkProfile, getGhostProfileByEmail, claimProfile, sanitizeDisplayName } from '../lib/profileService'

const AuthContext = createContext(null)

// Helper: wrap a promise with a timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
    )
  ])
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsProfileClaim, setNeedsProfileClaim] = useState(false)

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && mounted) {
          setUser(session.user)
          await loadProfile(session.user)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setNeedsProfileClaim(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Sync profile email with auth email if they differ (fire and forget)
  const syncEmailIfNeeded = (profileData, authUser) => {
    if (authUser.email && profileData.email !== authUser.email) {
      console.log('Syncing profile email to', authUser.email)
      const updated = { ...profileData, email: authUser.email }
      setProfile(updated)
      cacheProfile(updated)
      // Update in Supabase in background
      updateProfile(profileData.id, { email: authUser.email }).catch(() => {})
    }
  }

  const CACHE_FRESH_MS = 24 * 60 * 60 * 1000 // 24 hours

  // Save profile + timestamp to cache
  const cacheProfile = (profileData) => {
    localStorage.setItem('cachedProfile', JSON.stringify({
      ...profileData,
      _cachedAt: Date.now()
    }))
  }

  // Try to refresh profile from Supabase, updating state + cache on success
  const refreshFromSupabase = async (authUser, { blocking = false } = {}) => {
    try {
      const fresh = blocking
        ? await withTimeout(getProfileByUserId(authUser.id), 8000)
        : await getProfileByUserId(authUser.id)

      if (fresh) {
        syncEmailIfNeeded(fresh, authUser)
        setProfile(fresh)
        cacheProfile(fresh)
        setNeedsProfileClaim(false)
      } else if (blocking) {
        // Only act on "no profile found" during blocking refresh
        // (background refresh returning null could just be a timeout/error)
        setNeedsProfileClaim(true)
      }
      return fresh
    } catch (err) {
      if (blocking) {
        console.error('Blocking profile refresh failed:', err.message)
      }
      return null
    }
  }

  const loadProfile = async (authUser) => {
    // Check localStorage cache
    const cached = localStorage.getItem('cachedProfile')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.user_id === authUser.id) {
          const cacheAge = Date.now() - (parsed._cachedAt || 0)
          const isStale = cacheAge > CACHE_FRESH_MS

          // Always use cache immediately for instant load
          console.log(`Using cached profile for ${parsed.display_name} (${isStale ? 'stale' : 'fresh'})`)
          setProfile(parsed)
          setNeedsProfileClaim(false)
          syncEmailIfNeeded(parsed, authUser)

          if (isStale) {
            // Stale cache: try a blocking refresh, but fall back to cache if it fails
            const fresh = await refreshFromSupabase(authUser, { blocking: true })
            if (!fresh) {
              console.log('Stale refresh failed, keeping cached profile')
              // Keep using cache - don't send to claim screen
            }
          } else {
            // Fresh cache: background refresh (fire and forget)
            refreshFromSupabase(authUser).catch(() => {})
          }
          return
        }
      } catch (e) { /* invalid cache, continue to query */ }
    }

    // No cache at all - must do a blocking query
    const fresh = await refreshFromSupabase(authUser, { blocking: true })
    if (!fresh) {
      // No profile linked yet - check if a ghost profile was pre-assigned to this email
      if (authUser.email) {
        try {
          const ghost = await withTimeout(getGhostProfileByEmail(authUser.email), 5000)
          if (ghost) {
            console.log('Auto-claiming pre-assigned ghost profile:', ghost.display_name)
            const claimed = await withTimeout(claimProfile(ghost.id, authUser.id, authUser.email), 5000)
            if (claimed) {
              setProfile(claimed)
              setNeedsProfileClaim(false)
              cacheProfile(claimed)
              return
            }
          }
        } catch (err) {
          console.warn('Auto-claim by email failed:', err.message)
        }
      }
      // Nothing found - send to claim/create screen
      setNeedsProfileClaim(true)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
      }
    })
    if (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, displayName) => {
    const cleanName = sanitizeDisplayName(displayName)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: cleanName }
      }
    })
    if (error) throw error

    // If signup is immediate (no email confirmation required), create profile
    if (data.user && !data.user.identities?.length === 0) {
      try {
        const newProfile = await createProfile({
          userId: data.user.id,
          displayName: cleanName,
          email
        })
        setProfile(newProfile)
        setNeedsProfileClaim(false)
      } catch (profileErr) {
        console.error('Profile creation after signup error:', profileErr)
      }
    }

    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
    setNeedsProfileClaim(false)
    localStorage.removeItem('cachedProfile')
  }

  const createAndSetProfile = async ({ displayName, phone }) => {
    if (!user) throw new Error('Must be authenticated to create a profile')

    const newProfile = await createProfile({
      userId: user.id,
      displayName,
      email: user.email,
      phone
    })
    setProfile(newProfile)
    setNeedsProfileClaim(false)
    cacheProfile(newProfile)
    return newProfile
  }

  const setClaimedProfile = (claimedProfile) => {
    setProfile(claimedProfile)
    setNeedsProfileClaim(false)
    cacheProfile(claimedProfile)
  }

  const unlinkMyProfile = async () => {
    if (!profile) throw new Error('No profile to unlink')
    await unlinkProfile(profile.id)
    setProfile(null)
    setNeedsProfileClaim(true)
    localStorage.removeItem('cachedProfile')
  }

  const value = {
    user,
    profile,
    loading,
    needsProfileClaim,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    signOut,
    createAndSetProfile,
    setClaimedProfile,
    unlinkMyProfile,
    refreshProfile: () => user ? loadProfile(user) : null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
