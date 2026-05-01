import type { Prisma } from '@prisma/client'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { getRequestId } from '@/lib/requestContext'

type JsonObject = Record<string, unknown>

export async function recordAlertEvent(input: {
  alertId: string
  eventType: string
  actorType?: string | null
  actorId?: string | null
  channel?: string | null
  metadata?: JsonObject
  requestId?: string | null
}): Promise<void> {
  try {
    await prisma.alertEvent.create({
      data: {
        alertId: input.alertId,
        eventType: input.eventType,
        actorType: input.actorType ?? null,
        actorId: input.actorId ?? null,
        channel: input.channel ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        requestId: input.requestId ?? getRequestId() ?? null,
      },
    })
  } catch (err) {
    logError('observability: alert event insert failed', { error: String(err), alertId: input.alertId })
  }
}

export async function recordOutboundMessage(input: {
  alertId?: string | null
  recipient: string
  provider: string
  channel: 'sms' | 'voice'
  bodyPreview?: string
  providerMessageId?: string | null
  status?: string
  error?: string | null
  requestId?: string | null
}): Promise<void> {
  try {
    await prisma.outboundMessage.create({
      data: {
        alertId: input.alertId ?? null,
        recipient: input.recipient,
        provider: input.provider,
        providerMessageId: input.providerMessageId ?? null,
        channel: input.channel,
        status: input.status ?? 'queued',
        error: input.error ?? null,
        requestId: input.requestId ?? getRequestId() ?? null,
        metadata: (input.bodyPreview ? { bodyPreview: input.bodyPreview } : {}) as Prisma.InputJsonValue,
        statusUpdatedAt: new Date(),
      },
    })
  } catch (err) {
    logError('observability: outbound message insert failed', { error: String(err), recipient: input.recipient })
  }
}

export async function markOutboundMessageStatus(input: {
  providerMessageId: string
  status: string
  error?: string | null
  metadata?: JsonObject
}): Promise<void> {
  try {
    await prisma.outboundMessage.updateMany({
      where: { providerMessageId: input.providerMessageId },
      data: {
        status: input.status,
        error: input.error ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        statusUpdatedAt: new Date(),
      },
    })
  } catch (err) {
    logError('observability: outbound message status update failed', {
      error: String(err),
      providerMessageId: input.providerMessageId,
    })
  }
}
