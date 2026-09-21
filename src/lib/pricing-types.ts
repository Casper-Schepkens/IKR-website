export type PricingRole = 'bedrijf' | 'creator' | 'solliciteren'

export type PricingRequestPayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: PricingRole
  gdprConsent: boolean
  turnstileToken: string
  website?: string
}

export const SUBMIT_LABELS: Record<PricingRole, string> = {
  bedrijf: 'VRAAG PRIJS AAN',
  creator: 'GA NAAR CREATOR PAGINA',
  solliciteren: 'GA NAAR SOLLICITATIE',
}

export const CONTACT_REDIRECT: Partial<Record<PricingRole, string>> = {
  creator: '/contact?type=creator',
  solliciteren: '/contact?type=solliciteren',
}
