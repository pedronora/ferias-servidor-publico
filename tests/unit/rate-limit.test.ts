import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRateLimits,
  consumeRateLimit,
  resetRateLimit,
} from '../../server/utils/rate-limit'

describe('rate limit de login', () => {
  beforeEach(() => {
    clearRateLimits()
  })

  it('permite até o limite e bloqueia a próxima tentativa', () => {
    const first = consumeRateLimit('login:1', 2, 60_000, 1_000)
    const second = consumeRateLimit('login:1', 2, 60_000, 2_000)
    const third = consumeRateLimit('login:1', 2, 60_000, 3_000)

    expect(first).toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 60 })
    expect(second).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 59 })
    expect(third).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 58 })
  })

  it('libera novamente depois da janela', () => {
    consumeRateLimit('login:2', 1, 10_000, 1_000)
    const blocked = consumeRateLimit('login:2', 1, 10_000, 5_000)
    const afterWindow = consumeRateLimit('login:2', 1, 10_000, 11_000)

    expect(blocked.allowed).toBe(false)
    expect(afterWindow).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 10 })
  })

  it('remove o bucket ao resetar uma chave', () => {
    consumeRateLimit('login:3', 1, 60_000, 1_000)
    expect(consumeRateLimit('login:3', 1, 60_000, 2_000).allowed).toBe(false)

    resetRateLimit('login:3')

    expect(consumeRateLimit('login:3', 1, 60_000, 3_000).allowed).toBe(true)
  })

  it('mantém chaves diferentes independentes', () => {
    consumeRateLimit('login:4', 1, 60_000, 1_000)

    expect(consumeRateLimit('login:4', 1, 60_000, 2_000).allowed).toBe(false)
    expect(consumeRateLimit('login:5', 1, 60_000, 2_000).allowed).toBe(true)
  })
})
