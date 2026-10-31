'use client'

import { createContext, useContext, type ReactNode } from 'react'

/** true = AI-knoppen gebruiken de Claude API; false = ze openen Claude (via de connector). */
const AiModeContext = createContext(false)

export function AiModeProvider({ apiEnabled, children }: { apiEnabled: boolean; children: ReactNode }) {
  return <AiModeContext.Provider value={apiEnabled}>{children}</AiModeContext.Provider>
}

export function useApiAi() {
  return useContext(AiModeContext)
}
