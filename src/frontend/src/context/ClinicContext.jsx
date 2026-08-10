import { useCallback, useEffect, useMemo, useState } from 'react'
import { getClinicProfile } from '../services/clinicService'
import { useAuth } from './authContextValue'
import { ClinicContext, defaultClinicProfile } from './clinicContextValue'

export function ClinicProvider({ children }) {
  const { accessToken } = useAuth()
  const [profile, setProfile] = useState(defaultClinicProfile)
  const [loading, setLoading] = useState(Boolean(accessToken))

  const refreshProfile = useCallback(async () => {
    if (!accessToken) return defaultClinicProfile
    setLoading(true)
    try {
      const loaded = await getClinicProfile(accessToken)
      setProfile(loaded)
      return loaded
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    let active = true
    if (!accessToken) {
      setProfile(defaultClinicProfile)
      setLoading(false)
      return undefined
    }
    getClinicProfile(accessToken)
      .then((loaded) => { if (active) setProfile(loaded) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken])

  const value = useMemo(
    () => ({ profile, loading, refreshProfile, setProfile }),
    [profile, loading, refreshProfile],
  )
  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
}
