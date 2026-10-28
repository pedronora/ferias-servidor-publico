import { z } from 'zod'

const nameSchema = z.string().trim().min(1, 'Informe o nome.').max(200)
const emailSchema = z.string().trim().email('E-mail inválido.').max(254)

export const createEmployeeSchema = z.object({
  name: nameSchema,
  email: emailSchema,
})

export const updateEmployeeSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  isActive: z.boolean().optional(),
}).refine(
  data => data.name !== undefined || data.email !== undefined || data.isActive !== undefined,
  { message: 'Informe ao menos um campo para atualizar.' },
)

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
