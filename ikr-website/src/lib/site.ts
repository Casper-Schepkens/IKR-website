import type { Metadata } from 'next'
import { IKR_EMAIL, IKR_PHONE, SOCIAL_LINKS } from '@/data/site-contact'

export const SITE_URL = 'https://iknowright.be'
export const SITE_NAME = 'IKnowRight'
export const SITE_TITLE = 'IKnowRight: dé TikTok agency voor food brands in Vlaanderen'
export const SITE_DESCRIPTION =
  'Wij maken scroll-stoppende content voor food brands die gezien en onthouden willen worden.'

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = path === '/' ? SITE_URL : `${SITE_URL}${path}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      url,
    },
    twitter: {
      title: `${title} — ${SITE_NAME}`,
      description,
    },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        legalName: SITE_NAME,
        url: SITE_URL,
        email: IKR_EMAIL,
        telephone: IKR_PHONE,
        description: SITE_DESCRIPTION,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Vondelstraat 65',
          addressLocality: 'Lebbeke',
          postalCode: '9280',
          addressCountry: 'BE',
        },
        vatID: 'BE1014.718.978',
        areaServed: { '@type': 'Country', name: 'Belgium' },
        sameAs: [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.instagram],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: 'nl-BE',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  }
}
