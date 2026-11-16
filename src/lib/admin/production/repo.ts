import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_STEPS } from './core'
import { memoryProductionStore, supabaseProductionStore, type ProductionStore } from './store'

export type ProductionRepo = ProductionStore

export function supabaseProduction(db: SupabaseClient): ProductionRepo {
  return supabaseProductionStore(db)
}

/** Vaste id van het standaard-sjabloon in het geheugen (lokaal en in de tests). */
export const MEMORY_TEMPLATE_ID = '00000000-0000-4000-8000-0000000000a1'

/** Alleen lokaal zonder Supabase: met het standaard-sjabloon gezaaid. */
export function memoryProduction(): ProductionRepo {
  return memoryProductionStore((insert) => {
    insert('production_templates', { id: MEMORY_TEMPLATE_ID, name: 'Standaard', is_default: true })
    for (const s of DEFAULT_STEPS) insert('production_template_steps', { ...s, template_id: MEMORY_TEMPLATE_ID })
  })
}
