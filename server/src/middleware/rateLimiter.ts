import rateLimit from 'express-rate-limit'

export const sosRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Too many requests' },
})

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests' },
})

/** Unauthenticated patient locale lookup — keep tight to reduce enumeration. */
export const patientHintsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
})

/** New volunteer SSE connections per IP (long-lived; limit abuse). */
export const volunteerSseRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many SSE connections' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const volunteerOtpRequestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Too many OTP requests' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const patientOtpRequestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Too many OTP requests' },
  standardHeaders: true,
  legacyHeaders: false,
})

/** Public self-registration — keep strict to limit abuse. */
export const patientSelfRegisterRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  message: { error: 'Too many registration attempts' },
  standardHeaders: true,
  legacyHeaders: false,
})

/** Phone-only web login — tighter than general limit to slow account probing. */
export const authPhoneLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: 'Too many login attempts' },
  standardHeaders: true,
  legacyHeaders: false,
})
