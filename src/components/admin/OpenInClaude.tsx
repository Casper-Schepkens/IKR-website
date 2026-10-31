'use client'

import { useState, type ReactNode } from 'react'
import { claudeUrl } from '@/lib/admin/claude-prompts'
import { buttonClass, Icon } from './ui'

/**
 * Opent Claude in een nieuw tabblad met de vraag al ingevuld, en zet de vraag ook op het klembord
 * (voor het geval het invullen niet lukt). Claude doet het werk via de IKR Admin-connector.
 */
export function OpenInClaude({
  prompt,
  children,
  variant = 'soft',
  small = true,
  className,
}: {
  prompt: string
  children: ReactNode
  variant?: 'cyan' | 'navy' | 'soft' | 'light' | 'ghostDark'
  small?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <a
        href={claudeUrl(prompt)}
        target="_blank"
        rel="noreferrer"
        title="Opent Claude met deze vraag (ook gekopieerd naar je klembord)"
        className={buttonClass(variant, small, className)}
        onClick={() => {
          navigator.clipboard?.writeText(prompt).catch(() => {})
          setCopied(true)
          setTimeout(() => setCopied(false), 4000)
        }}
      >
        <Icon.sparkle
          size={14}
          className={variant === 'navy' || variant === 'ghostDark' ? 'text-ikr-cyan' : 'text-[#0B7F93]'}
        />
        {children}
        <span aria-hidden="true" className="text-xs opacity-70">
          ↗
        </span>
      </a>
      {copied && (
        <span role="status" className="text-xs text-[#5E5670]">
          Geopend in Claude · vraag staat ook op je klembord
        </span>
      )}
    </span>
  )
}
