import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido.').max(254),
  password: z.string().min(1, 'Informe a senha.').max(200),
})

export type LoginInput = z.infer<typeof loginSchema>
