import Script from 'next/script'

const PIXEL_ID = 'Kvx8ZwjdfRmN8cwGsDXioL'

type OaiqFn = (...args: unknown[]) => void

declare global {
  interface Window {
    oaiq?: OaiqFn
  }
}

/**
 * ChatGPT / OpenAI Ads Measurement Pixel.
 * Site-wide init; conversion events via {@link trackOpenAIAdsRegistrationCompleted}.
 * @see https://developers.openai.com/ads/measurement-pixel
 */
export function OpenAIAdsPixel() {
  const debug = process.env.NEXT_PUBLIC_OAIQ_DEBUG === 'true'

  return (
    <Script
      id="openai-ads-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:${JSON.stringify(PIXEL_ID)},debug:${debug ? 'true' : 'false'}});`,
      }}
    />
  )
}

/** Fires after a successful contact form submit. No-ops if the pixel SDK is unavailable. */
export function trackOpenAIAdsRegistrationCompleted() {
  if (typeof window === 'undefined' || typeof window.oaiq !== 'function') return
  window.oaiq('measure', 'registration_completed', { type: 'customer_action' })
}
