import { useEffect, useMemo, useState } from 'react'
import { builtSize, CrewContext, loadHires, perksOf, saveHires, withCrew, type Hires } from './game/crew'
import { easiest, LevelContext, loadLevel, saveLevel, type Level } from './game/level'
import { loadStars, missionStars, saveStars } from './game/progress'
import type { AnyMission } from './game/types'
import { MISSIONS } from './missions'
import { BriefingScreen } from './ui/BriefingScreen'
import { DesignScreen } from './ui/DesignScreen'
import type { Estimate } from './ui/Guess'
import { FlightScreen } from './ui/FlightScreen'
import { ReportScreen } from './ui/ReportScreen'
import { TitleScreen } from './ui/TitleScreen'

type Screen = 'title' | 'briefing' | 'design' | 'flight' | 'report'

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [missionId, setMissionId] = useState(MISSIONS[0].id)
  // Each mission keeps its own crew, design and estimates, so switching missions never loses work.
  const [allHires, setAllHires] = useState<Record<string, Hires>>(loadHires)
  const [designs, setDesigns] = useState<Record<string, unknown>>(() => Object.fromEntries(MISSIONS.map((m) => [m.id, m.starter])))
  const [estimates, setEstimates] = useState<Record<string, Record<string, Estimate>>>({})
  /** Missions whose build has been opened, so the briefing knows it is being revisited. */
  const [started, setStarted] = useState<Record<string, boolean>>({})
  const hires = useMemo(() => allHires[missionId] ?? {}, [allHires, missionId])
  const mine = useMemo(() => estimates[missionId] ?? {}, [estimates, missionId])

  // The mission as this crew flies it: same physics, with their edges on mass, cost and the rest.
  const mission: AnyMission = useMemo(() => withCrew(MISSIONS.find((m) => m.id === missionId)!, perksOf(hires)), [missionId, hires])

  // Parts sized by estimate are built from the estimate, plus whatever margin this crew adds.
  const design = useMemo(() => {
    const d = { ...(designs[missionId] as Record<string, unknown>) }
    const perks = perksOf(hires)
    for (const m of Object.values(mission.metrics)) if (m.sizes && mine[m.id]) d[m.sizes] = builtSize(mine[m.id].value, perks)
    return d
  }, [designs, missionId, mission, mine, hires])

  const flight = useMemo(() => {
    if (screen !== 'flight' && screen !== 'report') return null
    return mission.fly(design, mission.evaluate(design))
  }, [screen, mission, design])

  const [stars, setStars] = useState(loadStars)
  const [level, setLevelState] = useState<Level>(loadLevel)
  const setLevel = (l: Level) => {
    setLevelState(l)
    saveLevel(l)
  }

  // A flight counts for the easiest level any of its estimates were made at.
  const flownAs = useMemo(() => {
    const made = Object.values(mission.metrics).filter((m) => mine[m.id] && (m.applies?.(design) ?? true))
    return easiest([level, ...made.map((m) => mine[m.id].level)])
  }, [level, mission, mine, design])

  const hire = (seats: Hires) => setAllHires((prev) => ({ ...prev, [missionId]: { ...prev[missionId], ...seats } }))
  useEffect(() => saveHires(allHires), [allHires])

  const go = (s: Screen) => {
    setScreen(s)
    window.scrollTo({ top: 0 })
  }

  return (
    <LevelContext.Provider value={level}>
      <CrewContext.Provider value={hires}>
        <main className="relative">
          {screen === 'title' && (
            <TitleScreen
              missions={MISSIONS}
              stars={stars}
              level={level}
              onLevel={setLevel}
              onPlay={(id) => {
                setMissionId(id)
                go('briefing')
              }}
            />
          )}
          {screen === 'briefing' && (
            <BriefingScreen
              key={missionId}
              mission={mission}
              hires={hires}
              resuming={Boolean(started[missionId])}
              onHire={hire}
              onLevel={setLevel}
              onStart={() => {
                setStarted((prev) => ({ ...prev, [missionId]: true }))
                go('design')
              }}
              onBack={() => go('title')}
            />
          )}
          {screen === 'design' && (
            <DesignScreen
              key={missionId}
              mission={mission}
              design={design}
              estimates={mine}
              onLevel={setLevel}
              onDesign={(d) => setDesigns((prev) => ({ ...prev, [missionId]: d }))}
              onEstimate={(id, e) => setEstimates((prev) => ({ ...prev, [missionId]: { ...(prev[missionId] ?? {}), [id]: e } }))}
              onLaunch={() => go('flight')}
              onBriefing={() => go('briefing')}
              onBack={() => go('title')}
            />
          )}
          {screen === 'flight' && flight && (
            <FlightScreen
              key={missionId}
              mission={mission}
              design={design}
              flight={flight}
              onDone={() => {
                setStars(saveStars(flownAs, missionId, missionStars(mission, design, flight)))
                go('report')
              }}
            />
          )}
          {screen === 'report' && flight && (
            <ReportScreen mission={mission} design={design} flight={flight} estimates={mine} flownAs={flownAs} onRedesign={() => go('design')} onMenu={() => go('title')} />
          )}
        </main>
      </CrewContext.Provider>
    </LevelContext.Provider>
  )
}
