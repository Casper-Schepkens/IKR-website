import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseDetailPageContent } from '@/components/ikr/CaseDetailPageContent'
import { Navbar } from '@/components/ikr/Navbar'
import { SiteFooter } from '@/components/ikr/SiteFooter'
import { caseDetails, caseDetailSlugs } from '@/data/cases'
import { pageMetadata } from '@/lib/site'

type Props = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return caseDetailSlugs.filter((slug) => slug !== 'tempus').map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = caseDetails[slug]
  if (!data) return {}

  return pageMetadata(
    data.bedrijf,
    data.outcomeLine ?? `Case study: hoe IKnowRight ${data.bedrijf} hielp met TikTok-content.`,
    `/cases/${slug}`,
  )
}

export default async function CaseDetailPage({ params }: Props) {
  const { slug } = await params
  const data = caseDetails[slug]
  if (!data) notFound()

  return (
    <main style={{ backgroundColor: 'var(--ikr-cream)' }}>
      <Navbar />
      <CaseDetailPageContent data={data} />
      <SiteFooter />
    </main>
  )
}
