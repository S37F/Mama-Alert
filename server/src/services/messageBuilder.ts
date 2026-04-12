import type { Alert } from '@/types/alert'
import { statusPageUrl } from '@/config/publicUrl'
import type { Hospital } from '@/types/hospital'
import type { Patient } from '@/types/patient'
import type { Volunteer } from '@/types/volunteer'
import { truncateSms, truncateSmsTwoPart } from '@/lib/smsLength'

type Lang = string

function pickLang(lang: Lang, table: Record<string, string>): string {
  const key = lang.split('-')[0] ?? 'en'
  const en = table['en']
  const localized = table[key]
  return localized ?? en ?? ''
}

function formatRiskSnippet(flags: string[] | null | undefined, max = 44): string {
  if (!flags || flags.length === 0) {
    return ''
  }
  const s = flags.slice(0, 3).join(',')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function formatWeeksLabel(patient: Patient): string {
  if (typeof patient.weeks_pregnant === 'number' && Number.isFinite(patient.weeks_pregnant)) {
    return `${patient.weeks_pregnant}wk`
  }
  return ''
}

function formatDistanceKm(volunteer: Volunteer): string {
  if (typeof volunteer.distance_m !== 'number' || !Number.isFinite(volunteer.distance_m)) {
    return ''
  }
  const km = Math.max(volunteer.distance_m / 1000, 0.05)
  return `${km.toFixed(1)}km`
}

export function buildVolunteerAlertSMS(
  patient: Patient,
  volunteer: Volunteer,
  alert: Alert,
  lang: string = 'en',
): string {
  void alert
  const lmRaw = (patient.landmark ?? '').trim()
  const lm = lmRaw ? `${lmRaw.slice(0, 36)}. ` : ''
  const wk = formatWeeksLabel(patient)
  const wkSeg = wk ? `${wk} ` : ''
  const risk = formatRiskSnippet(patient.risk_flags)
  const riskSeg = risk ? `R:${risk}. ` : ''
  const dist = formatDistanceKm(volunteer)
  const distSeg = dist ? `~${dist}. ` : ''
  const table: Record<string, string> = {
    en: `MAMA ALERT: ${patient.name}. ${lm}${wkSeg}${riskSeg}${distSeg}Reply YES or NO.`,
    hi: `MAMA ALERT: ${patient.name}. ${lm}${wkSeg}${riskSeg}${distSeg}YES या NO भेजें।`,
    fr: `ALERTE MAMA: ${patient.name}. ${lm}${wkSeg}${riskSeg}${distSeg}Répondez OUI ou NON.`,
    sw: `MAMA ALERT: ${patient.name}. ${lm}${wkSeg}${riskSeg}${distSeg}Jibu NDIO au HAPANA.`,
    ar: `تنبيه: ${patient.name}. ${lm}${wkSeg}${riskSeg}${distSeg}أرسل نعم أو لا.`,
    pt: `ALERTA MAMA: ${patient.name}. ${lm}${wkSeg}${riskSeg}${distSeg}Responda SIM ou NÃO.`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

export function buildVolunteerWelcomeSms(
  volunteerName: string,
  appBase: string,
  lang: string = 'en',
): string {
  const first = volunteerName.split(/\s+/)[0] ?? volunteerName
  const dash = appBase.replace(/\/$/, '')
  const opt = dash.length > 0 ? `${dash}/volunteer` : 'optional web dashboard'
  const table: Record<string, string> = {
    en: `MamaAlert: Hi ${first}, you are a volunteer. Reply YES or NO to emergency SMS. App (optional): ${opt}`,
    hi: `MamaAlert: ${first}, आप स्वयंसेवक हैं। SMS में YES/NO। ऐप: ${opt}`,
    fr: `MamaAlert: ${first}, vous êtes volontaire. Répondez OUI/NON par SMS. App: ${opt}`,
    sw: `MamaAlert: ${first}, umejiandikisha. Jibu NDIO/HAPANA kwa SMS. App: ${opt}`,
    ar: `MamaAlert: ${first}، أنت متطوع. أرسل نعم/لا عبر الرسائل. التطبيق: ${opt}`,
    pt: `MamaAlert: ${first}, você é voluntário. Responda SIM/NÃO por SMS. App: ${opt}`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

export function buildVolunteerDirectionsSMS(
  patient: Patient,
  volunteer: Volunteer,
  hospital: Hospital,
  lang: string = 'en',
): string {
  void volunteer
  const lm = (patient.landmark ?? 'patient').slice(0, 48)
  const bt = patient.blood_type ?? '?'
  const hName = hospital.name.slice(0, 48)
  const table: Record<string, string> = {
    en: `Go: ${lm}. Blood ${bt}. Hospital: ${hName}.`,
    hi: `जाएँ: ${lm}. रक्त ${bt}. अस्पताल: ${hName}.`,
    fr: `Allez: ${lm}. Groupe ${bt}. Hôpital: ${hName}.`,
    sw: `Nenda: ${lm}. Damu ${bt}. Hospitali: ${hName}.`,
    ar: `اذهب: ${lm}. الدم ${bt}. المستشفى: ${hName}.`,
    pt: `Vá: ${lm}. Sangue ${bt}. Hospital: ${hName}.`,
  }
  const done: Record<string, string> = {
    en: ' Reply DONE when she is at the clinic.',
    hi: ' क्लिनिक पहुंचने पर DONE भेजें।',
    fr: ' Répondez DONE une fois à la clinique.',
    sw: ' Tuma DONE akiwa kliniki.',
    ar: ' أرسل DONE عند وصولها للعيادة.',
    pt: ' Responda DONE quando ela estiver na clínica.',
  }
  return truncateSmsTwoPart(pickLang(lang, table) + pickLang(lang, done))
}

export function buildPatientConfirmationSMS(volunteerName: string, lang: string = 'en'): string {
  const table: Record<string, string> = {
    en: `Help is coming. ${volunteerName} is on the way.`,
    hi: `मदद आ रही है। ${volunteerName} रास्ते में हैं।`,
    fr: `Aide en route. ${volunteerName} arrive.`,
    sw: `Msaada unakuja. ${volunteerName} anakuja.`,
    ar: `المساعدة في الطريق. ${volunteerName} قادم.`,
    pt: `Ajuda a caminho. ${volunteerName} está indo.`,
  }
  return truncateSms(pickLang(lang, table))
}

export function buildFamilySMS(
  patient: Patient,
  volunteerName: string,
  token: string,
  lang: string = 'en',
): string {
  const url = statusPageUrl(token)
  const table: Record<string, string> = {
    en: `${patient.name}: ${volunteerName} is helping. Status: ${url}`,
    hi: `${patient.name}: ${volunteerName} मदद कर रहे हैं। ${url}`,
    fr: `${patient.name}: ${volunteerName} aide. Statut: ${url}`,
    sw: `${patient.name}: ${volunteerName} anasaidia. ${url}`,
    ar: `${patient.name}: ${volunteerName} يساعد. ${url}`,
    pt: `${patient.name}: ${volunteerName} está a ajudar. ${url}`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

/** SMS to emergency contacts right after patient registration (enrollment + status link). */
export function buildFamilyRegistrationWelcomeSms(
  patientFirstName: string,
  statusToken: string,
  lang: string = 'en',
): string {
  const url = statusPageUrl(statusToken)
  const table: Record<string, string> = {
    en: `MamaAlert: ${patientFirstName} is enrolled. If there is an alert, track status here: ${url}`,
    hi: `MamaAlert: ${patientFirstName} पंजीकृत। अलर्ट पर स्थिति: ${url}`,
    fr: `MamaAlert: ${patientFirstName} est inscrite. Statut (alerte): ${url}`,
    sw: `MamaAlert: ${patientFirstName} amesajiliwa. Hali (dharura): ${url}`,
    ar: `MamaAlert: تسجيل ${patientFirstName}. رابط الحالة: ${url}`,
    pt: `MamaAlert: ${patientFirstName} registada. Estado (alerta): ${url}`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

function formatVolunteerWithSkills(volunteer: Volunteer): string {
  const name = volunteer.name.trim().slice(0, 28)
  const sk = (volunteer.skills ?? []).filter((s) => s.length > 0).slice(0, 3)
  const skillSeg = sk.length > 0 ? sk.join(', ').slice(0, 36) : ''
  return skillSeg ? `${name} (${skillSeg})` : name
}

function formatWeeksForPreAlert(patient: Patient): string {
  if (typeof patient.weeks_pregnant === 'number' && Number.isFinite(patient.weeks_pregnant)) {
    return `${patient.weeks_pregnant} weeks`
  }
  return '— weeks'
}

function formatRiskForPreAlert(flags: string[] | null | undefined): string {
  if (!flags || flags.length === 0) {
    return 'none'
  }
  return flags
    .slice(0, 6)
    .join(', ')
    .slice(0, 80)
}

/** SMS to hospital after volunteer confirms (English matches product spec; other langs similar). */
export function buildClinicPreAlertSMS(
  patient: Patient,
  volunteer: Volunteer,
  etaMinutes: number,
  lang: string = 'en',
): string {
  const bt = patient.blood_type ?? '?'
  const weeksSeg = formatWeeksForPreAlert(patient)
  const riskText = formatRiskForPreAlert(patient.risk_flags ?? null)
  const volLine = formatVolunteerWithSkills(volunteer)
  const table: Record<string, string> = {
    en: `PRE-ALERT: ${patient.name}, ${weeksSeg} Blood: ${bt} | Risk: ${riskText} Volunteer: ${volLine} ETA: ~${etaMinutes} minutes Reply ARRIVED when patient reaches you.`,
    hi: `PRE-ALERT: ${patient.name}, ${weeksSeg} Blood: ${bt} | Risk: ${riskText} Volunteer: ${volLine} ETA: ~${etaMinutes} min. ARRIVED भेजें।`,
    fr: `PRE-ALERT: ${patient.name}, ${weeksSeg} Blood: ${bt} | Risk: ${riskText} Volontaire: ${volLine} ETA: ~${etaMinutes} min. Répondez ARRIVED.`,
    sw: `PRE-ALERT: ${patient.name}, ${weeksSeg} Blood: ${bt} | Risk: ${riskText} Volunteer: ${volLine} ETA: ~${etaMinutes} dk. Jibu ARRIVED.`,
    ar: `PRE-ALERT: ${patient.name}, ${weeksSeg} Blood: ${bt} | Risk: ${riskText} Volunteer: ${volLine} ETA: ~${etaMinutes} د. ARRIVED.`,
    pt: `PRE-ALERT: ${patient.name}, ${weeksSeg} Blood: ${bt} | Risk: ${riskText} Voluntário: ${volLine} ETA: ~${etaMinutes} min. Responda ARRIVED.`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

/** Confirmation SMS immediately after admin registers a hospital (pure SMS onboarding). */
export function buildHospitalRegistrationConfirmationSms(hospitalName: string): string {
  const name = hospitalName.trim().slice(0, 48)
  return `${name} is now registered on MamaAlert. You will receive pre-alerts for incoming patients. Reply ARRIVED when a patient reaches you.`
}

/** Family contacts when hospital texts ARRIVED (Twilio webhook). */
export function buildFamilyPatientArrivedSms(
  patientFirstName: string,
  hospitalName: string,
  token: string,
  lang: string = 'en',
): string {
  const url = statusPageUrl(token)
  const hn = hospitalName.slice(0, 40)
  const table: Record<string, string> = {
    en: `MamaAlert: ${patientFirstName} arrived at ${hn} — being cared for. Status: ${url}`,
    hi: `MamaAlert: ${patientFirstName} ${hn} पहुंचीं। ${url}`,
    fr: `MamaAlert: ${patientFirstName} arrivée à ${hn}. ${url}`,
    sw: `MamaAlert: ${patientFirstName} amefika ${hn}. ${url}`,
    ar: `MamaAlert: وصلت ${patientFirstName} إلى ${hn}. ${url}`,
    pt: `MamaAlert: ${patientFirstName} chegou a ${hn}. ${url}`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

/** Twilio SMS reply after hospital texts ARRIVED. */
export function buildHospitalArrivedAck(kind: 'confirmed' | 'none'): string {
  if (kind === 'confirmed') {
    return 'MamaAlert: Patient marked arrived. Alert resolved. Thank you.'
  }
  return 'MamaAlert: No open alert found for this facility. If this is a mistake, call your coordinator.'
}

/** Twilio SMS reply after patient texts SOS keyword. */
export function buildSmsKeywordAck(
  lang: string,
  kind: 'received' | 'duplicate' | 'notfound' | 'error',
): string {
  const tables: Record<'received' | 'duplicate' | 'notfound' | 'error', Record<string, string>> = {
    received: {
      en: 'MamaAlert: Emergency received. Volunteers are being notified.',
      hi: 'MamaAlert: आपातकाल मिला। स्वयंसेवकों को सूचित किया जा रहा है।',
      fr: "MamaAlert: Urgence reçue. Les bénévoles sont prévenus.",
      sw: 'MamaAlert: Dharura imepokelewa. Wahamasishaji wanaarifiwa.',
      ar: 'MamaAlert: تم استلام الطوارئ. يتم إخطار المتطوعين.',
      pt: 'MamaAlert: Emergência recebida. Voluntários estão a ser notificados.',
    },
    duplicate: {
      en: 'MamaAlert: An alert was already sent recently. Call local emergency if needed.',
      hi: 'MamaAlert: हाल ही में पहले से अलर्ट भेजा गया। जरूरत हो तो आपातकालीन कॉल करें।',
      fr: 'MamaAlert: Une alerte a déjà été envoyée. Appelez les secours si besoin.',
      sw: 'MamaAlert: Tahadhari tayari imetumwa hivi karibuni.',
      ar: 'MamaAlert: تم إرسال تنبيه مؤخرًا. اتصل بالطوارئ إذا لزم.',
      pt: 'MamaAlert: Já foi enviado um alerta recentemente. Ligue emergência se precisar.',
    },
    notfound: {
      en: 'MamaAlert: This number is not registered. Contact your health worker.',
      hi: 'MamaAlert: यह नंबर पंजीकृत नहीं है।',
      fr: "MamaAlert: Numéro non enregistré. Contactez votre agent de santé.",
      sw: 'MamaAlert: Nambari haijasajiliwa.',
      ar: 'MamaAlert: الرقم غير مسجل.',
      pt: 'MamaAlert: Este número não está registado.',
    },
    error: {
      en: 'MamaAlert: Could not process your message. Try again or call for help.',
      hi: 'MamaAlert: संदेश प्रक्रिया नहीं हो सकी।',
      fr: 'MamaAlert: Échec du traitement. Réessayez.',
      sw: 'MamaAlert: Imeshindwa. Jaribu tena.',
      ar: 'MamaAlert: تعذر المعالجة.',
      pt: 'MamaAlert: Não foi possível processar. Tente de novo.',
    },
  }
  return truncateSms(pickLang(lang, tables[kind]))
}

/** Family SMS when PWA/SMS SOS shows no volunteer response within incapacitation window. */
export function buildFamilyIncapacitationSMS(patient: Patient, token: string, lang: string = 'en'): string {
  const url = statusPageUrl(token)
  const first = patient.name.split(/\s+/)[0] ?? patient.name
  const table: Record<string, string> = {
    en: `URGENT: ${first} may need help. MamaAlert SOS. Check: ${url}`,
    hi: `जरूरी: ${first}। MamaAlert SOS। ${url}`,
    fr: `URGENT: ${first} SOS MamaAlert. ${url}`,
    sw: `HARAKA: ${first} SOS MamaAlert. ${url}`,
    ar: `عاجل: ${first} MamaAlert. ${url}`,
    pt: `URGENTE: ${first} SOS MamaAlert. ${url}`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

export function buildVolunteerDoneAck(lang: string = 'en'): string {
  const table: Record<string, string> = {
    en: 'MamaAlert: Thank you. She is marked at the clinic.',
    hi: 'MamaAlert: धन्यवाद। क्लिनिक पर अपडेट किया।',
    fr: 'MamaAlert: Merci. Statut clinique enregistré.',
    sw: 'MamaAlert: Asante. Imewekwa kliniki.',
    ar: 'MamaAlert: شكرًا. تم التحديث.',
    pt: 'MamaAlert: Obrigado. Estado na clínica registado.',
  }
  return truncateSms(pickLang(lang, table))
}

/** Final wave: coordinator must call patient and arrange transport (human action). */
export function buildCoordinatorWave3ActionSMS(
  patient: Patient,
  alertId: string,
  patientPhone: string,
  lang: string = 'en',
): string {
  const shortId = alertId.slice(0, 8)
  const phone = patientPhone.trim()
  const table: Record<string, string> = {
    en: `WAVE3 ${shortId}: Call patient now: ${phone}. Arrange ambulance. ${patient.name}.`,
    hi: `WAVE3 ${shortId}: अभी कॉल करें ${phone}। एम्बुलेंस। ${patient.name}`,
    fr: `WAVE3 ${shortId}: Appelez ${phone}. Ambulance. ${patient.name}.`,
    sw: `WAVE3 ${shortId}: Piga ${phone}. Ambulance. ${patient.name}.`,
    ar: `WAVE3 ${shortId}: اتصل ${phone}. إسعاف. ${patient.name}.`,
    pt: `WAVE3 ${shortId}: Ligue ${phone}. Ambulância. ${patient.name}.`,
  }
  return truncateSmsTwoPart(pickLang(lang, table))
}

export function buildCoordinatorEscalationSMS(
  patient: Patient,
  alertId: string,
  minutesSince: number,
  lang: string = 'en',
): string {
  const shortId = alertId.slice(0, 8)
  const table: Record<string, string> = {
    en: `UNRESPONDED ALERT — ${minutesSince} min, no volunteer. ${patient.name}. Ref ${shortId}`,
    hi: `ESCALATE ${shortId}: ${patient.name}, ${minutesSince} मिनट।`,
    fr: `ESCALADE ${shortId}: ${patient.name}, ${minutesSince} min.`,
    sw: `ESCALATE ${shortId}: ${patient.name}, ${minutesSince}m.`,
    ar: `تصعيد ${shortId}: ${patient.name}، ${minutesSince} د.`,
    pt: `ESCALAR ${shortId}: ${patient.name}, ${minutesSince}m.`,
  }
  return truncateSms(pickLang(lang, table))
}
