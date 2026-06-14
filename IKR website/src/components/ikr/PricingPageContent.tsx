'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { bodyFont, displayFont, ikr } from '@/lib/ikr-styles'
import {
  CONTACT_REDIRECT,
  SUBMIT_LABELS,
  type PricingRole,
} from '@/lib/pricing-types'
import { TurnstileWidget } from './TurnstileWidget'

const TAN = '#C5B094'
const INPUT_BORDER = '#D9D4CB'

const roleOptions: { id: PricingRole; title: string; subtitle: string }[] = [
  {
    id: 'bedrijf',
    title: 'Ik werk voor een bedrijf.',
    subtitle: 'Voor zelfstandigen, marketeers, ...',
  },
  {
    id: 'creator',
    title: 'Ik ben creator.',
    subtitle: 'Voor content creators, influencers, ...',
  },
  {
    id: 'solliciteren',
    title: 'Ik wil solliciteren.',
    subtitle: 'Voor als je op zoek bent naar werk als freelancer',
  },
]

function RadioIcon({ selected }: { selected: boolean }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: '2px solid #FFF9F1',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      {selected && (
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#FFF9F1',
          }}
        />
      )}
    </span>
  )
}

function FormField({
  label,
  name,
  type = 'text',
  withAtIcon = false,
  value,
  onChange,
  required,
}: {
  label: string
  name: string
  type?: string
  withAtIcon?: boolean
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label style={{ display: 'block' }}>
      <span
        style={{
          ...bodyFont,
          display: 'block',
          fontSize: 'clamp(0.75rem, 1.11vw, 16px)',
          color: ikr.navyText,
          marginBottom: 8,
        }}
      >
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        {withAtIcon && (
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: ikr.navy,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ color: '#FFF9F1', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>@</span>
          </span>
        )}
        <input
          type={type}
          name={name}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...bodyFont,
            width: '100%',
            height: 'clamp(44px, 3.33vw, 48px)',
            borderRadius: 16,
            border: `1px solid ${INPUT_BORDER}`,
            backgroundColor: '#FFFFFF',
            padding: withAtIcon ? '0 16px 0 52px' : '0 16px',
            fontSize: 'clamp(0.875rem, 1.25vw, 18px)',
            color: ikr.navyText,
            outline: 'none',
          }}
        />
      </div>
    </label>
  )
}

function SubmitIcon({ redirect }: { redirect: boolean }) {
  if (redirect) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12h14M13 6l6 6-6 6"
          stroke="#FFF9F1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z"
        stroke="#FFF9F1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PricingFormSection() {
  const router = useRouter()
  const [role, setRole] = useState<PricingRole>('bedrijf')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const isRedirectRole = role === 'creator' || role === 'solliciteren'
  const submitLabel = SUBMIT_LABELS[role]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    if (website) return

    if (isRedirectRole) {
      router.push(CONTACT_REDIRECT[role]!)
      return
    }

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

    setStatus('loading')

    try {
      const response = await fetch('/api/pricing/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          role,
          gdprConsent,
          turnstileToken: token,
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

  if (status === 'success') {
    return (
      <section style={{ backgroundColor: ikr.cream, paddingTop: 80 }}>
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            padding: 'clamp(2.5rem, 8vw, 120px) clamp(1rem, 6.8vw, 98px)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              ...displayFont,
              fontSize: 'clamp(2rem, 5.56vw, 80px)',
              lineHeight: '95%',
              textTransform: 'uppercase',
              color: ikr.navy,
              marginBottom: 'clamp(1rem, 2vw, 24px)',
            }}
          >
            CHECK JE INBOX
          </h1>
          <p
            style={{
              ...bodyFont,
              fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
              color: ikr.navyText,
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            We hebben onze tarieven naar <strong>{email}</strong> gestuurd. Niet gevonden? Kijk in je spamfolder.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section style={{ backgroundColor: ikr.cream, paddingTop: 80 }}>
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: 'clamp(2.5rem, 8vw, 120px) clamp(1rem, 6.8vw, 98px) clamp(2rem, 5vw, 80px)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 4vw, 56px)' }}>
          <h1
            style={{
              ...displayFont,
              fontSize: 'clamp(2rem, 5.56vw, 80px)',
              lineHeight: '95%',
              textTransform: 'uppercase',
              color: ikr.navy,
              marginBottom: 'clamp(1rem, 2vw, 24px)',
            }}
          >
            VRAAG ONZE
            <br />
            TARIEVEN AAN
          </h1>
          <p
            style={{
              ...bodyFont,
              fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
              color: ikr.navyText,
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            Laat je gegevens achter en ontvang onze prijzen vrijblijvend in je inbox. We stemmen alles af op
            jouw merk en doelen.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 980,
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            borderRadius: 30,
            padding: 'clamp(1.5rem, 3vw, 40px)',
            boxShadow: '0 8px 40px rgba(32,23,55,0.08)',
          }}
        >
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

          <div
            className="grid grid-cols-1 sm:grid-cols-2"
            style={{ gap: 'clamp(1rem, 2vw, 24px)', marginBottom: 'clamp(1.25rem, 2.5vw, 32px)' }}
          >
            <FormField
              label="Voornaam"
              name="firstName"
              value={firstName}
              onChange={setFirstName}
              required={!isRedirectRole}
            />
            <FormField
              label="Achternaam"
              name="lastName"
              value={lastName}
              onChange={setLastName}
              required={!isRedirectRole}
            />
            <FormField
              label="E-mail"
              name="email"
              type="email"
              withAtIcon
              value={email}
              onChange={setEmail}
              required={!isRedirectRole}
            />
            <FormField
              label="Telefoon"
              name="phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              required={!isRedirectRole}
            />
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3"
            style={{ gap: 'clamp(0.75rem, 1.5vw, 16px)', marginBottom: 'clamp(1.5rem, 3vw, 40px)' }}
          >
            {roleOptions.map((option) => {
              const selected = role === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setRole(option.id)
                    setErrorMessage('')
                    setStatus('idle')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: 20,
                    padding: 'clamp(14px, 1.5vw, 20px)',
                    cursor: 'pointer',
                    backgroundColor: selected ? ikr.navy : TAN,
                    color: '#FFF9F1',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <RadioIcon selected={selected} />
                  <span>
                    <span
                      style={{
                        ...displayFont,
                        display: 'block',
                        fontSize: 'clamp(0.8rem, 1.11vw, 16px)',
                        lineHeight: 1.2,
                        marginBottom: 4,
                      }}
                    >
                      {option.title}
                    </span>
                    <span
                      style={{
                        ...bodyFont,
                        display: 'block',
                        fontSize: 'clamp(0.7rem, 0.97vw, 14px)',
                        lineHeight: 1.35,
                        opacity: 0.92,
                      }}
                    >
                      {option.subtitle}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {role === 'bedrijf' && (
            <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 32px)' }}>
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
                  required
                  style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0 }}
                />
                <span style={{ ...bodyFont, fontSize: 'clamp(0.8rem, 1.11vw, 16px)', color: ikr.navyText }}>
                  Ik ga akkoord met het{' '}
                  <Link href="/privacy" style={{ color: ikr.navy, fontWeight: 700 }}>
                    privacybeleid
                  </Link>
                  . Mijn gegevens worden gebruikt om de tarieven-PDF te mailen en IKnowRight mag contact opnemen.
                </span>
              </label>
            </div>
          )}

          {role === 'bedrijf' && (
            <div style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 32px)' }}>
              <TurnstileWidget
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
              />
            </div>
          )}

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
              type="submit"
              disabled={status === 'loading'}
              style={{
                ...displayFont,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                border: 'none',
                borderRadius: 48,
                padding: '0.55em 0.55em 0.55em 1.4em',
                backgroundColor: ikr.cyan,
                color: '#FFF9F1',
                fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
                textTransform: 'uppercase',
                cursor: status === 'loading' ? 'wait' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {status === 'loading' ? 'VERSTUREN...' : submitLabel}
              <span
                style={{
                  width: 'clamp(36px, 2.78vw, 40px)',
                  height: 'clamp(36px, 2.78vw, 40px)',
                  borderRadius: '50%',
                  backgroundColor: ikr.navy,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SubmitIcon redirect={isRedirectRole} />
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function PricingCTASection() {
  return (
    <section
      style={{
        backgroundColor: ikr.cream,
        padding: '0 clamp(1rem, 6.8vw, 98px) clamp(3rem, 6vw, 80px)',
      }}
    >
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        <div
          className="flex flex-col md:flex-row items-stretch gap-0"
          style={{
            backgroundColor: TAN,
            borderRadius: 30,
            overflow: 'hidden',
            minHeight: 'clamp(280px, 32vw, 460px)',
          }}
        >
          <div
            style={{
              flex: '1 1 55%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: 'clamp(2rem, 5vw, 72px) clamp(1.5rem, 4vw, 56px)',
              gap: 'clamp(1.25rem, 2.5vw, 32px)',
            }}
          >
            <h2
              style={{
                ...displayFont,
                fontSize: 'clamp(1.5rem, 3.33vw, 48px)',
                lineHeight: 1.1,
                textTransform: 'uppercase',
                color: ikr.navy,
                maxWidth: 520,
              }}
            >
              KLAAR OM JE SOCIALE MEDIA WAT EXTRA LIEFDE TE GEVEN?
            </h2>
            <Link
              href="/contact"
              style={{
                ...displayFont,
                display: 'inline-flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
                fontSize: 'clamp(0.875rem, 1.67vw, 24px)',
                color: '#FFF9F1',
                backgroundColor: ikr.navy,
                borderRadius: 48,
                padding: '0.55em 1.4em',
                textDecoration: 'none',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Plan een call
            </Link>
          </div>

          <div
            style={{
              flex: '0 0 clamp(240px, 38%, 420px)',
              position: 'relative',
              minHeight: 'clamp(220px, 28vw, 460px)',
            }}
          >
            <Image
              src="/images/freelancer-cta.jpg"
              alt=""
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 420px"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export function PricingPageContent() {
  return (
    <>
      <PricingFormSection />
      <PricingCTASection />
    </>
  )
}
