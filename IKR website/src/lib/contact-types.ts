export type ContactType = 'bedrijf' | 'creator' | 'solliciteren'

export type MessageTopic = 'offerte' | 'gesprek' | 'vraag' | 'anders'

export type ContactRequestPayload = {
  voornaam: string
  achternaam: string
  email: string
  telefoon: string
  contactType: ContactType
  bedrijf?: string
  messageTopic: MessageTopic
  bericht?: string
  gdprConsent: boolean
  turnstileToken: string
  website?: string
}

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  bedrijf: 'Ik werk voor een bedrijf.',
  creator: 'Ik ben creator.',
  solliciteren: 'Ik wil solliciteren.',
}

export const MESSAGE_TOPIC_LABELS: Record<MessageTopic, string> = {
  offerte: 'Ik wil graag een offerte.',
  gesprek: 'Ik wil een gesprek plannen.',
  vraag: 'Ik heb een concrete vraag.',
  anders: 'Anders',
}
