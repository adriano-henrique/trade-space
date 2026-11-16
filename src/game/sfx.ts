// Tiny synthesized sound kit (Web Audio, no files). Every call is safe before the first click
// and when sound is off.
let ctx: AudioContext | null = null
let muted = false
try {
  muted = localStorage.getItem('trade-space-muted') === '1'
} catch {
  // storage blocked: sound stays on
}

function ac(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'triangle', vol = 0.12, slideTo?: number) {
  const a = ac()
  if (!a) return
  const t = a.currentTime + at
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(at: number, dur: number, vol: number, from: number, to: number) {
  const a = ac()
  if (!a) return
  const t = a.currentTime + at
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.2))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(a.destination)
  src.start(t)
}

export const sfx = {
  tap: () => tone(520, 0, 0.06, 'triangle', 0.08),
  /** A part clunks onto the spacecraft. */
  clunk: () => {
    tone(180, 0, 0.09, 'square', 0.07, 90)
    tone(700, 0.02, 0.05, 'triangle', 0.05)
  },
  off: () => tone(300, 0, 0.09, 'triangle', 0.07, 170),
  good: () => {
    tone(660, 0, 0.09)
    tone(990, 0.08, 0.14)
  },
  bad: () => tone(170, 0, 0.22, 'sawtooth', 0.07, 110),
  lock: () => {
    tone(440, 0, 0.07, 'square', 0.06)
    tone(440, 0.09, 0.07, 'square', 0.06)
  },
  medal: (tier: number) => {
    const notes = [[220], [392, 523], [392, 523, 659], [392, 523, 659, 784], [523, 659, 784, 1047, 1319]][tier] ?? [220]
    notes.forEach((n, i) => tone(n, i * 0.09, 0.16, tier === 0 ? 'sawtooth' : 'triangle', 0.1))
  },
  beep: (final = false) => tone(final ? 880 : 440, 0, final ? 0.5 : 0.14, 'square', 0.07),
  liftoff: (seconds: number) => {
    noise(0, seconds, 0.3, 900, 120)
    tone(60, 0, seconds, 'sawtooth', 0.06, 35)
  },
  thud: () => {
    noise(0, 0.6, 0.35, 500, 60)
    tone(90, 0, 0.5, 'sine', 0.2, 35)
  },
  alarm: () => {
    tone(620, 0, 0.14, 'square', 0.06)
    tone(470, 0.16, 0.2, 'square', 0.06)
  },
  ping: () => tone(1320, 0, 0.3, 'sine', 0.05),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((n, i) => tone(n, i * 0.11, 0.22, 'triangle', 0.11)),
  lose: () => [392, 370, 349, 262].forEach((n, i) => tone(n, i * 0.2, 0.3, 'triangle', 0.1)),
}

export function isMuted() {
  return muted
}

export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem('trade-space-muted', m ? '1' : '0')
  } catch {
    // storage blocked
  }
  if (m && ctx) void ctx.suspend()
}
