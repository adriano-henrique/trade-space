// Small in-space pieces shared by the flight views: a gauge with a "you need this much" mark,
// and the tiny spacecraft that flies around.

/** A bar where the white tick is what the spacecraft needs. Below the tick the bar turns red. */
export function NeedGauge({ title, value, need, unit, note }: { title: string; value: number; need: number; unit: string; note?: string }) {
  const TICK = 0.55
  const fill = Math.max(0.02, Math.min(1, (value / need) * TICK))
  const ok = value >= need
  return (
    <g transform="translate(16 18)">
      <text x="0" y="0" fontSize="13" fill="var(--color-star)" fontWeight="700">
        {title}
      </text>
      <rect x="0" y="8" width="150" height="20" rx="6" fill="var(--color-space-2)" stroke="var(--color-star)" strokeWidth="3" />
      <rect x="4" y="12" width={142 * fill} height="12" rx="3" fill={ok ? 'var(--color-leaf)' : 'var(--color-rocket)'} />
      <line x1={4 + 142 * TICK} y1="4" x2={4 + 142 * TICK} y2="32" stroke="var(--color-star)" strokeWidth="3" strokeLinecap="round" />
      <text x="0" y="48" fontSize="13" fill={ok ? 'var(--color-star)' : 'var(--color-rocket)'} fontWeight="600" className="num">
        {Math.round(value).toLocaleString('en-US')} {unit} · needs {Math.round(need).toLocaleString('en-US')}
      </text>
      {note && (
        <text x="0" y="65" fontSize="12.5" fill="var(--color-star)" opacity="0.7">
          {note}
        </text>
      )}
    </g>
  )
}

export function MiniCraft({ x, y, dead = false, scale = 1 }: { x: number; y: number; dead?: boolean; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-17" y="-3.5" width="34" height="7" rx="1.5" fill={dead ? 'oklch(0.45 0.02 270)' : 'oklch(0.62 0.14 255)'} stroke="var(--color-space)" strokeWidth="1.5" />
      <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill={dead ? 'oklch(0.55 0.02 270)' : 'var(--color-sun)'} stroke="var(--color-space)" strokeWidth="1.5" />
    </g>
  )
}

export function Sun({ x, y, r = 10 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="var(--color-sun)" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="0" y1={-r - 4} x2="0" y2={-r - 9} stroke="var(--color-sun)" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 45})`} />
      ))}
    </g>
  )
}
