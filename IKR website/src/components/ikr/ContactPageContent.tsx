'use client'

import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ContactType, MessageTopic } from '@/lib/contact-types'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'
import { TurnstileWidget } from './TurnstileWidget'

const contactTypes: { id: ContactType; title: string; subtitle: string }[] = [
  {
    id: 'bedrijf',
    title: 'Ik werk voor een bedrijf.',
    subtitle: 'voor zelfstandigen, marketeers, ...',
  },
  {
    id: 'creator',
    title: 'Ik ben creator.',
    subtitle: 'voor content creators, influencers, ...',
  },
  {
    id: 'solliciteren',
    title: 'Ik wil solliciteren.',
    subtitle: 'voor als je op zoek bent naar werk als freelancer',
  },
]

const messageTopics: { id: MessageTopic; title: string; subtitle: string }[] = [
  {
    id: 'offerte',
    title: 'Ik wil graag een offerte.',
    subtitle: 'prijsindicatie of pakket op maat',
  },
  {
    id: 'gesprek',
    title: 'Ik wil een gesprek plannen.',
    subtitle: 'kennismaking of intake',
  },
  {
    id: 'vraag',
    title: 'Ik heb een concrete vraag.',
    subtitle: 'over diensten, cases of samenwerking',
  },
  {
    id: 'anders',
    title: 'Anders.',
    subtitle: 'typ zelf je bericht hieronder',
  },
]

type FormData = {
  voornaam: string
  achternaam: string
  email: string
  telefoon: string
  contactType: ContactType | null
  bedrijf: string
  messageTopic: MessageTopic | null
  bericht: string
}

const emptyForm: FormData = {
  voornaam: '',
  achternaam: '',
  email: '',
  telefoon: '',
  contactType: null,
  bedrijf: '',
  messageTopic: null,
  bericht: '',
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function ChatStep({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  if (!visible) return null
  return (
    <div
      style={{
        animation: 'contact-step-in 0.35s ease forwards',
      }}
    >
      {children}
    </div>
  )
}

const CHAT_ANSWER_INDENT = 'clamp(2.5rem, 5vw, 72px)'

function QuestionBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 'clamp(12px, 1.4vw, 20px)',
        width: 'fit-content',
        maxWidth: '85%',
      }}
    >
      <div
        style={{
          backgroundColor: '#FEFEFE',
          borderRadius: 20,
          padding: 'clamp(12px, 1.4vw, 20px) clamp(16px, 1.9vw, 28px)',
        }}
      >
        <p
          style={{
            ...bodyFont,
            fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
            color: ikr.navyText,
            margin: 0,
          }}
        >
          {children}
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -18,
          left: 'clamp(16px, 2vw, 28px)',
          width: 40,
          height: 20,
          backgroundColor: '#FEFEFE',
          clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
        }}
      />
    </div>
  )
}

function AnswerCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        marginLeft: CHAT_ANSWER_INDENT,
        marginBottom: 'clamp(28px, 3.5vw, 52px)',
        width: `calc(100% - ${CHAT_ANSWER_INDENT})`,
      }}
    >
      <div
        style={{
          backgroundColor: '#FEFEFE',
          borderRadius: 30,
          padding: 'clamp(20px, 2.5vw, 36px)',
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -18,
          right: 'clamp(20px, 2.5vw, 36px)',
          width: 40,
          height: 20,
          backgroundColor: '#FEFEFE',
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%)',
        }}
      />
    </div>
  )
}

function FormInput({
  placeholder,
  type = 'text',
  multiline = false,
  value,
  onChange,
}: {
  placeholder: string
  type?: string
  multiline?: boolean
  value: string
  onChange: (value: string) => void
}) {
  const fieldStyle: React.CSSProperties = {
    ...bodyFont,
    width: '100%',
    fontSize: 'clamp(0.875rem, 1.39vw, 20px)',
    color: ikr.navyText,
    backgroundColor: '#E8E3D9',
    border: 'none',
    borderRadius: 16,
    padding: 'clamp(14px, 1.6vw, 22px) clamp(16px, 1.9vw, 28px)',
    outline: 'none',
    resize: 'none' as const,
  }

  if (multiline) {
    return (
      <textarea
        placeholder={placeholder}
        rows={5}
        style={fieldStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  return (
    <input
      type={type}
      placeholder={placeholder}
      style={fieldStyle}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function RadioCard({
  title,
  subtitle,
  selected,
  onSelect,
}: {
  title: string
  subtitle: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
        borderRadius: 20,
        padding: 'clamp(16px, 1.9vw, 28px) clamp(14px, 1.6vw, 24px)',
        backgroundColor: selected ? ikr.navy : '#8B849E',
        transition: 'background-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '2px solid #FEFEFE',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          {selected && (
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#FEFEFE',
              }}
            />
          )}
        </span>
        <span
          style={{
            ...bodyFont,
            fontWeight: 700,
            fontSize: 'clamp(0.8rem, 1.25vw, 18px)',
            color: '#FEFEFE',
            lineHeight: 1.3,
          }}
        >
          {title}
        </span>
      </div>
      <p
        style={{
          ...bodyFont,
          fontSize: 'clamp(0.7rem, 1.05vw, 15px)',
          color: 'rgba(254,254,254,0.85)',
          margin: 0,
          paddingLeft: 34,
        }}
      >
        {subtitle}
      </p>
    </button>
  )
}

function ContactInfoCard() {
  return (
    <div
      style={{
        backgroundColor: ikr.cyan,
        borderRadius: 30,
        padding: 'clamp(24px, 2.8vw, 40px) clamp(20px, 2.5vw, 36px)',
        marginBottom: 'clamp(20px, 2.5vw, 36px)',
      }}
    >
      <h2
        style={{
          ...displayFont,
          fontSize: 'clamp(1rem, 2.22vw, 32px)',
          lineHeight: 1.15,
          textTransform: 'uppercase',
          color: ikr.navy,
          marginBottom: 'clamp(20px, 2.5vw, 36px)',
        }}
      >
        STUUR EEN MAIL, BEL OF VUL ONS FORMULIER IN
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2vw, 28px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: ikr.navy,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
              <rect x="0.5" y="0.5" width="19" height="15" rx="2.5" stroke="#FFF9F1" />
              <path d="M1 1l9 8 9-8" stroke="#FFF9F1" strokeWidth="1.5" />
            </svg>
          </div>
          <span
            style={{
              ...displayFont,
              fontSize: 'clamp(0.75rem, 1.39vw, 20px)',
              color: '#FEFEFE',
              textTransform: 'uppercase',
            }}
          >
            CONTACT@IKNOWRIGHT.BE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: ikr.navy,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
                fill="#FFF9F1"
              />
            </svg>
          </div>
          <span
            style={{
              ...displayFont,
              fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
              color: '#FEFEFE',
            }}
          >
            04 71 49 75 12
          </span>
        </div>
      </div>
    </div>
  )
}

export function ContactPageContent() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState<FormData>(emptyForm)
  const [gdprConsent, setGdprConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'bedrijf' || type === 'creator' || type === 'solliciteren') {
      setForm((prev) => ({ ...prev, contactType: type }))
    }
  }, [searchParams])

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const personalComplete =
    form.voornaam.trim().length > 0 &&
    form.achternaam.trim().length > 0 &&
    isValidEmail(form.email) &&
    form.telefoon.trim().length > 0

  const typeComplete = form.contactType !== null

  const showCompanyStep = form.contactType === 'bedrijf'
  const companyComplete = !showCompanyStep || form.bedrijf.trim().length > 0

  const messageComplete =
    form.messageTopic !== null &&
    (form.messageTopic !== 'anders' || form.bericht.trim().length > 0)

  const showTypeStep = personalComplete
  const showCompanyQuestion = showTypeStep && typeComplete && showCompanyStep
  const showMessageStep = showTypeStep && typeComplete && companyComplete
  const showSubmit = showMessageStep && messageComplete

  async function handleSubmit() {
    setErrorMessage('')

    if (website) return

    if (!gdprConsent) {
      setStatus('error')
      setErrorMessage('Je moet akkoord gaan met het privacybeleid.')
      return
    }

    const hasTurnstileKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
    const token = hasTurnstileKey ? turnstileToken : 'dev-bypass'

    if (hasTurnstileKey && !turnstileToken) {
      setStatus('error')
      setErrorMessage('Bevestig dat je geen robot bent.')
      return
    }

    if (!form.contactType || !form.messageTopic) return

    setStatus('loading')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voornaam: form.voornaam,
          achternaam: form.achternaam,
          email: form.email,
          telefoon: form.telefoon,
          contactType: form.contactType,
          bedrijf: form.bedrijf || undefined,
          messageTopic: form.messageTopic,
          bericht: form.bericht || undefined,
          gdprConsent,
          turnstileToken: token,
          website,
        }),
      })

      const data = (await response.json()) as { error?: string; success?: boolean }

      if (!response.ok) {
        setStatus('error')
        setErrorMessage(data.error ?? 'Verzenden mislukt.')
        return
      }

      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMessage('Verzenden mislukt. Controleer je verbinding en probeer opnieuw.')
    }
  }

  return (
    <section style={{ backgroundColor: ikr.cream, paddingTop: 80 }}>
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: 'clamp(2rem, 6.8vw, 98px) clamp(1rem, 6.8vw, 98px) clamp(3rem, 8vw, 120px)',
        }}
      >
        <div
          className="flex flex-col md:flex-row items-start"
          style={{ gap: 'clamp(3rem, 8vw, 120px)' }}
        >
          {/* Left column — titel + contactkaart + foto */}
          <div style={{ width: '100%', maxWidth: 380, flexShrink: 0 }}>
            <div style={{ marginBottom: 'clamp(2rem, 4vw, 56px)' }}>
              <h1
                style={{
                  ...displayFont,
                  fontSize: 'clamp(2rem, 5.56vw, 80px)',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: ikr.cyan,
                  marginBottom: '0.15em',
                }}
              >
                OVERTUIGD?
              </h1>
              <p
                style={{
                  ...displayFont,
                  fontSize: 'clamp(2rem, 5.56vw, 80px)',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: ikr.navy,
                  margin: 0,
                }}
              >
                LATEN WE CONNECTEN!
              </p>
            </div>

            <ContactInfoCard />
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '380 / 410',
                borderRadius: 30,
                overflow: 'hidden',
              }}
            >
              <Image
                src="/images/contact-team.jpg"
                alt="Het IKnowRight team"
                fill
                style={{ objectFit: 'cover' }}
                sizes="380px"
                priority
              />
            </div>
          </div>

          {/* Right column — form, start naast titel */}
          <div
            className="md:pt-20"
            style={{
              flex: 1,
              minWidth: 0,
              width: '100%',
            }}
          >
            {status === 'success' ? (
              <>
                <QuestionBubble>Got it! We hebben je bericht ontvangen.</QuestionBubble>
                <AnswerCard>
                  <p
                    style={{
                      ...bodyFont,
                      fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
                      color: ikr.navyText,
                      margin: 0,
                    }}
                  >
                    Bedankt {form.voornaam}! We nemen zo snel mogelijk contact met je op via{' '}
                    <strong>{form.email}</strong>.
                  </p>
                </AnswerCard>
              </>
            ) : (
              <>
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
            />
            <QuestionBubble>Hi stranger, wie ben je?</QuestionBubble>
            <AnswerCard>
              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{ gap: 'clamp(12px, 1.4vw, 20px)' }}
              >
                <FormInput
                  placeholder="Uw voornaam"
                  value={form.voornaam}
                  onChange={(v) => setField('voornaam', v)}
                />
                <FormInput
                  placeholder="Uw achternaam"
                  value={form.achternaam}
                  onChange={(v) => setField('achternaam', v)}
                />
                <FormInput
                  placeholder="Uw e-mail"
                  type="email"
                  value={form.email}
                  onChange={(v) => setField('email', v)}
                />
                <FormInput
                  placeholder="Uw telefoonnummer"
                  type="tel"
                  value={form.telefoon}
                  onChange={(v) => setField('telefoon', v)}
                />
              </div>
            </AnswerCard>

            <ChatStep visible={showTypeStep}>
              <QuestionBubble>Wat beschrijft u het best?</QuestionBubble>
              <AnswerCard>
                <div
                  className="flex flex-col md:flex-row"
                  style={{ gap: 'clamp(10px, 1.2vw, 16px)' }}
                >
                  {contactTypes.map((type) => (
                    <RadioCard
                      key={type.id}
                      title={type.title}
                      subtitle={type.subtitle}
                      selected={form.contactType === type.id}
                      onSelect={() => setField('contactType', type.id)}
                    />
                  ))}
                </div>
              </AnswerCard>
            </ChatStep>

            <ChatStep visible={showCompanyQuestion}>
              <QuestionBubble>Bij welk bedrijf werkt u?</QuestionBubble>
              <AnswerCard>
                <FormInput
                  placeholder="Uw bedrijf"
                  value={form.bedrijf}
                  onChange={(v) => setField('bedrijf', v)}
                />
              </AnswerCard>
            </ChatStep>

            <ChatStep visible={showMessageStep}>
              <QuestionBubble>Wat wil je vertellen?</QuestionBubble>
              <AnswerCard>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2"
                  style={{ gap: 'clamp(10px, 1.2vw, 16px)' }}
                >
                  {messageTopics.map((topic) => (
                    <RadioCard
                      key={topic.id}
                      title={topic.title}
                      subtitle={topic.subtitle}
                      selected={form.messageTopic === topic.id}
                      onSelect={() => {
                        setForm((prev) => ({
                          ...prev,
                          messageTopic: topic.id,
                          bericht: topic.id === 'anders' ? prev.bericht : '',
                        }))
                      }}
                    />
                  ))}
                </div>
                {form.messageTopic === 'anders' && (
                  <div style={{ marginTop: 'clamp(12px, 1.4vw, 20px)' }}>
                    <FormInput
                      placeholder="Uw bericht"
                      multiline
                      value={form.bericht}
                      onChange={(v) => setField('bericht', v)}
                    />
                  </div>
                )}
              </AnswerCard>
            </ChatStep>

            <ChatStep visible={showSubmit}>
              <div style={{ marginBottom: 'clamp(1rem, 2vw, 24px)' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={gdprConsent}
                    onChange={(e) => setGdprConsent(e.target.checked)}
                    style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0 }}
                  />
                  <span style={{ ...bodyFont, fontSize: 'clamp(0.8rem, 1.11vw, 16px)', color: ikr.navyText }}>
                    Ik ga akkoord met het{' '}
                    <Link href="/privacy" style={{ color: ikr.navy, fontWeight: 700 }}>
                      privacybeleid
                    </Link>
                    . IKnowRight mag contact met me opnemen.
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: 'clamp(1rem, 2vw, 24px)' }}>
                <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
              </div>

              {status === 'error' && errorMessage && (
                <p
                  role="alert"
                  style={{
                    ...bodyFont,
                    fontSize: 'clamp(0.8rem, 1.11vw, 16px)',
                    color: '#B42318',
                    marginBottom: 16,
                  }}
                >
                  {errorMessage}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === 'loading'}
                  style={{
                    ...displayFont,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 14,
                    fontSize: 'clamp(1rem, 2.22vw, 32px)',
                    color: '#FEFEFE',
                    backgroundColor: ikr.navy,
                    border: 'none',
                    borderRadius: 48,
                    padding: '0.4em 0.35em 0.4em 1.2em',
                    cursor: status === 'loading' ? 'wait' : 'pointer',
                    opacity: status === 'loading' ? 0.7 : 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {status === 'loading' ? 'VERSTUREN...' : 'SEND DM'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                      stroke="#FEFEFE"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </ChatStep>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
