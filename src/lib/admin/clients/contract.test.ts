import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('../supabase/server', () => ({ createServiceSupabase: () => ({}) }))
import { describeProposal, proposalPatch } from './contract'
import { contractQuery, searchNames } from './contract-docs'
import type { AiJob } from '../ai/jobs'
import type { Client } from './types'

const albert: Client = {
  id: 'c1',
  name: 'Chez Albert',
  freelancer: 'Senna',
  contract_end: '2026-11-30',
  contract_indefinite: false,
  monthly_fee: null,
  boosting_budget: 200,
  freelancer_cost: null,
  contract_start: null,
  created_by: null,
  created_at: '',
  updated_at: '',
} as unknown as Client

const out = {
  gevonden: true,
  contract: { id: 'd1', naam: 'Contract_Chez_Albert_x_IKnowRight.pdf' },
  maandbedrag: 1500,
  boosting: 200,
  freelancer: 'Celia',
  freelancer_kost: 500,
  contract_start: null,
  contract_tot: null,
  onbepaald: false,
  uitleg: '€ 1.300 + € 200 boosting.',
}

describe('contract zoeken in de Drive', () => {
  it('zoekt op naam (ook zonder leestekens) en banknaam, enkel contractachtige bestanden', () => {
    expect(searchNames({ name: 'Oh!Ma', bank_name: 'V.S.A. Foods' })).toEqual(['Oh!Ma', 'OhMa', 'V.S.A. Foods'])
    const q = contractQuery(["Chez Albert's"])
    expect(q).toContain("fullText contains 'Chez Albert\\'s'")
    expect(q).toContain("name contains 'overeenkomst'")
    expect(q).toContain('trashed = false')
  })
})

describe('voorstel uit het contract', () => {
  it('neemt enkel gevonden velden over en laat een bestaande freelancer staan', () => {
    expect(proposalPatch(albert, out)).toEqual({ monthly_fee: 1500, boosting_budget: 200, freelancer_cost: 500 })
  })
  it('onbepaalde duur wist de einddatum', () => {
    expect(proposalPatch(albert, { ...out, onbepaald: true })).toMatchObject({ contract_indefinite: true, contract_end: null })
  })
  it('toont enkel wat verandert, met de link van het gebruikte contract', () => {
    const job = { status: 'done', error: null, output: out, input: { docs: [{ id: 'd1', naam: 'Contract', link: 'https://drive/x', gewijzigd: '', tekst: '' }] } } as unknown as AiJob
    const p = describeProposal(albert, job)!
    expect(p.changes.map((c) => c.field)).toEqual(['monthly_fee', 'freelancer_cost'])
    expect(p.contractLink).toBe('https://drive/x')
  })
  it('wachtende taak: geen wijzigingen, wel de documenten', () => {
    const p = describeProposal(albert, { status: 'pending', error: null, output: null, input: { docs: [] } } as unknown as AiJob)!
    expect(p).toMatchObject({ status: 'pending', changes: [], output: null })
  })
})
