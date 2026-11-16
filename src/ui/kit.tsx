import { useState, type ReactNode } from 'react'
import { DEPARTMENTS, type CrewMember } from '../game/crew'
import { AIDS, levelInfo, LEVELS, useLevel, type Level } from '../game/level'
import { isMuted, setMuted, sfx } from '../game/sfx'
import type { BarSpec, RocketLook, Why } from '../game/types'
import { Capcom, Check, Portrait, RocketArt, rocketHeight } from './art'

export function Button({
  children,
  onClick,
  variant = 'primary',
  small,
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'plain' | 'go'
  small?: boolean
  disabled?: boolean
  className?: string
}) {
  const v = { primary: '', plain: 'btn-plain', go: 'btn-go' }[variant]
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sfx.tap()
        onClick?.()
      }}
      className={`btn ${v} ${small ? 'btn-small' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

/** One short thing, said by the department head who owns it. With no `who` it is mission control. */
export function Say({ children, mood, who, onDark = false }: { children: ReactNode; mood?: 'calm' | 'happy' | 'worried'; who?: CrewMember; onDark?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {who ? <Portrait look={who.look} color={DEPARTMENTS[who.role].color} mood={mood} size={56} /> : <Capcom mood={mood} size={52} />}
      <div className="min-w-0 flex-1">
        {who && (
          <p className="mb-1 leading-tight">
            <span className="display text-[1.02rem]">{who.name}</span> <span className="text-[0.9rem] font-semibold text-ink-soft">{DEPARTMENTS[who.role].title}</span>
          </p>
        )}
        <p className={`relative rounded-2xl rounded-tl-sm border-[3px] px-3.5 py-2.5 text-[1.02rem] leading-snug ${who ? '' : 'mt-0.5'} ${onDark ? 'border-star bg-space-2 text-star' : 'border-ink bg-paper-2'}`}>{children}</p>
      </div>
    </div>
  )
}

export function Field({ label, value, hint, children }: { label: string; value?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        {value && <span className="display num text-xl">{value}</span>}
      </div>
      {children}
      {hint && <p className="mt-2 text-[0.94rem] text-ink-soft">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T
  options: { value: T; label: ReactNode; hint?: ReactNode }[]
  onChange: (v: T) => void
  columns?: number
}) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          aria-pressed={o.value === value}
          onClick={() => {
            if (o.value !== value) sfx.clunk()
            onChange(o.value)
          }}
          className="pick"
        >
          <span className="block font-semibold leading-tight">{o.label}</span>
          {o.hint && <span className="mt-0.5 block text-[0.88rem] leading-snug text-ink-soft">{o.hint}</span>}
        </button>
      ))}
    </div>
  )
}

/** Bolt a part on or take it off. */
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        if (checked) sfx.off()
        else sfx.clunk()
        onChange(!checked)
      }}
      className="pick flex items-start gap-2.5"
    >
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-[3px] border-ink ${checked ? 'bg-ink' : 'bg-paper'}`}>
        {checked && (
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
            <path d="M2 6.5 L5 9.5 L10 3" fill="none" stroke="var(--color-sun)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>
        <span className="block font-semibold leading-tight">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.88rem] leading-snug text-ink-soft">{hint}</span>}
      </span>
    </button>
  )
}

/** A part you size by guessing. Purple until you have guessed. */
export function SizingCard({ label, value, sub, done, onClick }: { label: string; value: string; sub: string; done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.tap()
        onClick()
      }}
      className="pick flex items-center gap-3"
    >
      <Check state={done ? 'ok' : 'mystery'} size={30} />
      <span className="flex-1">
        <span className="block font-semibold leading-tight">{label}</span>
        <span className="display num block text-2xl">{done ? value : '???'}</span>
        <span className="block text-[0.88rem] leading-snug text-ink-soft">{done ? sub : 'You decide how big.'}</span>
      </span>
      <span className="display text-grape">{done ? 'Change' : 'Guess'}</span>
    </button>
  )
}

export function RocketCards({
  value,
  onChange,
  rockets,
}: {
  value: string
  onChange: (id: string) => void
  rockets: { id: string; name: string; lifts: string; price: string; note: string; look: RocketLook; tooSmall?: boolean }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {rockets.map((r) => {
        const h = rocketHeight(r.look.size)
        return (
          <button
            type="button"
            key={r.id}
            aria-pressed={value === r.id}
            onClick={() => {
              if (value !== r.id) sfx.clunk()
              onChange(r.id)
            }}
            className="pick flex items-end gap-2"
          >
            <svg viewBox={`-34 ${-h - 6} 68 ${h + 10}`} width={44} height={(44 * (h + 10)) / 68} aria-hidden className="shrink-0">
              <RocketArt look={r.look} />
            </svg>
            <span className="min-w-0">
              <span className="block font-semibold leading-tight">{r.name}</span>
              <span className={`num block text-[0.92rem] ${r.tooSmall ? 'font-semibold text-rocket' : ''}`}>lifts {r.lifts}</span>
              <span className="num block text-[0.92rem]">{r.price}</span>
              <span className="mt-0.5 block text-[0.84rem] leading-snug text-ink-soft">{r.note}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

const num = (n: number) => (n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString('en-US'))
/** A fuel-gauge style meter. "invert" meters (data sent home) read as a plain percent. */
export function Gauge({ label, value, max, unit, invert, detail }: BarSpec) {
  const lv = useLevel()
  const ratio = max > 0 ? value / max : 0
  const ok = invert ? ratio >= 0.95 : ratio <= 1
  const width = Math.max(3, Math.min(100, ratio * 100))
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[0.94rem] font-semibold">{label}</span>
        <span className={`num whitespace-nowrap text-[0.92rem] font-bold ${ok ? '' : 'text-rocket'}`}>
          {invert ? `${Math.min(100, Math.round(ratio * 100))}%` : unit === '$M' ? `$${num(value)}M of $${num(max)}M` : `${num(value)} of ${num(max)} ${unit}`}
        </span>
      </div>
      <div className="mt-1 h-4 overflow-hidden rounded-full border-[3px] border-ink bg-paper">
        <div
          className={`h-full origin-left transition-transform duration-300 ${ok ? 'bg-leaf' : 'bg-rocket'}`}
          style={{ transform: `scaleX(${width / 100})`, transitionTimingFunction: 'var(--ease-out)' }}
        />
      </div>
      {lv.detail && <p className="num mt-1 text-[0.84rem] leading-snug text-ink-soft">{detail}</p>}
    </div>
  )
}

/** The reason in one sentence; the formula is there for anyone who wants it. */
export function WhyCard({ why }: { why: Why }) {
  const lv = useLevel()
  return (
    <div className="pop">
      <p>{why.plain}</p>
      <details className="mt-2" open={lv.detail}>
        <summary className="cursor-pointer font-semibold text-grape">{lv.expert ? 'Derivation' : 'Show me the maths'}</summary>
        <pre className="num mt-2 whitespace-pre-wrap rounded-xl bg-ink p-3 font-sans text-[0.92rem] text-paper">{why.formula}</pre>
        <p className="mt-1.5 text-[0.84rem] text-ink-soft">Where this comes from: {why.source}</p>
      </details>
    </div>
  )
}

/** Everyday things to compare a guess with, by unit. Position on the slider is logarithmic. */
const LANDMARKS: Record<string, [number, string][]> = {
  min: [
    [3, 'a song'],
    [22, 'a cartoon'],
    [100, 'a movie'],
    [420, 'a school day'],
  ],
  km: [
    [1, 'a short walk'],
    [42, 'a marathon'],
    [500, 'a small country'],
  ],
  days: [
    [1, 'a day'],
    [7, 'a week'],
    [30, 'a month'],
  ],
  'm²': [
    [2, 'a door'],
    [12, 'a bedroom'],
    [60, 'a classroom'],
    [420, 'a basketball court'],
    [5000, 'a football pitch'],
  ],
  Wh: [
    [15, 'a phone'],
    [60, 'a laptop'],
    [500, 'an e-bike'],
    [5000, 'a golf cart'],
  ],
  hours: [
    [0.02, 'a minute'],
    [1, 'an hour'],
    [24, 'a day'],
  ],
  years: [
    [1, 'a year'],
    [6, 'primary school'],
    [80, 'a lifetime'],
  ],
  W: [
    [10, 'an LED bulb'],
    [100, 'a games console'],
    [800, 'a microwave'],
  ],
  kbps: [
    [0.05, 'Morse code'],
    [50, 'old dial-up'],
    [5000, 'HD video'],
  ],
  kg: [
    [70, 'a grown-up'],
    [1500, 'a car'],
    [12000, 'a bus'],
  ],
}

/** Logarithmic slider: estimates in space are about getting the size roughly right. */
export function LogSlider({
  value,
  min,
  max,
  onChange,
  unit,
  decades = false,
  band,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  unit: string
  /** Mark powers of ten instead of everyday comparisons. */
  decades?: boolean
  /** A range to highlight under the track: a crew member's ballpark. */
  band?: [number, number]
}) {
  const lo = Math.log10(min)
  const hi = Math.log10(max)
  const at = (v: number) => ((Math.log10(v) - lo) / (hi - lo)) * 100
  let marks = decades ? [] : (LANDMARKS[unit] ?? []).filter(([v]) => v >= min && v <= max && at(v) > 6 && at(v) < 94)
  if (marks.length === 0) {
    marks = []
    for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) if (at(10 ** e) > 6 && at(10 ** e) < 94) marks.push([10 ** e, `${(10 ** e).toLocaleString('en-US')}`])
  }
  return (
    <div>
      <input
        aria-label={`Your guess in ${unit}`}
        type="range"
        min={0}
        max={1000}
        value={Math.round(at(value) * 10)}
        onChange={(e) => onChange(roundNice(10 ** (lo + (Number(e.target.value) / 1000) * (hi - lo))))}
        className="slide"
      />
      {band && (
        <div className="relative mt-1 h-2" aria-hidden>
          <span
            className="absolute h-full rounded-full bg-grape"
            style={{ left: `${Math.max(0, Math.min(100, at(band[0])))}%`, right: `${100 - Math.max(0, Math.min(100, at(band[1])))}%` }}
          />
        </div>
      )}
      <div className="relative mt-1.5 h-9 text-[0.8rem] leading-tight text-ink-soft">
        {marks.map(([v, name]) => (
          <span key={v} className="absolute -translate-x-1/2 text-center" style={{ left: `${at(v)}%` }}>
            <span className="mx-auto block h-2 w-[3px] rounded-full bg-ink" />
            <span className="whitespace-nowrap">{name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function roundNice(v: number) {
  if (v < 1) return Math.round(v * 100) / 100
  if (v < 10) return Math.round(v * 10) / 10
  if (v < 100) return Math.round(v)
  if (v < 1000) return Math.round(v / 5) * 5
  if (v < 10000) return Math.round(v / 50) * 50
  return Math.round(v / 500) * 500
}


export function SoundToggle({ onDark = false }: { onDark?: boolean }) {
  const [off, setOff] = useState(isMuted())
  return (
    <button
      type="button"
      aria-pressed={!off}
      aria-label={off ? 'Turn sound on' : 'Turn sound off'}
      onClick={() => {
        setMuted(!off)
        setOff(!off)
        if (off) sfx.tap()
      }}
      className={`btn btn-small btn-plain ${onDark ? 'btn-dark' : ''}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M3 9 H8 L13 4 V20 L8 15 H3 Z" fill="currentColor" />
        {off ? (
          <path d="M16 9 L22 15 M22 9 L16 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <path d="M16 8.5 Q19 12 16 15.5 M18.5 6 Q23 12 18.5 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        )}
      </svg>
      <span>{off ? 'Sound off' : 'Sound on'}</span>
    </button>
  )
}

/** The three kinds of help with a guess, each marked as given or not at this level. */
export function AidMarks({ level }: { level: Level }) {
  const { aids } = levelInfo(level)
  const given = AIDS.filter((a) => aids[a.id]).map((a) => a.name.toLowerCase())
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.86rem] font-semibold" role="img" aria-label={given.length ? `Help with guesses: ${given.join(', ')}` : 'No help with guesses'}>
      {AIDS.map((a) => (
        <span key={a.id} className={`inline-flex items-center gap-1 ${aids[a.id] ? '' : 'text-ink-soft line-through decoration-2'}`} aria-hidden>
          <svg viewBox="-12 -12 24 24" width="16" height="16" className="shrink-0">
            <circle r="9.5" fill={aids[a.id] ? 'var(--color-leaf)' : 'none'} stroke="currentColor" strokeWidth={2.5} strokeDasharray={aids[a.id] ? undefined : '3.5 3.5'} />
            {aids[a.id] && <path d="M-4.5 0.5 L-1 4 L5 -3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          {a.name}
        </span>
      ))}
    </span>
  )
}

/** Switch between Explorer, Student and Engineer. Same missions, same physics, different help. */
export function LevelSwitch({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  return (
    <div className="inline-flex rounded-xl border-[3px] border-ink bg-paper p-0.5" role="radiogroup" aria-label="Level">
      {LEVELS.map((l) => (
        <button
          type="button"
          key={l.id}
          role="radio"
          aria-checked={value === l.id}
          title={`${l.who}. ${l.what}`}
          onClick={() => {
            sfx.tap()
            onChange(l.id)
          }}
          className={`rounded-lg px-2.5 py-1 text-[0.9rem] font-bold transition-colors ${value === l.id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2'}`}
        >
          {l.name}
        </button>
      ))}
    </div>
  )
}
