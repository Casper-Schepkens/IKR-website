'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type AiRouting = { api: boolean; bigViaApi: boolean; grok: boolean }
/** small/big = via de API (als er een sleutel is); account = altijd in Claude (eigen abonnement). */
export type AiSize = 'small' | 'big' | 'account'

/**
 * Bepaalt per AI-knop of die de Claude API gebruikt (in het dashboard) of Claude opent
 * (connector, op het eigen abonnement). Met een sleutel loopt alles via de API, behalve
 * knoppen met size 'account' (presentaties), die altijd Claude openen.
 */
const AiModeContext = createContext<AiRouting>({ api: false, bigViaApi: false, grok: false })

export function AiModeProvider({ routing, children }: { routing: AiRouting; children: ReactNode }) {
  return <AiModeContext.Provider value={routing}>{children}</AiModeContext.Provider>
}

/** Is de Grok-bot gekoppeld (voor het uitwerken van ideeën)? */
export function useGrok() {
  return useContext(AiModeContext).grok
}

export function useApiAi(size: AiSize = 'small') {
  const r = useContext(AiModeContext)
  if (size === 'account') return false
  return size === 'big' ? r.bigViaApi : r.api
}
