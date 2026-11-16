import { useLevel } from '../../game/level'
import { sfx } from '../../game/sfx'
import type { ControlsProps, RocketLook } from '../../game/types'
import { kgText, priceText } from '../../game/medal'
import { Field, RocketCards, Segmented, SizingCard, Toggle } from '../../ui/kit'
import { INSTRUMENTS, jupiterAlignment, LAUNCH_YEARS, ROCKETS, type Design, type InstrumentId, type Result } from './model'

export const ROCKET_LOOKS: Record<Design['rocket'], RocketLook> = {
  vulcan: { name: 'Vulcan Centaur', size: 3, boosters: 2 },
  falconHeavy: { name: 'Falcon Heavy', size: 4, boosters: 2 },
  sls: { name: 'SLS', size: 4, boosters: 2, body: 'oklch(0.74 0.15 55)' },
}

const TOOL_WORDS: Record<InstrumentId, string> = {
  cam: 'Cameras',
  mag: 'Magnet mapper',
  irs: 'Heat sensor',
  dust: 'Dust and ring sampler',
}

/** Every label has a plain version and an engineering version; `useLevel` picks which to show. */
export function UranusControls({ design, result, step, set, openGut, estimated }: ControlsProps<Design, Result>) {
  const lv = useLevel()
  if (step === 'when')
    return (
      <>
        <Field
          label={lv.say('Which year do you launch?', 'Launch year')}
          value={String(design.launchYear)}
          hint={lv.say(
            `Tall bars are years when Jupiter is in the right place to fling you toward Uranus. These are the real positions of the planets. You would arrive in ${Math.floor(result.arrivalYear)}, after ${result.cruiseYears.toFixed(1)} years.`,
            `Bar height: Jupiter gravity-assist geometry from JPL Horizons heliocentric longitudes (${(result.alignment * 100).toFixed(0)}% this year). Cruise ${result.cruiseYears.toFixed(1)} yr, arrival ${result.arrivalYear.toFixed(1)}.`,
          )}
        >
          <WindowChart value={design.launchYear} onChange={(launchYear) => set({ launchYear })} />
        </Field>
        <Field label={lv.say('Use Jupiter as a slingshot?', 'Jupiter gravity assist')}>
          <Segmented
            value={design.assist}
            onChange={(v) => set({ assist: v })}
            options={[
              { value: 'jupiter', label: lv.say('Yes, swing past Jupiter', 'JGA'), hint: lv.say('A free push, if Jupiter is in the right place.', 'Lower C3 and shorter cruise when the geometry lines up.') },
              { value: 'none', label: lv.say('No, go straight', 'Direct'), hint: lv.say('Works any year. The rocket can carry much less.', 'Any year. High C3: launch capacity drops to 30%.') },
            ]}
          />
        </Field>
      </>
    )

  if (step === 'power')
    return (
      <Field label={lv.say(`Your spacecraft uses ${result.loadW.toFixed(0)} watts`, `Load at Uranus: ${result.loadW.toFixed(0)} W`)}>
        <Segmented
          value={design.power}
          onChange={(v) => set({ power: v })}
          options={[
            { value: 'rtg', label: lv.term('Nuclear batteries', 'RTGs'), hint: lv.say('Work in the dark. They fade a little every year.', 'Next-Gen RTG: 245 W at beginning of life, about 2% decay a year.') },
            { value: 'solar', label: lv.term('Solar wings', 'solar arrays'), hint: lv.say('Uranus is 19 times farther from the Sun than Earth.', 'Solar flux at 19.2 AU is 1/369 of the flux at Earth.') },
          ]}
        />
        <div className="mt-3 grid">
          {design.power === 'rtg' ? (
            <Field label={lv.say('How many? Each makes 245 watts when new.', 'Number of RTGs')} value={lv.say(`${result.powerEndW.toFixed(0)} W at the end`, `${result.powerEndW.toFixed(0)} W at end of mission`)}>
              <Segmented value={design.rtgs} onChange={(v) => set({ rtgs: v })} options={[2, 3, 4].map((n) => ({ value: n as Design['rtgs'], label: `${n}` }))} />
            </Field>
          ) : (
            <SizingCard label={lv.term('Solar wings', 'solar array')} value={`${design.arrayM2} m²`} sub={lv.say('is that enough out at Uranus?', 'at 19.2 AU')} done={estimated('array')} onClick={() => openGut('array')} />
          )}
        </div>
      </Field>
    )

  if (step === 'tools')
    return (
      <Field label={lv.say('Science tools', 'Payload')}>
        <div className="grid gap-2.5">
          <Toggle checked={design.probe} onChange={(v) => set({ probe: v })} label={lv.say('Probe that falls into Uranus · 330 kg', 'Atmospheric entry probe · 330 kg')} hint={lv.say('The only way to taste the gases deep in the clouds. They tell us how Uranus was made.', 'In-situ helium and noble-gas abundances: the formation fingerprints an orbiter cannot measure.')} />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(Object.keys(INSTRUMENTS) as InstrumentId[]).map((id) => (
              <Toggle key={id} checked={design[id]} onChange={(v) => set({ [id]: v } as Partial<Design>)} label={lv.say(TOOL_WORDS[id], INSTRUMENTS[id].name)} hint={lv.detail ? `${INSTRUMENTS[id].note} ${INSTRUMENTS[id].w} W · ${kgText(INSTRUMENTS[id].kg, result.perks.instrumentMass)}` : INSTRUMENTS[id].note} />
            ))}
          </div>
        </div>
      </Field>
    )

  if (step === 'arrival')
    return (
      <>
        <Field label={lv.say('How do you stop at Uranus?', 'Orbit insertion')}>
          <Segmented
            value={design.capture}
            onChange={(v) => set({ capture: v })}
            options={[
              { value: 'propulsive', label: lv.term('Fire the engine', 'propulsive'), hint: lv.say('Has always worked. Needs lots of fuel.', 'Flight-proven. About 1,650 m/s of Δv.') },
              { value: 'aerocapture', label: lv.term('Skim the atmosphere', 'aerocapture'), hint: lv.say('Saves fuel. Nobody has ever tried it at another planet.', 'Trades propellant for an aeroshell. Never flown at another planet.') },
            ]}
          />
        </Field>
        <Field label={lv.say('How long do you stay?', 'Orbital tour')}>
          <Segmented value={design.tourYears} onChange={(v) => set({ tourYears: v })} options={[2, 4, 6].map((y) => ({ value: y as Design['tourYears'], label: `${y} years` }))} />
        </Field>
        <Field label={lv.term('Dish that talks to Earth', 'high-gain antenna')}>
          <Segmented
            value={design.hga}
            onChange={(v) => set({ hga: v })}
            options={[
              { value: 2.5, label: '2.5 m' },
              { value: 4, label: '4 m', hint: 'more data, heavier' },
            ]}
          />
        </Field>
      </>
    )

  return (
    <Field
      label={lv.say(`Your spacecraft weighs ${result.wetKg.toFixed(0)} kg`, `Wet mass: ${result.wetKg.toFixed(0)} kg`)}
      hint={lv.say(
        `In ${design.launchYear} on this path, your rocket can send ${result.capKg.toLocaleString('en-US')} kg toward Uranus.`,
        `Injected-mass capacity for this window and trajectory: ${result.capKg.toLocaleString('en-US')} kg.`,
      )}
    >
      <RocketCards
        value={design.rocket}
        onChange={(v) => set({ rocket: v as Design['rocket'] })}
        rockets={(Object.keys(ROCKETS) as Design['rocket'][]).map((id) => ({
          id,
          name: ROCKETS[id].name,
          lifts: `up to ${ROCKETS[id].baseKg.toLocaleString('en-US')} kg`,
          price: priceText(ROCKETS[id].costM, result.perks.launchCost),
          note: ROCKETS[id].note,
          look: ROCKET_LOOKS[id],
        }))}
      />
    </Field>
  )
}

function WindowChart({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <div>
      <div className="flex h-28 items-end gap-1" role="radiogroup" aria-label="Launch year">
        {LAUNCH_YEARS.map((y) => {
          const q = jupiterAlignment(y).quality
          const selected = y === value
          return (
            <button
              type="button"
              key={y}
              role="radio"
              aria-checked={selected}
              aria-label={`${y}: Jupiter lines up ${(q * 100).toFixed(0)} percent`}
              onClick={() => {
                sfx.clunk()
                onChange(y)
              }}
              className="group flex h-full flex-1 flex-col justify-end"
            >
              <span
                className={`block w-full rounded-t-md border-[3px] border-b-0 border-ink ${selected ? 'bg-sun' : q > 0.4 ? 'bg-leaf group-hover:bg-sun' : 'bg-paper-2 group-hover:bg-sun'}`}
                style={{ height: `${Math.max(10, q * 100)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="num mt-1 flex gap-1 border-t-[3px] border-ink pt-1 text-[0.72rem] font-semibold">
        {LAUNCH_YEARS.map((y) => (
          <span key={y} className={`flex-1 text-center ${y === value ? '' : 'text-ink-soft'}`}>
            ’{String(y).slice(2)}
          </span>
        ))}
      </div>
    </div>
  )
}
