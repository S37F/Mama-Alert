import { afterEach, describe, expect, it } from 'vitest'
import { excludeUssdIncapacitation } from '@/config/incapacitationEnv'

describe('excludeUssdIncapacitation', () => {
  const orig = process.env.EXCLUDE_USSD_INCAPACITATION

  afterEach(() => {
    if (orig === undefined) {
      delete process.env.EXCLUDE_USSD_INCAPACITATION
    } else {
      process.env.EXCLUDE_USSD_INCAPACITATION = orig
    }
  })

  it('is false when unset', () => {
    delete process.env.EXCLUDE_USSD_INCAPACITATION
    expect(excludeUssdIncapacitation()).toBe(false)
  })

  it('is true when EXCLUDE_USSD_INCAPACITATION=1', () => {
    process.env.EXCLUDE_USSD_INCAPACITATION = '1'
    expect(excludeUssdIncapacitation()).toBe(true)
  })
})
