import { useLevel } from '../../game/level'
import type { ControlsProps, RocketLook } from '../../game/types'
import { kgText, priceText } from '../../game/medal'
import { Field, RocketCards, Segmented, SizingCard, Toggle } from '../../ui/kit'
import { C3, INSTRUMENTS, ROCKETS, type Design, type InstrumentId, type Result } from './model'

export const ROCKET_LOOKS: Record<Design['rocket'], RocketLook> = {
  atlas401: { name: 'Atlas V 401', size: 3 },
  atlas551: { name: 'Atlas V 551', size: 3, boosters: 2 },
  deltaIVH: { name: 'Delta IV Heavy', size: 4, boosters: 2 },
}

const TOOL_WORDS: Record<InstrumentId, string> = {
  mag: 'Magnet mapper',
  mwr: 'Deep-water sensor',
  gravity: 'Gravity science',
  particles: 'Aurora watcher',
  cam: 'Camera',
}

/** Every label has a plain version and an engineering version; `useLevel` picks which to show. */
export function JunoControls({ design, result, step, set, openGut, estimated }: ControlsProps<Design, Result>) {
  const lv = useLevel()
  const { perks } = result
  if (step === 'path')
    return (
      <Field
        label={lv.say('How do you get to Jupiter?', 'Trajectory')}
        hint={lv.say(
          `On this path your rocket can carry ${ROCKETS[design.rocket].capKg[design.trajectory].toLocaleString('en-US')} kg. A harder push means it can carry less.`,
          `Launch energy C3 = ${C3[design.trajectory]} km²/s². ${ROCKETS[design.rocket].name} delivers ${ROCKETS[design.rocket].capKg[design.trajectory].toLocaleString('en-US')} kg to that C3.`,
        )}
      >
        <Segmented
          value={design.trajectory}
          onChange={(v) => set({ trajectory: v })}
          options={[
            {
              value: 'direct',
              label: lv.term('Straight there', 'direct'),
              hint: lv.say('About 2½ years. Needs a huge push from the rocket.', `Hohmann-like, about 2.5 yr. C3 = ${C3.direct} km²/s².`),
            },
            {
              value: 'flyby',
              label: lv.term('Swing past Earth first', 'Earth gravity assist'),
              hint: lv.say('About 5 years. Earth’s gravity gives you a free boost.', `2+ ΔV-EGA, about 5 yr, two deep-space maneuvers. C3 = ${C3.flyby} km²/s².`),
            },
          ]}
        />
      </Field>
    )

  if (step === 'orbit')
    return (
      <>
        <Field label={lv.say('How do you circle Jupiter?', 'Science orbit')}>
          <Segmented
            columns={1}
            value={design.orbit}
            onChange={(v) => set({ orbit: v })}
            options={[
              {
                value: 'equatorial',
                label: lv.say('Around the middle, every 3 days', 'Equatorial, 3-day period'),
                hint: lv.say('Lots of visits, straight through the radiation belts.', 'Many perijoves, each one inside the radiation belts.'),
              },
              {
                value: 'polar14',
                label: lv.say('Over the poles, every 14 days', 'Polar, 14-day period'),
                hint: lv.say('Ducks under the belts. Needs one extra engine burn.', 'Perijove under the belts. Needs a period-reduction maneuver.'),
              },
              {
                value: 'polar53',
                label: lv.say('Over the poles, every 53 days', 'Polar, 53-day capture orbit'),
                hint: lv.say('No extra burn. Visits come slowly.', 'No period-reduction burn. 30 perijoves take 4.4 years.'),
              },
            ]}
          />
        </Field>
        <Field
          label={lv.term('Armour for the electronics', 'radiation vault')}
          hint={lv.say(
            `With this orbit and armour, your electronics survive ${result.survivable} close passes.`,
            `Total-dose rating in this orbit: ${result.survivable} perijove passes.`,
          )}
        >
          <Segmented
            value={design.vaultCm}
            onChange={(v) => set({ vaultCm: v })}
            options={[
              { value: 0, label: 'None' },
              { value: 1, label: '1 cm titanium', hint: '172 kg' },
              { value: 2, label: '2 cm titanium', hint: '344 kg' },
            ]}
          />
        </Field>
      </>
    )

  if (step === 'power')
    return (
      <Field label={lv.say(`Your spacecraft uses ${result.loadW.toFixed(0)} watts`, `Load at Jupiter: ${result.loadW.toFixed(0)} W`)}>
        <Segmented
          value={design.power}
          onChange={(v) => set({ power: v })}
          options={[
            {
              value: 'solar',
              label: lv.term('Solar wings', 'solar arrays'),
              hint: lv.say('Cheap. But sunlight is very weak at Jupiter.', 'Flux falls as 1/r². Cells also lose efficiency in low-intensity, low-temperature light.'),
            },
            {
              value: 'rtg',
              label: lv.term('Nuclear batteries', 'RTGs'),
              hint: lv.say('Work in the dark. Rare and very expensive.', 'MMRTG class: about 110 W each at launch, Pu-238, decaying about 4% a year.'),
            },
          ]}
        />
        <div className="mt-3 grid">
          {design.power === 'solar' ? (
            <SizingCard
              label={lv.term('Solar wings', 'solar array')}
              value={`${design.arrayM2} m²`}
              sub={lv.say('how much is that at Jupiter? You find out there.', `about ${((design.arrayM2 * 290) / 1000).toFixed(1)} kW at 1 AU`)}
              done={estimated('array')}
              onClick={() => openGut('array')}
            />
          ) : (
            <Field label={lv.say('How many? Each makes about 110 watts when new.', 'Number of RTGs (110 W each at beginning of life)')} value={`${result.powerW.toFixed(0)} W at Jupiter`}>
              <Segmented value={design.rtgs} onChange={(v) => set({ rtgs: v })} options={[1, 2, 3, 4].map((n) => ({ value: n as Design['rtgs'], label: `${n}` }))} />
            </Field>
          )}
        </div>
      </Field>
    )

  if (step === 'tools')
    return (
      <Field label={lv.say('Science tools', 'Payload')}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(Object.keys(INSTRUMENTS) as InstrumentId[]).map((id) => (
            <Toggle
              key={id}
              checked={design[id]}
              onChange={(v) => set({ [id]: v } as Partial<Design>)}
              label={lv.say(TOOL_WORDS[id], INSTRUMENTS[id].name)}
              hint={lv.detail ? `${INSTRUMENTS[id].note} ${INSTRUMENTS[id].w} W · ${kgText(INSTRUMENTS[id].kg, perks.instrumentMass)}` : INSTRUMENTS[id].note}
            />
          ))}
        </div>
      </Field>
    )

  if (step === 'radio')
    return (
      <Field
        label={lv.term('Dish that talks to Earth', 'high-gain antenna')}
        hint={lv.say('A bigger dish sends more data across 750 million km. It is also heavier.', `Gain scales with D². X-band, ${result.txW} W RF, to a 34 m DSN antenna.`)}
      >
        <Segmented
          value={design.hga}
          onChange={(v) => set({ hga: v })}
          options={[
            { value: 1.5, label: '1.5 m' },
            { value: 2.5, label: '2.5 m' },
            { value: 4, label: '4 m' },
          ]}
        />
      </Field>
    )

  return (
    <Field
      label={lv.say(`Your spacecraft weighs ${result.wetKg.toFixed(0)} kg`, `Wet mass: ${result.wetKg.toFixed(0)} kg for ${result.deltaV} m/s of Δv`)}
    >
      <RocketCards
        value={design.rocket}
        onChange={(v) => set({ rocket: v as Design['rocket'] })}
        rockets={(Object.keys(ROCKETS) as Design['rocket'][]).map((id) => ({
          id,
          name: ROCKETS[id].name,
          lifts: `${ROCKETS[id].capKg[design.trajectory].toLocaleString('en-US')} kg`,
          price: priceText(ROCKETS[id].costM, perks.launchCost),
          note: ROCKETS[id].note,
          look: ROCKET_LOOKS[id],
          tooSmall: result.wetKg > ROCKETS[id].capKg[design.trajectory],
        }))}
      />
    </Field>
  )
}
