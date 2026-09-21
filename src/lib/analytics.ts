import { track } from '@vercel/analytics'

/** Stable CTA identifiers for dual-CTA ratio reporting. */
export type CtaId = 'plan_call' | 'request_pricing'

/** Lead form identifiers (no PII). */
export type FormId = 'contact' | 'pricing'

/** Placement strings used in event props (snake_case). */
export type CtaPlacement = 'home_bottom' | 'pricing_page' | 'nav' | 'footer' | 'case_detail'

export function trackCtaClick(cta: CtaId, placement: CtaPlacement | string) {
  track('cta_click', { cta, placement })
}

export function trackCtaSectionView(placement: CtaPlacement | string) {
  track('cta_section_view', { placement })
}

export function trackFormStart(form: FormId) {
  track('form_start', { form })
}

export function trackFormSubmitSuccess(form: FormId, type?: string) {
  if (type) {
    track('form_submit_success', { form, type })
  } else {
    track('form_submit_success', { form })
  }
}

export function trackNavClick(target: string) {
  track('nav_click', { target })
}
