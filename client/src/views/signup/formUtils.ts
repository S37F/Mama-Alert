import type { FieldErrors } from 'react-hook-form'

export function composePhone(dialCode: string, phoneLocal: string): string {
  const digits = phoneLocal.replace(/\D/g, '')
  return `${dialCode}${digits}`
}

export function scrollToFirstError<TFieldValues extends Record<string, unknown>>(errors: FieldErrors<TFieldValues>): void {
  const firstKey = Object.keys(errors)[0]
  if (!firstKey) {
    return
  }
  const target = document.getElementById(firstKey)
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (target instanceof HTMLElement) {
    window.setTimeout(() => target.focus(), 120)
  }
}
