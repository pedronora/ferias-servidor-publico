import { z } from 'zod'

const emailSchema = z.string().trim().email('E-mail inválido.').max(254)

export const employeeLoginSchema = z.object({
  email: emailSchema,
})

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.').max(200),
})

export type EmployeeLoginInput = z.infer<typeof employeeLoginSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
