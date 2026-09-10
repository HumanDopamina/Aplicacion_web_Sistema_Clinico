import { createContext, useContext } from 'react'

export const SystemFeaturesContext = createContext({ demo: false, uploads: true, password_reset: true })
export const useSystemFeatures = () => useContext(SystemFeaturesContext)
