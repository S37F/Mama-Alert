export function excludeUssdIncapacitation(): boolean {
  const v = process.env.EXCLUDE_USSD_INCAPACITATION
  return v === 'true' || v === '1'
}
