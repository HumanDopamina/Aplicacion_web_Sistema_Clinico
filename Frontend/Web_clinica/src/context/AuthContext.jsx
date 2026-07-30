import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)
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
  const signOut = () => { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); setSession(null) }
  return <AuthContext.Provider value={{ user: session?.user, accessToken: session?.access, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  return value
}
