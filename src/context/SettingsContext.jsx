import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  const [isBrainMode, setIsBrainMode] = useState(() => {
    return localStorage.getItem('isBrainMode') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('isBrainMode', isBrainMode)
  }, [isBrainMode])

  return (
    <SettingsContext.Provider value={{ isBrainMode, setIsBrainMode }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
