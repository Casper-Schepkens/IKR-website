import type { CSSProperties, ReactNode } from 'react'

type Tail = 'left' | 'right'

type Props = {
  tail: Tail
  children: ReactNode
  maxWidth?: number | string
  style?: CSSProperties
}

const FILL = '#FEFEFE'
/** Visible drop below the bubble — reserved in-flow so overflow:hidden cannot clip it. */
const TAIL_DROP = 18
/** Extra height that sits inside the bubble so the join has no hairline gap. */
const TAIL_OVERLAP = 8
const TAIL_H = TAIL_DROP + TAIL_OVERLAP
const TAIL_W = 48

/**
 * Bubble + tail are one visual unit.
 * Tail is a sibling (not a child of the rounded box) so border-radius cannot clip it.
 * It overlaps the bubble by TAIL_OVERLAP and stays inside the wrapper via paddingBottom,
 * so a marquee with overflow:hidden will not cut the triangle and there is no navy gap.
 */
export function SpeechBubble({ tail, children, maxWidth, style }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        maxWidth,
        paddingBottom: TAIL_DROP,
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          backgroundColor: FILL,
          borderRadius: 20,
          padding: 'clamp(12px, 1.4vw, 20px) clamp(16px, 1.9vw, 28px)',
        }}
      >
        {children}
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          height: TAIL_H,
          width: TAIL_W,
          ...(tail === 'right' ? { right: '12%' } : { left: '12%' }),
          backgroundColor: FILL,
          clipPath:
            tail === 'right'
              ? 'polygon(0 0, 100% 0, 100% 100%)'
              : 'polygon(0 0, 100% 0, 0 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
