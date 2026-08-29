import { useCallback, useEffect, useState } from 'react'
import { logout as revokeSession, restoreSession } from '../services/authService'
import { clearAccessToken, setAccessToken, setSessionExpiredHandler } from '../services/api'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children, initialSession }) {
  const hasInitialSession = initialSession !== undefined
  const [session, setSession] = useState(initialSession ?? null)
  const [initializing, setInitializing] = useState(!hasInitialSession)

  useEffect(() => {
    if (hasInitialSession) {
      setAccessToken(initialSession?.access)
      return undefined
    }
    let active = true
    restoreSession()
      .then((restored) => {
        if (active) setSession(restored)
      })
      .catch(() => {
        clearAccessToken()
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setInitializing(false)
      })
    return () => { active = false }
  }, [hasInitialSession, initialSession])

  useEffect(() => {
    setSessionExpiredHandler(() => setSession(null))
    return () => setSessionExpiredHandler(null)
  }, [])

  const signIn = useCallback((data) => {
    setAccessToken(data.access)
    setSession(data)
    setInitializing(false)
  }, [])

  const signOut = useCallback(async ({ revoke = true } = {}) => {
    const access = session?.access
    try {
      if (revoke && access) await revokeSession({ access })
    } catch {
      // La sesión local se cierra aunque la API no esté disponible.
    } finally {
      clearAccessToken()
      setSession(null)
    }
  }, [session?.access])

  const updateUser = useCallback((user) => {
    setSession((current) => current ? { ...current, user } : current)
  }, [])

  return (
    <AuthContext.Provider value={{
      user: session?.user,
      accessToken: session?.access,
      initializing,
      signIn,
      signOut,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
