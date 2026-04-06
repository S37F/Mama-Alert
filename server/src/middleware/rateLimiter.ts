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
