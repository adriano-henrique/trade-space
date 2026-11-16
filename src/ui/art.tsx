// Hand-drawn-looking SVG pieces shared by every screen. Everything is flat colour with a thick
// ink outline, like the parts sheet of a model kit. All pieces draw around their own origin.
import { useId } from 'react'
import type { Look } from '../game/crew'
import type { RocketLook } from '../game/types'

export const INK = 'var(--color-ink)'
const stroke = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

const ROCKET_H = [96, 132, 168, 214]
const ROCKET_W = [20, 24, 28, 36]

export function rocketHeight(size: RocketLook['size']) {
  return ROCKET_H[size - 1] + ROCKET_W[size - 1] * 1.1
}

/** A rocket standing on y = 0, centred on x = 0, pointing up. */
export function RocketArt({ look, flame = 0 }: { look: RocketLook; flame?: number }) {
  const h = ROCKET_H[look.size - 1]
  const w = ROCKET_W[look.size - 1]
  const nose = w * 1.1
  const boosters = look.boosters ?? 0
  return (
    <g>
      {flame > 0 && (
        <g>
          <path d={`M${-w * 0.42} 0 Q0 ${70 * flame} ${w * 0.42} 0 Z`} fill="var(--color-rocket)" {...stroke} />
          <path d={`M${-w * 0.2} 0 Q0 ${38 * flame} ${w * 0.2} 0 Z`} fill="var(--color-sun)" />
        </g>
      )}
      {boosters > 0 &&
        [-1, 1].map((side) => (
          <g key={side} transform={`translate(${side * (w / 2 + 7)} 0)`}>
            {flame > 0 && <path d={`M-5 0 Q0 ${40 * flame} 5 0 Z`} fill="var(--color-sun)" {...stroke} strokeWidth={2.5} />}
            <path d={`M-7 0 V${-h * 0.5} Q0 ${-h * 0.5 - 16} 7 ${-h * 0.5} V0 Z`} fill="var(--color-paper-2)" {...stroke} />
          </g>
        ))}
      <path d={`M${-w / 2 - 12} 0 L${-w / 2} ${-h * 0.2} V0 Z`} fill="var(--color-rocket)" {...stroke} />
      <path d={`M${w / 2 + 12} 0 L${w / 2} ${-h * 0.2} V0 Z`} fill="var(--color-rocket)" {...stroke} />
      <rect x={-w / 2} y={-h} width={w} height={h} fill={look.body ?? 'var(--color-paper)'} {...stroke} />
      <path d={`M${-w / 2} ${-h} Q${-w / 2} ${-h - nose * 0.75} 0 ${-h - nose} Q${w / 2} ${-h - nose * 0.75} ${w / 2} ${-h} Z`} fill="var(--color-rocket)" {...stroke} />
      <rect x={-w / 2} y={-h * 0.62} width={w} height={h * 0.09} fill="var(--color-ink)" />
      <rect x={-w / 2} y={-h * 0.3} width={w} height={h * 0.06} fill="var(--color-rocket)" />
      <circle cx="0" cy={-h * 0.8} r={w * 0.2} fill="var(--color-sky-deep)" {...stroke} strokeWidth={2.5} />
    </g>
  )
}

/** Earth: ocean, a few land shapes, optional night side on the left (Sun to the right). */
export function EarthArt({ r, night = false }: { r: number; night?: boolean }) {
  const id = useId()
  return (
    <g>
      <clipPath id={id}>
        <circle r={r} />
      </clipPath>
      <circle r={r} fill="oklch(0.68 0.13 240)" />
      <g clipPath={`url(#${id})`} fill="var(--color-leaf)">
        <path d={`M${-r * 0.7} ${-r * 0.55} q${r * 0.3} ${-r * 0.3} ${r * 0.6} ${-r * 0.1} q${r * 0.1} ${r * 0.3} ${-r * 0.15} ${r * 0.45} q${-r * 0.1} ${r * 0.35} ${-r * 0.35} ${r * 0.15} Z`} />
        <path d={`M${r * 0.15} ${-r * 0.05} q${r * 0.4} ${-r * 0.2} ${r * 0.6} ${r * 0.1} q${r * 0.05} ${r * 0.4} ${-r * 0.3} ${r * 0.6} q${-r * 0.35} ${-r * 0.1} ${-r * 0.3} ${-r * 0.7} Z`} />
        <path d={`M${-r * 0.5} ${r * 0.4} q${r * 0.25} ${-r * 0.1} ${r * 0.35} ${r * 0.15} q${-r * 0.05} ${r * 0.3} ${-r * 0.3} ${r * 0.4} Z`} />
        <ellipse cx="0" cy={-r * 0.98} rx={r * 0.5} ry={r * 0.14} fill="var(--color-paper)" />
        {night && <rect x={-r} y={-r} width={r} height={r * 2} fill="var(--color-space)" opacity="0.6" />}
      </g>
      <circle r={r} fill="none" {...stroke} />
    </g>
  )
}

export function JupiterArt({ r }: { r: number }) {
  const id = useId()
  return (
    <g>
      <clipPath id={id}>
        <circle r={r} />
      </clipPath>
      <circle r={r} fill="oklch(0.8 0.08 70)" />
      <g clipPath={`url(#${id})`}>
        <rect x={-r} y={-r * 0.72} width={r * 2} height={r * 0.2} fill="oklch(0.62 0.11 50)" />
        <rect x={-r} y={-r * 0.3} width={r * 2} height={r * 0.16} fill="oklch(0.9 0.05 85)" />
        <rect x={-r} y={r * 0.02} width={r * 2} height={r * 0.26} fill="oklch(0.62 0.11 50)" />
        <rect x={-r} y={r * 0.5} width={r * 2} height={r * 0.14} fill="oklch(0.7 0.1 60)" />
        <ellipse cx={r * 0.35} cy={r * 0.16} rx={r * 0.24} ry={r * 0.14} fill="var(--color-rocket)" stroke={INK} strokeWidth={2.5} />
      </g>
      <circle r={r} fill="none" {...stroke} />
    </g>
  )
}

/** Uranus, lying on its side: the rings stand almost upright. */
export function UranusArt({ r }: { r: number }) {
  return (
    <g>
      <g transform="rotate(-78)">
        <path d={`M${-r * 1.75} 0 A${r * 1.75} ${r * 0.42} 0 0 1 ${r * 1.75} 0`} fill="none" stroke={INK} strokeWidth={3} />
      </g>
      <circle r={r} fill="oklch(0.84 0.09 200)" {...stroke} />
      <path d={`M${-r * 0.55} ${-r * 0.5} Q${-r * 0.1} ${-r * 0.85} ${r * 0.35} ${-r * 0.7}`} fill="none" stroke="var(--color-paper)" strokeWidth={r * 0.1} strokeLinecap="round" opacity="0.7" />
      <g transform="rotate(-78)">
        <path d={`M${-r * 1.75} 0 A${r * 1.75} ${r * 0.42} 0 0 0 ${r * 1.75} 0`} fill="none" stroke={INK} strokeWidth={3} />
        <path d={`M${-r * 1.45} 0 A${r * 1.45} ${r * 0.33} 0 0 0 ${r * 1.45} 0`} fill="none" stroke={INK} strokeWidth={1.5} />
      </g>
    </g>
  )
}

export function PlanetArt({ place, r }: { place: 'earth' | 'jupiter' | 'uranus'; r: number }) {
  return place === 'earth' ? <EarthArt r={r} /> : place === 'jupiter' ? <JupiterArt r={r} /> : <UranusArt r={r} />
}

/** Mission control: the voice that talks to you, one short line at a time. */
export function Capcom({ mood = 'calm', size = 56, color = 'var(--color-sun)' }: { mood?: 'calm' | 'happy' | 'worried'; size?: number; color?: string }) {
  const mouth = mood === 'happy' ? 'M-9 7 Q0 17 9 7' : mood === 'worried' ? 'M-8 12 Q0 5 8 12' : 'M-7 9 Q0 13 7 9'
  return (
    <svg viewBox="-32 -32 64 64" width={size} height={size} aria-hidden className="shrink-0">
      <circle r="24" fill={color} {...stroke} />
      <path d="M-26 2 A26 26 0 0 1 26 2" fill="none" {...stroke} strokeWidth={5} />
      <rect x="-31" y="-4" width="10" height="16" rx="4" fill="var(--color-rocket)" {...stroke} strokeWidth={3} />
      <rect x="21" y="-4" width="10" height="16" rx="4" fill="var(--color-rocket)" {...stroke} strokeWidth={3} />
      <path d="M-26 12 Q-24 24 -10 22" fill="none" {...stroke} strokeWidth={3} />
      <circle cx="-9" cy="22" r="3.5" fill={INK} />
      <circle cx="-8" cy="-4" r="3" fill={INK} />
      <circle cx="8" cy="-4" r="3" fill={INK} />
      <path d={mouth} fill="none" {...stroke} strokeWidth={3} />
    </svg>
  )
}

/** A crew member, drawn in the same ink as mission control. The disc is their department's colour. */
export function Portrait({ look, color, size = 56, mood = 'calm' }: { look: Look; color: string; size?: number; mood?: 'calm' | 'happy' | 'worried' }) {
  const id = useId()
  const line = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  const { skin, hair, style } = look
  const mouth = mood === 'happy' ? 'M-5.5 2.5 Q0 8.5 5.5 2.5' : mood === 'worried' ? 'M-4.5 5.5 Q0 2 4.5 5.5' : 'M-4 3.5 Q0 6.5 4 3.5'
  // The hair that sits on top of the head, by style. Long styles also have a shape behind it.
  const cap: Record<Look['style'], string | null> = {
    short: 'M-13.4 -6 Q-15 -22 0 -21.5 Q15 -22 13.4 -6 Q9 -14 0 -13.5 Q-9 -14 -13.4 -6 Z',
    swoop: 'M-13.4 -5 Q-15.5 -22 1 -21.5 Q15 -21 13.4 -7 Q5 -9 -3 -15.5 Q-7 -9 -13.4 -5 Z',
    bun: 'M-13.4 -6 Q-15 -22 0 -21.5 Q15 -22 13.4 -6 Q8 -15 0 -15 Q-8 -15 -13.4 -6 Z',
    long: 'M-13.4 -4 Q-15 -22 0 -21.5 Q15 -22 13.4 -4 Q9 -15 1 -15.5 Q-8 -14 -13.4 -4 Z',
    bob: 'M-13.6 -6 Q-15 -22 0 -21.5 Q15 -22 13.6 -6 Q0 -12.5 -13.6 -6 Z',
    curly: 'M-13.4 -7 Q-13 -19 0 -19 Q13 -19 13.4 -7 Q7 -14 0 -14 Q-7 -14 -13.4 -7 Z',
    wrap: 'M-13.6 -2 Q-15.5 -22 0 -21.5 Q15.5 -22 13.6 -2 Q9 -14.5 0 -14.5 Q-9 -14.5 -13.6 -2 Z',
    bald: null,
  }
  return (
    <svg viewBox="-32 -32 64 64" width={size} height={size} aria-hidden className="shrink-0">
      <clipPath id={id}>
        <circle r="28.5" />
      </clipPath>
      <circle r="28.5" fill={color} />
      <g clipPath={`url(#${id})`}>
        {style === 'long' && <path d="M-16.5 32 Q-23 -25 0 -24.5 Q23 -25 16.5 32 Z" fill={hair} {...line} />}
        {style === 'wrap' && <path d="M-18 32 Q-24 -26 0 -25 Q24 -26 18 32 Z" fill={hair} {...line} />}
        {style === 'bob' && <path d="M-17.5 5 Q-21 -25 0 -24.5 Q21 -25 17.5 5 Q17 10 11 9 H-11 Q-17 10 -17.5 5 Z" fill={hair} {...line} />}
        {style === 'curly' && <circle cx="0" cy="-9" r="18.5" fill={hair} {...line} />}
        {style === 'bun' && <circle cx="0" cy="-22.5" r="5.5" fill={hair} {...line} />}
        <path d="M-25 36 Q-25 15.5 -8 14.5 H8 Q25 15.5 25 36 Z" fill="var(--color-paper)" {...line} />
        <path d="M-5 5 V15 Q0 19.5 5 15 V5 Z" fill={skin} {...line} />
        {style === 'wrap' && <path d="M-9 13 Q0 22 9 13 Q11 16 9 19 Q0 25 -9 19 Q-11 16 -9 13 Z" fill={hair} {...line} />}
        <ellipse cx="0" cy="-5" rx="13" ry="14.5" fill={skin} {...line} />
        {cap[style] && <path d={cap[style]!} fill={hair} {...line} />}
        {style === 'bald' && <path d="M-13 -3 Q-15.5 -8 -12.5 -13 M13 -3 Q15.5 -8 12.5 -13" fill="none" stroke={hair} strokeWidth="3.5" strokeLinecap="round" />}
        {look.beard && <path d="M-11.5 1 Q-9 8 0 8 Q9 8 11.5 1 Q12 11 0 12.5 Q-12 11 -11.5 1 Z" fill={hair} {...line} strokeWidth={2} />}
        <circle cx="-5" cy="-5.5" r="2.1" fill={INK} />
        <circle cx="5" cy="-5.5" r="2.1" fill={INK} />
        {look.glasses && (
          <g fill="var(--color-paper)" fillOpacity="0.35" stroke={INK} strokeWidth="2">
            <circle cx="-5.2" cy="-5.5" r="4.4" />
            <circle cx="5.2" cy="-5.5" r="4.4" />
            <path d="M-0.8 -5.5 H0.8 M-9.6 -6 L-13 -7.5 M9.6 -6 L13 -7.5" fill="none" />
          </g>
        )}
        <path d={mouth} fill="none" {...line} />
        {look.headset && (
          <g>
            <path d="M-15 -5 A15 16.5 0 0 1 15 -5" fill="none" {...line} strokeWidth={3.5} />
            <rect x="-18.5" y="-8" width="6" height="11" rx="3" fill="var(--color-rocket)" {...line} />
            <rect x="12.5" y="-8" width="6" height="11" rx="3" fill="var(--color-rocket)" {...line} />
            <path d="M-16 3 Q-15 9.5 -8 8.5" fill="none" {...line} />
            <circle cx="-7.5" cy="8.5" r="2.2" fill={INK} />
          </g>
        )}
      </g>
      <circle r="28.5" fill="none" {...stroke} />
    </svg>
  )
}

export function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="var(--color-paper)" opacity="0.85">
      <ellipse cx="0" cy="0" rx="38" ry="14" />
      <ellipse cx="-14" cy="-9" rx="18" ry="13" />
      <ellipse cx="12" cy="-12" rx="22" ry="16" />
    </g>
  )
}

function starPoints(outer: number, inner: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

export function Stars({ n, of = 3, size = 34, onDark = false }: { n: number; of?: number; size?: number; onDark?: boolean }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <svg key={i} viewBox="-14 -14 28 28" width={size} height={size} aria-hidden>
          <polygon
            points={starPoints(11, 5)}
            fill={i < n ? 'var(--color-sun)' : onDark ? 'var(--color-space-2)' : 'var(--color-paper-2)'}
            stroke={onDark ? 'var(--color-star)' : INK}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

const MEDAL_FILL = ['var(--color-paper-2)', 'oklch(0.7 0.1 55)', 'oklch(0.82 0.02 250)', 'var(--color-sun)', 'var(--color-sun)']

/** Guess medal: 0 = miss, 1 bronze, 2 silver, 3 gold, 4 bullseye. */
export function MedalToken({ tier, size = 34 }: { tier: number; size?: number }) {
  return (
    <svg viewBox="-16 -16 32 32" width={size} height={size} aria-hidden className="shrink-0">
      {tier === 4 ? (
        <>
          <circle r="13" fill="var(--color-paper)" {...stroke} strokeWidth={3} />
          <circle r="8.5" fill="var(--color-rocket)" />
          <circle r="4" fill="var(--color-paper)" />
          <circle r="1.6" fill={INK} />
        </>
      ) : (
        <>
          <circle r="13" fill={MEDAL_FILL[tier]} {...stroke} strokeWidth={3} />
          {tier === 0 ? <path d="M-5 -5 L5 5 M5 -5 L-5 5" {...stroke} strokeWidth={3} /> : <polygon points={starPoints(7, 3.2)} fill={INK} />}
        </>
      )}
    </svg>
  )
}

export function Check({ state, size = 22 }: { state: 'ok' | 'bad' | 'mystery'; size?: number }) {
  const fill = state === 'ok' ? 'var(--color-leaf)' : state === 'bad' ? 'var(--color-rocket)' : 'var(--color-grape)'
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} aria-hidden className="shrink-0">
      <circle r="10" fill={fill} stroke={INK} strokeWidth={2.5} />
      {state === 'ok' && <path d="M-4.5 0.5 L-1 4 L5 -3.5" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
      {state === 'bad' && <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" fill="none" stroke="var(--color-paper)" strokeWidth={3} strokeLinecap="round" />}
      {state === 'mystery' && (
        <text y="4.5" textAnchor="middle" fontSize="13" fontFamily="var(--font-display)" fill="var(--color-paper)">
          ?
        </text>
      )}
    </svg>
  )
}
