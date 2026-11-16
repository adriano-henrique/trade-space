# Numbers to check before the demo

The physics formulas are standard and unit-tested (`npx vitest run`, 33 tests). The items below are
**facts shown as real** (check them) and **game values** (label them "simplified" in the pitch).

## SMAP (2015)
- [ ] 685 km sun-synchronous, 6 a.m./6 p.m. equator crossing
- [ ] 6 m mesh reflector, 14.6 rpm, ~1000 km swath; radiometer ~40 km, radar 1–3 km
- [ ] Launch mass 944 kg, Delta II, Vandenberg, 31 Jan 2015
- [ ] Radar amplifier failure on 7 July 2015
- [ ] X-band science downlink (130 Mbps in the catalog)
- [ ] Briefing: soil moisture in the top few centimetres drives runoff and flooding, and crop growth

## Juno (2011)
- [ ] Solar arrays "about 60 m²", 18,698 cells, ~14 kW near Earth, ~500 W at Jupiter
- [ ] Launch 5 Aug 2011, Atlas V 551, 3,625 kg
- [ ] Deep-space maneuvers 30 Aug and 14 Sep 2012; Earth flyby 9 Oct 2013; safe mode right after the flyby
- [ ] Jupiter orbit insertion 5 Jul 2016 UTC (4 Jul US time), ~35-minute burn, ~545 m/s
- [ ] Oct 2016 helium check-valve issue → stayed in the 53-day orbit
- [ ] 30 Sep 2019 thruster burn (~10.5 h) to avoid a ~12-hour eclipse in Nov 2019
- [ ] Titanium vault ~1 cm walls, ~172 kg
- [ ] JunoCam included for public engagement
- [ ] Briefing: Jupiter is "probably the oldest planet" (thought to be the first to form)
- [ ] Discoveries shown: polar cyclone clusters, dilute ("fuzzy") core, auroras unlike Earth's, Great Red Spot roots hundreds of km deep (pass numbers in the game are illustrative)

## Uranus Orbiter & Probe (future)
- [ ] Decadal Survey 2022: highest-priority new Flagship
- [ ] Baseline: Falcon Heavy expendable, June 2031 / April 2032, Jupiter assist, ~13.4 yr cruise, arrive 2044, ~4.5 yr tour, 3 next-gen RTGs, probe
- [ ] Next Jupiter-assist opportunity "not until 2044" (later NASA-linked study). The game's simplified geometry puts it at 2045–46
- [ ] Uranus equinox ~2049 (previous: Dec 2007); Voyager 2 (Jan 1986) saw only the moons' southern hemispheres
- [ ] Magnetic field tilted ~60° and offset; aerocapture never flown at another planet; Galileo probe radioed ~1 hour
- [ ] Briefing: Uranus and Neptune are the only planets that have never had an orbiter
- Cost estimates conflict between sources ($2.8B in a NASA appendix vs ~$4.2B elsewhere), so the game quotes no cost

## Echo stories
- [ ] Starlink Feb 2022 storm losses; Galileo high-gain antenna failure; Opportunity 2018 dust storm; New Horizons hibernation

## Approximate game values (not sourced; say "simplified")
- Rocket capacities and prices (all missions), subsystem masses, powers, data volumes and costs, budgets
- Drag Δv fit, RTG decay 2%/yr (next-gen) and 4%/yr (MMRTG), radiation "rated passes", Jupiter-alignment window model
- Crew edges (`src/game/crew.ts`): all twelve are game values. The twelve crew members are fictional. Edges change
  prices, masses, loads, margins and the science score, never a physical law; the radio edge is modelled as 25 W → 40 W
  of transmitter output. "You vs NASA" and the three-star benchmark use the mission with no crew edges.

## Real data shipped in `src/data`
- `donki-gst-2015.json`: NASA DONKI geomagnetic storms, 2015 (`node scripts/fetch-donki.mjs`; 2016–17 need a personal NASA API key: the demo key hit its daily limit)
- `voyager1-range.json`: JPL Horizons, Voyager 1 range from Earth's centre, Nov 2026 to Jan 2027
  (24 h light-time crossing ≈ 02:15 UTC 19 Nov 2026 by Horizons; press says 18 Nov)
- `jupiter-uranus.json`: JPL Horizons heliocentric positions of Jupiter and Uranus, 2026–2064
