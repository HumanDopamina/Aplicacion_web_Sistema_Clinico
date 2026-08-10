import { useCallback, useState } from 'react'
import { logout as revokeSession } from '../services/authService'
import { AuthContext } from './authContextValue'

const KEY = 'dentalclinic_session'
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || 'null') } catch { return null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)
  const signIn = (data, remember) => {
    const storage = remember ? localStorage : sessionStorage
    const other = remember ? sessionStorage : localStorage
    other.removeItem(KEY)
    storage.setItem(KEY, JSON.stringify(data))
    setSession(data)
  }
  const signOut = async () => {
    const sessionToRevoke = session
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
    setSession(null)
    if (sessionToRevoke?.access && sessionToRevoke?.refresh) {
      try {
        await revokeSession(sessionToRevoke)
      } catch {
        // Local logout must still complete if the API is temporarily unavailable.
      }
    }
  }
  const updateUser = useCallback((user) => {
    setSession((current) => {
      if (!current) return current
      const next = { ...current, user }
      const storage = localStorage.getItem(KEY) ? localStorage : sessionStorage
      storage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])
  return <AuthContext.Provider value={{ user: session?.user, accessToken: session?.access, signIn, signOut, updateUser }}>{children}</AuthContext.Provider>
}
