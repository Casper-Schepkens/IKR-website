'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type AiRouting = { api: boolean; bigViaApi: boolean }
export type AiSize = 'small' | 'big'

/**
 * Bepaalt per AI-knop of die de Claude API gebruikt (in het dashboard) of Claude opent
 * (connector, op het eigen abonnement). Standaard: kleine taken via API, grote via Claude.
 */
const AiModeContext = createContext<AiRouting>({ api: false, bigViaApi: false })

export function AiModeProvider({ routing, children }: { routing: AiRouting; children: ReactNode }) {
  return <AiModeContext.Provider value={routing}>{children}</AiModeContext.Provider>
}

export function useApiAi(size: AiSize = 'small') {
  const r = useContext(AiModeContext)
  return size === 'big' ? r.bigViaApi : r.api
}
