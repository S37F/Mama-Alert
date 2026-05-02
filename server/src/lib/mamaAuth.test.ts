import { afterEach, describe, expect, it } from 'vitest'
import { readSignupFallbackCoordinates, resolveSignupCoordinates } from '@/lib/mamaAuth'

const oldLat = process.env.SELF_REG_FALLBACK_LAT
const oldLng = process.env.SELF_REG_FALLBACK_LNG

function restoreEnv(key: 'SELF_REG_FALLBACK_LAT' | 'SELF_REG_FALLBACK_LNG', value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

afterEach(() => {
  restoreEnv('SELF_REG_FALLBACK_LAT', oldLat)
  restoreEnv('SELF_REG_FALLBACK_LNG', oldLng)
})

describe('signup coordinates', () => {
  it('uses explicit coordinates before env fallback', () => {
    process.env.SELF_REG_FALLBACK_LAT = '18.5204'
    process.env.SELF_REG_FALLBACK_LNG = '73.8567'

    expect(resolveSignupCoordinates({ lat: 12.34, lng: 56.78 })).toEqual({
      lat: 12.34,
      lng: 56.78,
    })
  })

  it('reads configured fallback coordinates', () => {
    process.env.SELF_REG_FALLBACK_LAT = '18.5204'
    process.env.SELF_REG_FALLBACK_LNG = '73.8567'

    expect(readSignupFallbackCoordinates()).toEqual({
      lat: 18.5204,
      lng: 73.8567,
    })
    expect(resolveSignupCoordinates()).toEqual({
      lat: 18.5204,
      lng: 73.8567,
    })
  })

  it('rejects missing coordinates instead of silently using zeroes', () => {
    delete process.env.SELF_REG_FALLBACK_LAT
    delete process.env.SELF_REG_FALLBACK_LNG

    expect(readSignupFallbackCoordinates()).toBeNull()
    expect(() => resolveSignupCoordinates()).toThrow(/Location is required/)
  })
})
