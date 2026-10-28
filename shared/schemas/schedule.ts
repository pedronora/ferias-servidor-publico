import { z } from 'zod'

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')

export const periodInputSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
})

export const scheduleInputSchema = z.object({
  periods: z.array(periodInputSchema).max(20),
})

export const adminScheduleInputSchema = z.object({
  periods: z.array(periodInputSchema).max(20),
  override: z.boolean().optional().default(false),
  overrideReason: z.string().trim().max(500).optional(),
  confirm: z.boolean().optional().default(false),
}).superRefine((data, context) => {
  if (data.override && !data.overrideReason) {
    context.addIssue({
      code: 'custom',
      path: ['overrideReason'],
      message: 'Informe a justificativa do override.',
    })
  }
})

export type PeriodInput = z.infer<typeof periodInputSchema>
export type ScheduleInput = z.infer<typeof scheduleInputSchema>
export type AdminScheduleInput = z.infer<typeof adminScheduleInputSchema>
