'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCredentialAction, deleteCredentialAction, revealCredentialAction, updateCredentialAction } from '@/app/admin/credentials-actions'
import { CREDENTIAL_LIMITS, PLATFORMS, teamName, type ClientCredential } from '@/lib/admin/credentials/types'
import { fmtDate } from '@/lib/admin/format'
import { FormAction } from '../FormAction'
import { buttonClass, input, label, muted, Spinner } from '../ui'
import { cn } from '@/utilities/ui'

const RED = 'bg-adm-red-bg text-adm-red'
const grid = 'grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3'
/** Een getoond wachtwoord verdwijnt vanzelf weer. */
const HIDE_AFTER_MS = 30_000
const MASK = '••••••••••'

/**
 * Sectie "Inloggegevens" op het klantprofiel (enkel Casper, Cédric en Milan krijgen ze te zien). Wachtwoorden
 * zitten niet in de pagina: "Toon" en "Kopieer" halen er telkens één op bij de server.
 */
export function ClientCredentials({ clientId, clientName, credentials }: { clientId: string; clientName: string; credentials: ClientCredential[] }) {
  const [adding, setAdding] = useState(false)
  return (
    <section aria-label={`Inloggegevens van ${clientName}`} className="flex flex-col gap-3 rounded-2xl bg-adm-raised/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 text-sm font-bold">Inloggegevens</p>
        <span className={cn('text-xs', muted)}>Versleuteld bewaard · enkel Casper, Cédric en Milan</span>
      </div>

      {credentials.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {credentials.map((c) => (
            <CredentialItem key={c.id} credential={c} />
          ))}
        </ul>
      ) : (
        !adding && <p className={cn('m-0 text-sm', muted)}>Nog geen logins voor {clientName}.</p>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-xl bg-adm-card p-3">
          <FormAction action={createCredentialAction.bind(null, clientId)} submitLabel="Login bewaren" pendingText="Bewaren…" resetOnSuccess onSuccess={() => setAdding(false)}>
            <CredentialFields />
          </FormAction>
          <button type="button" onClick={() => setAdding(false)} className={cn(buttonClass('soft', true), 'self-start')}>
            Annuleer
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={cn(buttonClass('soft', true), 'self-start')}>
          + Login toevoegen
        </button>
      )}
    </section>
  )
}

function CredentialFields({ credential: c }: { credential?: ClientCredential }) {
  const [visible, setVisible] = useState(false)
  const listId = `platforms-${c?.id ?? 'nieuw'}`
  return (
    <div className={grid}>
      <label className={label}>
        Platform
        <input name="platform" required maxLength={CREDENTIAL_LIMITS.platform} list={listId} placeholder="bv. TikTok" defaultValue={c?.platform ?? ''} className={input} autoComplete="off" />
        <datalist id={listId}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label className={label}>
        Gebruikersnaam / e-mail
        <input name="username" maxLength={CREDENTIAL_LIMITS.username} defaultValue={c?.username ?? ''} className={input} autoComplete="off" />
      </label>
      <label className={label}>
        Wachtwoord
        <span className="flex gap-1.5">
          {/* new-password: de browser mag dit niet als login van het teamlid zelf bewaren of invullen. */}
          <input
            name="password"
            type={visible ? 'text' : 'password'}
            maxLength={CREDENTIAL_LIMITS.password}
            placeholder={c ? (c.has_password ? 'leeg = ongewijzigd' : 'geen wachtwoord bewaard') : ''}
            className={input}
            autoComplete="new-password"
            spellCheck={false}
          />
          <button type="button" onClick={() => setVisible(!visible)} className={buttonClass('soft', true)} aria-pressed={visible}>
            {visible ? 'Verberg' : 'Toon'}
          </button>
        </span>
      </label>
      <label className={label}>
        Notitie
        <input name="note" maxLength={CREDENTIAL_LIMITS.note} placeholder="bv. 2FA via Milans gsm" defaultValue={c?.note ?? ''} className={input} autoComplete="off" />
      </label>
    </div>
  )
}

function CredentialItem({ credential: c }: { credential: ClientCredential }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [password, setPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState<'gebruikersnaam' | 'wachtwoord' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Getoond wachtwoord weer verbergen (na 30 s, bij bewerken en bij het sluiten van het profiel).
  useEffect(() => () => void (hideTimer.current && clearTimeout(hideTimer.current)), [])
  const show = (value: string) => {
    setPassword(value)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setPassword(null), HIDE_AFTER_MS)
  }

  const fetchPassword = async () => {
    const res = await revealCredentialAction(c.id)
    if (!res.ok) {
      setError(res.error)
      return null
    }
    return res.data ?? ''
  }

  const toggle = () => {
    if (password !== null) return setPassword(null)
    start(async () => {
      setError(null)
      const pw = await fetchPassword()
      if (pw !== null) show(pw)
    })
  }

  const copy = (what: 'gebruikersnaam' | 'wachtwoord') =>
    start(async () => {
      setError(null)
      const value = what === 'gebruikersnaam' ? c.username : (password ?? (await fetchPassword()))
      if (value == null) return
      try {
        await navigator.clipboard.writeText(value)
        setCopied(what)
        setTimeout(() => setCopied((x) => (x === what ? null : x)), 2000)
      } catch {
        setError('Kopiëren lukte niet (geen toegang tot het klembord).')
      }
    })

  const remove = () =>
    start(async () => {
      setError(null)
      const res = await deleteCredentialAction(c.id)
      if (!res.ok) return setError(res.error)
      router.refresh()
    })

  const changed = c.updated_at ? fmtDate(c.updated_at, { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const by = teamName(c.updated_by ?? c.created_by)

  if (editing)
    return (
      <li className="flex flex-col gap-2 rounded-xl bg-adm-card p-3">
        <FormAction action={updateCredentialAction.bind(null, c.id)} submitLabel="Bewaar" pendingText="Bewaren…" onSuccess={() => setEditing(false)}>
          <CredentialFields credential={c} />
        </FormAction>
        <button type="button" onClick={() => setEditing(false)} className={cn(buttonClass('soft', true), 'self-start')}>
          Annuleer
        </button>
      </li>
    )

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-adm-card p-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-center gap-x-4 gap-y-2">
        <span className="font-bold">{c.platform}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          {c.username ? (
            <>
              <span className="truncate" title={c.username}>
                {c.username}
              </span>
              <button type="button" onClick={() => copy('gebruikersnaam')} className={cn(buttonClass('soft', true), 'min-h-8 shrink-0 px-2.5 text-xs')} aria-label={`Kopieer gebruikersnaam ${c.platform}`}>
                {copied === 'gebruikersnaam' ? 'Gekopieerd' : 'Kopieer'}
              </button>
            </>
          ) : (
            <span className={muted}>geen gebruikersnaam</span>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {c.has_password ? (
            <>
              <code className="truncate font-mono text-sm" aria-label={password === null ? 'Wachtwoord verborgen' : 'Wachtwoord'}>
                {password ?? MASK}
              </code>
              <button type="button" disabled={pending} onClick={toggle} aria-pressed={password !== null} className={cn(buttonClass('soft', true), 'min-h-8 shrink-0 px-2.5 text-xs')} aria-label={`${password === null ? 'Toon' : 'Verberg'} wachtwoord ${c.platform}`}>
                {password === null ? 'Toon' : 'Verberg'}
              </button>
              <button type="button" disabled={pending} onClick={() => copy('wachtwoord')} className={cn(buttonClass('soft', true), 'min-h-8 shrink-0 px-2.5 text-xs')} aria-label={`Kopieer wachtwoord ${c.platform}`}>
                {copied === 'wachtwoord' ? 'Gekopieerd' : 'Kopieer'}
              </button>
            </>
          ) : (
            <span className={muted}>geen wachtwoord</span>
          )}
        </span>
      </div>
      {c.note && <p className="m-0 text-sm">{c.note}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('mr-auto text-xs', muted)}>
          Laatst gewijzigd{by ? ` door ${by}` : ''}
          {changed ? ` op ${changed}` : ''}
        </span>
        <button
          type="button"
          onClick={() => {
            setPassword(null)
            setEditing(true)
          }}
          className={buttonClass('soft', true)}
        >
          Aanpassen
        </button>
        {confirmDelete ? (
          <span className="inline-flex gap-1.5">
            <button type="button" disabled={pending} onClick={remove} className="ikr-btn inline-flex min-h-9 items-center rounded-full bg-[#B42318] px-3 text-xs font-semibold text-white">
              Ja, verwijder login {c.platform}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass('soft', true)}>
              Annuleer
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={cn('ikr-btn inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold', RED)}>
            Verwijder
          </button>
        )}
        {pending && <Spinner />}
      </div>
      {error && (
        <span role="alert" className="text-xs text-adm-warn">
          {error}
        </span>
      )}
    </li>
  )
}
