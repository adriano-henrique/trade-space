import { useState } from 'react'
import { useLevel } from '../game/level'
import { cheapestFor } from '../game/medal'
import type { Frontier, FrontierPoint } from '../game/types'

type Point = FrontierPoint<unknown>

const W = 640
const H = 320
const PAD = { l: 52, r: 16, t: 16, b: 42 }

/**
 * Every design that meets all requirements, as cost vs science. The gold line is the Pareto
 * frontier: no design beats it on both at once. "There is rarely a single perfect solution."
 */
export function ParetoChart({
  frontier: f,
  describe,
  scale,
  you,
  nasa,
}: {
  frontier: Frontier<unknown>
  describe: (d: never) => string
  /** What a science score of 100 means for this mission. */
  scale: string
  you: { cost: number; science: number; ok: boolean }
  nasa?: { cost: number; science: number }
}) {
  const [hover, setHover] = useState<Point | null>(null)
  const lv = useLevel()

  const all = [...f.feasible.map((p) => p.cost), you.cost, ...(nasa ? [nasa.cost] : [])]
  const sci = [...f.feasible.map((p) => p.science), you.science, ...(nasa ? [nasa.science] : [])]
  const x0 = Math.floor(Math.min(...all) / 50) * 50 - 25
  const x1 = Math.ceil(Math.max(...all) / 50) * 50 + 25
  const y0 = Math.max(0, Math.floor(Math.min(...sci) / 10) * 10 - 10)
  const y1 = Math.ceil(Math.max(...sci) / 10) * 10 + 5
  const x = (c: number) => PAD.l + ((c - x0) / (x1 - x0)) * (W - PAD.l - PAD.r)
  const y = (s: number) => H - PAD.b - ((s - y0) / (y1 - y0)) * (H - PAD.t - PAD.b)

  const step = f.frontier
    .map((p, i) => {
      const prev = f.frontier[i - 1]
      return i === 0 ? `M${x(p.cost)},${y(p.science)}` : `L${x(p.cost)},${y(prev.science)} L${x(p.cost)},${y(p.science)}`
    })
    .join(' ')

  const better = cheapestFor(you.science, f)
  const cheapest = f.frontier[0]
  const best = f.frontier[f.frontier.length - 1]
  const xTicks: number[] = []
  // At most eight cost labels, so they never run into each other on a wide range.
  const xStep = [100, 200, 500, 1000, 2000].find((s) => (x1 - x0) / s <= 8) ?? 5000
  for (let c = Math.ceil(x0 / xStep) * xStep; c <= x1; c += xStep) xTicks.push(c)
  const yTicks: number[] = []
  for (let s = Math.ceil(y0 / 20) * 20; s <= y1; s += 20) yTicks.push(s)

  const soft = { fontSize: 12, fill: 'var(--color-ink-soft)', fontFamily: 'var(--font-sans)' }
  return (
    <div className="space-y-4">
      <p className="max-w-[72ch]">
        The computer flew all <span className="num font-semibold">{f.searched.toLocaleString('en-US')}</span> designs you could have picked.{' '}
        <span className="num font-semibold">{f.feasible.length.toLocaleString('en-US')}</span> of them meet every goal: those are the grey dots. Dots on the{' '}
        <span className="font-semibold text-grape">purple line</span> are the best deals: nothing gets more science for the same money.
        {lv.detail && ' Engineers call that line the Pareto frontier, and the whole cloud of options the trade space.'} Point at a dot to see its design.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cost against science score for every design that meets the goals">
        {xTicks.map((c) => (
          <g key={c}>
            <line x1={x(c)} x2={x(c)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink)" strokeOpacity="0.1" />
            <text x={x(c)} y={H - PAD.b + 16} textAnchor="middle" {...soft}>
              ${c.toLocaleString('en-US')}M
            </text>
          </g>
        ))}
        {yTicks.map((s) => (
          <g key={s}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(s)} y2={y(s)} stroke="var(--color-ink)" strokeOpacity="0.1" />
            <text x={PAD.l - 6} y={y(s) + 4} textAnchor="end" {...soft}>
              {s}
            </text>
          </g>
        ))}
        <text x={W / 2} y={H - 4} textAnchor="middle" {...soft} fontWeight="600">
          Costs more →
        </text>
        <text x={13} y={H / 2} textAnchor="middle" transform={`rotate(-90 13 ${H / 2})`} {...soft} fontWeight="600">
          More science →
        </text>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(100)} y2={y(100)} stroke="var(--color-ink)" strokeOpacity="0.45" strokeDasharray="5 5" />
        <text x={W - PAD.r} y={y(100) - 5} textAnchor="end" {...soft}>
          100 = {scale}
        </text>

        {f.feasible.map((p, i) => (
          <circle
            key={i}
            cx={x(p.cost)}
            cy={y(p.science)}
            r={hover === p ? 6 : 3}
            fill="var(--color-ink)"
            opacity={hover === p ? 1 : 0.22}
            onMouseEnter={() => setHover(p)}
          />
        ))}
        <path d={step} fill="none" stroke="var(--color-grape)" strokeWidth="3.5" strokeLinejoin="round" />
        {f.frontier.map((p, i) => (
          <circle key={i} cx={x(p.cost)} cy={y(p.science)} r="5" fill="var(--color-grape)" stroke="var(--color-paper)" strokeWidth="1.5" onMouseEnter={() => setHover(p)} />
        ))}

        {nasa && (
          <g>
            <polygon points={star(x(nasa.cost), y(nasa.science), 12, 5.5)} fill="var(--color-sun)" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            <text x={x(nasa.cost) + 15} y={y(nasa.science) + (Math.abs(x(nasa.cost) - x(you.cost)) < 60 && Math.abs(y(nasa.science) - y(you.science)) < 24 ? 20 : 5)} fontSize="14" fontFamily="var(--font-display)" fill="var(--color-ink)">
              NASA
            </text>
          </g>
        )}
        <g>
          <circle cx={x(you.cost)} cy={y(you.science)} r="9" fill={you.ok ? 'var(--color-leaf)' : 'var(--color-rocket)'} stroke="var(--color-ink)" strokeWidth="3" />
          <text x={x(you.cost) + 14} y={y(you.science) - 9} fontSize="14" fontFamily="var(--font-display)" fill={you.ok ? 'var(--color-ink)' : 'var(--color-rocket)'}>
            You{you.ok ? '' : ' (missed a goal)'}
          </text>
        </g>
      </svg>

      {hover && <DesignLine label="The dot you pointed at" p={hover} describe={describe} />}
      <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {cheapest && <DesignLine label="Cheapest design that meets every goal" p={cheapest} describe={describe} />}
        {best && <DesignLine label="Most science of all" p={best} describe={describe} />}
      </div>
      {you.ok && better && better.cost < you.cost - 5 && (
        <p className="font-semibold">
          One design gets at least your science score ({you.science}) for <span className="num text-grape">${(you.cost - better.cost).toFixed(0)} million less</span>. Can you find it?
        </p>
      )}
      {you.ok && better && better.cost >= you.cost - 5 && <p className="font-semibold">You are on the purple line. Nobody gets more science for less money.</p>}
    </div>
  )
}

function DesignLine({ label, p, describe }: { label: string; p: Point; describe: (d: never) => string }) {
  return (
    <div className="pop">
      <p className="text-[0.9rem] font-semibold text-ink-soft">{label}</p>
      <p className="display num text-[1.15rem]">
        ${p.cost.toFixed(0)}M · science {p.science}
      </p>
      <p className="text-[0.92rem] text-ink-soft">{describe(p.design as never)}</p>
    </div>
  )
}

function star(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}
