import type { Stage } from '@/lib/admin/types'
import type { Tone } from './ui'

export const STAGE_TONE: Record<Stage, Tone> = {
  lead: 'green',
  sales_call: 'purple',
  ideas: 'teal',
  proposal: 'yellow',
  signed: 'navy',
  shoot_planned: 'cyan',
  editing: 'teal',
  live: 'navy',
  churned: 'neutral',
}
