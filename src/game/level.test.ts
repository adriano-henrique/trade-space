import { expect, it } from 'vitest'
import { easiest, levelInfo, LEVELS, MEDAL_LIMITS } from './level'
import { medal } from './medal'

it('help shrinks as the level rises: everything, the formula only, nothing', () => {
  expect(levelInfo('explorer').aids).toEqual({ clues: true, formula: true, calculator: true })
  expect(levelInfo('student').aids).toEqual({ clues: false, formula: true, calculator: false })
  expect(levelInfo('engineer').aids).toEqual({ clues: false, formula: false, calculator: false })
})

it('medals get stricter as the level rises', () => {
  const ids = LEVELS.map((l) => l.id)
  expect(ids).toEqual(['explorer', 'student', 'engineer'])
  for (let tier = 0; tier < 4; tier++) {
    expect(MEDAL_LIMITS.explorer[tier]).toBeGreaterThanOrEqual(MEDAL_LIMITS.student[tier])
    expect(MEDAL_LIMITS.student[tier]).toBeGreaterThanOrEqual(MEDAL_LIMITS.engineer[tier])
  }
  // The same guess, 1.5 times off, is gold for an explorer and a student, and silver for an engineer.
  expect(medal(150, 100, 'explorer').tier).toBe(3)
  expect(medal(150, 100, 'student').tier).toBe(3)
  expect(medal(150, 100, 'engineer').tier).toBe(2)
})

it('a flight counts for the easiest level any of it was played at', () => {
  expect(easiest(['engineer'])).toBe('engineer')
  expect(easiest(['engineer', 'student', 'engineer'])).toBe('student')
  expect(easiest(['student', 'explorer', 'engineer'])).toBe('explorer')
})
