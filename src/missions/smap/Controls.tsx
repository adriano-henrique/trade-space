import { useLevel } from '../../game/level'
import type { ControlsProps } from '../../game/types'
import { kgText, priceText } from '../../game/medal'
import { Field, RocketCards, Segmented, SizingCard, Toggle } from '../../ui/kit'
import { RADIOS, ROCKETS, STATIONS, type Design, type Result } from './model'

export const ROCKET_LOOKS = {
  pegasus: { name: 'Pegasus XL', size: 1 },
  minotaur: { name: 'Minotaur IV', size: 2 },
  delta2: { name: 'Delta II', size: 3, boosters: 2 },
  falcon9: { name: 'Falcon 9', size: 4 },
} as const

const RADIO_WORDS = { S: 'Slow', X: 'Fast', Ka: 'Super fast' }
const STATION_WORDS = {
  one: ['1 antenna', '4 passes a day'],
  polar: ['2 near the North Pole', 'a pass every lap'],
  polar3: ['3, with Antarctica', 'even more passes'],
} as const

/** Every label has a plain version and an engineering version; `useLevel` picks which to show. */
export function SmapControls({ design, result, step, set, openGut, estimated }: ControlsProps<Design, Result>) {
  const lv = useLevel()
  const { perks } = result
  const mbps = (k: Design['radio']) => Math.round(RADIOS[k].mbps * perks.txPower)
  if (step === 'orbit')
    return (
      <>
        <Field
          label={lv.say('How high does it fly?', 'Altitude')}
          value={`${design.altitude} km`}
          hint={lv.say(
            'Low: a sharper map, but thin air slows you down. High: covers Earth faster, blurrier map.',
            '400–850 km, sun-synchronous: the inclination follows the altitude.',
          )}
        >
          <input
            type="range"
            min={400}
            max={850}
            step={5}
            value={design.altitude}
            onChange={(e) => set({ altitude: Number(e.target.value) })}
            className="slide"
            aria-label="Altitude in kilometres"
          />
        </Field>
        <Field label={lv.say('Which way does the orbit point?', 'Sun-synchronous local time')}>
          <Segmented
            value={design.orbit}
            onChange={(v) => set({ orbit: v })}
            options={[
              {
                value: 'noon',
                label: lv.term('Over noon and midnight', 'noon–midnight'),
                hint: lv.say('Flies through Earth’s shadow on every lap.', 'β ≈ 0°: an eclipse on every orbit. Good light for optical imaging.'),
              },
              {
                value: 'dawn-dusk',
                label: lv.term('Along sunrise and sunset', 'dawn–dusk'),
                hint: lv.say('Rides the edge of day and night, almost always in sunlight.', '06:00/18:00 crossing: near-continuous sunlight, short eclipse season at solstice.'),
              },
            ]}
          />
        </Field>
      </>
    )

  if (step === 'tools')
    return (
      <>
        <Field
          label={lv.term('Dish that listens for soil water', 'L-band radiometer reflector')}
          hint={lv.say(
            'Water in soil gives off faint radio waves. A bigger dish hears finer detail, and weighs more.',
            'Passive radiometry at 1.41 GHz (λ = 21 cm). Footprint ≈ 1.2 λ/D × slant range.',
          )}
        >
          <Segmented
            value={design.dish}
            onChange={(v) => set({ dish: v })}
            options={[
              { value: 2, label: '2 m' },
              { value: 4, label: '4 m' },
              { value: 6, label: '6 m', hint: lv.say('folding mesh', 'deployable mesh') },
            ]}
          />
        </Field>
        <Field label={lv.say('Extras', 'Additional instruments')}>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Toggle
              checked={design.radar}
              onChange={(v) => set({ radar: v })}
              label={lv.term('Radar', 'L-band SAR')}
              hint={lv.say('Super-sharp detail. Heavy, power-hungry, makes lots of data.', '1–3 km resolution. +350 W, about 100 GB/day.')}
            />
            <Toggle
              checked={design.camera}
              onChange={(v) => set({ camera: v })}
              label={lv.term('Camera', 'optical imager')}
              hint={lv.say('Beautiful pictures of the ground.', 'Visible band. +40 W, about 30 GB/day.')}
            />
          </div>
        </Field>
      </>
    )

  if (step === 'power')
    return (
      <Field label={lv.say(`Your spacecraft uses ${result.loadW.toFixed(0)} watts, day and night`, `Orbit-average load: ${result.loadW.toFixed(0)} W`)}>
        <div className="grid gap-2.5">
          <SizingCard
            label={lv.term('Solar wings', 'solar array')}
            value={`${design.arrayM2} m²`}
            sub={lv.say(`make ${result.arrayW.toFixed(0)} watts in sunlight`, `${result.arrayW.toFixed(0)} W in sunlight, after packing and ageing losses`)}
            done={estimated('array')}
            onClick={() => openGut('array')}
          />
          <SizingCard
            label={lv.say('Battery', 'Battery (Li-ion)')}
            value={`${design.batteryWh} Wh`}
            sub={lv.say('keeps it running in the dark', 'carries the load through eclipse')}
            done={estimated('battery')}
            onClick={() => openGut('battery')}
          />
        </div>
      </Field>
    )

  if (step === 'radio')
    return (
      <>
        <Field
          label={lv.say('Radio', 'Science downlink band')}
          hint={lv.say(
            `Your instruments make ${result.collectGbDay.toFixed(0)} GB of data a day. That is about ${Math.round(result.collectGbDay / 4)} HD movies.`,
            `Collected: ${result.collectGbDay.toFixed(0)} GB/day. Downlink capacity: ${result.downlinkGbDay.toFixed(1)} GB/day.`,
          )}
        >
          <Segmented
            value={design.radio}
            onChange={(v) => set({ radio: v })}
            options={(Object.keys(RADIOS) as Design['radio'][]).map((k) => ({
              value: k,
              label: lv.say(RADIO_WORDS[k], RADIOS[k].name),
              hint: lv.expert ? `${mbps(k)} Mbps · ${RADIOS[k].w} W · ${kgText(RADIOS[k].kg, perks.antenna)}` : `${RADIOS[k].name}, ${mbps(k)} Mbps`,
            }))}
          />
        </Field>
        <Field
          label={lv.term('Antennas on the ground', 'ground stations')}
          hint={lv.say('The satellite can only send data while it passes over one of your antennas.', 'Polar stations see a polar orbiter on nearly every revolution.')}
        >
          <Segmented
            value={design.stations}
            onChange={(v) => set({ stations: v })}
            options={(Object.keys(STATIONS) as Design['stations'][]).map((k) => ({
              value: k,
              label: lv.say(STATION_WORDS[k][0], STATIONS[k].name),
              hint: lv.expert ? undefined : STATION_WORDS[k][1],
            }))}
          />
        </Field>
      </>
    )

  return (
    <Field
      label={lv.say(`Your spacecraft weighs ${result.wetKg.toFixed(0)} kg`, `Wet mass: ${result.wetKg.toFixed(0)} kg (${result.dryKg.toFixed(0)} dry + ${result.propKg.toFixed(0)} propellant)`)}
    >
      <RocketCards
        value={design.rocket}
        onChange={(v) => set({ rocket: v as Design['rocket'] })}
        rockets={(Object.keys(ROCKETS) as Design['rocket'][]).map((id) => ({
          id,
          name: ROCKETS[id].name,
          lifts: `${ROCKETS[id].capacityKg.toLocaleString('en-US')} kg`,
          price: priceText(ROCKETS[id].costM, perks.launchCost),
          note: ROCKETS[id].note,
          look: ROCKET_LOOKS[id],
          tooSmall: result.wetKg > ROCKETS[id].capacityKg,
        }))}
      />
    </Field>
  )
}
