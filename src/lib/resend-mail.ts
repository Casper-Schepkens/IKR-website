export function getResendFrom(): string | undefined {
  return process.env.RESEND_FROM_EMAIL
}

/** Interne form-notificaties. Niet contact@ — self-send naar Google Workspace bounced. */
export function getResendNotifyFrom(): string {
  return process.env.RESEND_NOTIFY_FROM_EMAIL ?? 'IKnowRight <forms@iknowright.be>'
}

export function getNotifyEmail(): string {
  return process.env.IKR_NOTIFY_EMAIL ?? 'contact@iknowright.be'
}
