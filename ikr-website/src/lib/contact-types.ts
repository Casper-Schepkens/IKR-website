export type ContactType = 'bedrijf' | 'creator' | 'solliciteren'

export type BedrijfTopic = 'offerte' | 'gesprek' | 'vraag' | 'anders'
export type CreatorTopic = 'samenwerking' | 'portfolio' | 'creator_vraag' | 'anders'
export type SolliciterenTopic = 'freelancer' | 'portfolio_sollicitatie' | 'spontaan' | 'anders'

export type MessageTopic = BedrijfTopic | CreatorTopic | SolliciterenTopic

export type MessageTopicOption = {
  id: MessageTopic
  title: string
  subtitle: string
}

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
  samenwerking: 'Ik wil samenwerken als creator/influencer.',
  portfolio: 'Ik wil mijn portfolio of voorstel delen.',
  creator_vraag: 'Ik heb een concrete vraag.',
  freelancer: 'Ik solliciteer als content creator (videomaker/editor).',
  portfolio_sollicitatie: 'Ik stuur mijn portfolio door.',
  spontaan: 'Spontane sollicitatie — ik denk dat ik kan bijdragen.',
  anders: 'Anders',
}

const BEDRIJF_TOPICS: BedrijfTopic[] = ['offerte', 'gesprek', 'vraag', 'anders']
const CREATOR_TOPICS: CreatorTopic[] = ['samenwerking', 'portfolio', 'creator_vraag', 'anders']
const SOLLICITEREN_TOPICS: SolliciterenTopic[] = [
  'freelancer',
  'portfolio_sollicitatie',
  'spontaan',
  'anders',
]

export const MESSAGE_TOPICS_BY_TYPE: Record<ContactType, MessageTopic[]> = {
  bedrijf: BEDRIJF_TOPICS,
  creator: CREATOR_TOPICS,
  solliciteren: SOLLICITEREN_TOPICS,
}

export const ALL_MESSAGE_TOPICS: MessageTopic[] = [
  ...BEDRIJF_TOPICS,
  ...CREATOR_TOPICS,
  ...SOLLICITEREN_TOPICS,
]

const MESSAGE_TOPIC_SUBTITLES: Record<MessageTopic, string> = {
  offerte: 'prijsindicatie of pakket op maat',
  gesprek: 'kennismaking of intake',
  vraag: 'over diensten, cases of samenwerking',
  samenwerking: 'content, influencer-opdrachten, food brands',
  portfolio: 'link of bestand in je bericht',
  creator_vraag: 'over samenwerking of creator-programma',
  freelancer: 'shooten, monteren of content bedenken',
  portfolio_sollicitatie: 'showreel of eerdere projecten',
  spontaan: 'wie je bent en wat je toevoegt',
  anders: 'typ zelf je bericht hieronder',
}

export function getMessageTopicsForType(contactType: ContactType): MessageTopicOption[] {
  return MESSAGE_TOPICS_BY_TYPE[contactType].map((id) => ({
    id,
    title: MESSAGE_TOPIC_LABELS[id],
    subtitle: MESSAGE_TOPIC_SUBTITLES[id],
  }))
}

export function isValidMessageTopicForType(
  contactType: ContactType,
  topic: MessageTopic,
): boolean {
  return (MESSAGE_TOPICS_BY_TYPE[contactType] as MessageTopic[]).includes(topic)
}

export function getContactEmailSubject(
  contactType: ContactType,
  messageTopic: MessageTopic,
  fullName: string,
): string {
  const typeShort =
    contactType === 'bedrijf'
      ? 'Bedrijf'
      : contactType === 'creator'
        ? 'Creator'
        : 'Sollicitatie'
  return `[${typeShort}] ${MESSAGE_TOPIC_LABELS[messageTopic]} — ${fullName}`
}
