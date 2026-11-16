// Downloads DONKI geomagnetic storms (GST) in 60-day windows (the API limit)
// and writes a compact archive the game ships with. Usage:
//   NASA_API_KEY=... node scripts/fetch-donki.mjs 2015-01-31 2015-12-31 src/data/donki-gst-2015.json
import { writeFileSync } from 'node:fs'

const [start, end, out] = process.argv.slice(2)
const key = process.env.NASA_API_KEY ?? 'DEMO_KEY'
const DAY = 86400000
const storms = []
for (let t = Date.parse(start); t <= Date.parse(end); t += 60 * DAY) {
  const a = new Date(t).toISOString().slice(0, 10)
  const b = new Date(Math.min(t + 59 * DAY, Date.parse(end))).toISOString().slice(0, 10)
  const res = await fetch(`https://api.nasa.gov/DONKI/GST?startDate=${a}&endDate=${b}&api_key=${key}`)
  if (!res.ok) throw new Error(`${a}..${b}: HTTP ${res.status} ${await res.text()}`)
  const text = await res.text()
  for (const e of text ? JSON.parse(text) : []) {
    storms.push({
      id: e.gstID,
      start: e.startTime,
      kp: Math.max(...e.allKpIndex.map((k) => k.kpIndex)),
      link: e.link,
    })
  }
  console.log(a, b, 'ok')
}
writeFileSync(out, JSON.stringify({ source: 'NASA DONKI (api.nasa.gov/DONKI/GST)', fetched: new Date().toISOString().slice(0, 10), range: [start, end], storms }, null, 2) + '\n')
console.log(storms.length, 'storms ->', out)
