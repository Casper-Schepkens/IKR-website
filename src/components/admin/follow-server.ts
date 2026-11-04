'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { keepEdited } from '@/lib/admin/live'

/**
 * Lokale tekst die de server volgt, zolang de gebruiker die tekst niet zelf heeft aangepast.
 * Zo verschijnt een herschreven concept meteen, zonder een half getypte mail te overschrijven.
 */
export function useFollowServer(server: string): [string, Dispatch<SetStateAction<string>>] {
  const [prev, setPrev] = useState(server)
  const [value, setValue] = useState(server)
  if (server !== prev) {
    setPrev(server)
    setValue((cur) => keepEdited(cur, prev, server))
  }
  return [value, setValue]
}
