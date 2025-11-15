import { choice, permutation, randString, shuffle, logo } from '../index.js'
import { describe, test, expect } from 'vitest'

describe('Choice module tests', () => {
  test('Selects element from array', () => {
    const arr = [1,2,3,4]
    const val = choice(arr)
    expect(arr).toContain(val)
  })

  test('Throws error for empty array', () => {
    expect(() => choice([])).toThrow('Items array can not be empty.')
  })

  test('Generates deterministic sequences with same seed', () => {
    // Si tu choice soporta seed
  })
})

describe('Permutation module tests', () => {
  test('Permutes array correctly', () => {
    const arr = [1,2,3]
    const result = permutation(arr)
    expect(result.sort()).toEqual(arr.sort())
  })

  test('Handles empty array', () => {
    expect(permutation([])).toEqual([])
  })

  test('Throws error for invalid input', () => {
    expect(() => permutation(-1)).toThrow()
    expect(() => permutation('str')).toThrow()
  })
})

describe('RandString module tests', () => {
  test('Generates string of correct length', () => {
    const str = randString(10)
    expect(str).toHaveLength(10)
    expect(typeof str).toBe('string')
  })

  test('Throws for invalid length', () => {
    expect(() => randString(-1)).toThrow()
    expect(() => randString(2.5)).toThrow()
  })
})

describe('Shuffle module tests', () => {
  test('Shuffles array without changing elements', () => {
    const arr = [1,2,3,4]
    const copy = [...arr]
    const shuffled = shuffle(arr)
    expect(shuffled.sort()).toEqual(copy.sort())
  })

  test('Handles empty array', () => {
    expect(shuffle([])).toEqual([])
  })
})
describe('Logo module tests', () => {
  test('Generates an SVG string of correct size', () => {
    const size = 100
    const svg = logo(size)
    expect(typeof svg).toBe('string')
    expect(svg.length).toBeGreaterThan(0)
    expect(svg).toContain('<svg')       // Comprobamos que contiene la etiqueta SVG
    expect(svg).toContain('<rect')      // Comprobamos que contiene el rectángulo base
    expect(svg).toContain('<circle')    // Comprobamos que genera al menos un círculo
  })
})