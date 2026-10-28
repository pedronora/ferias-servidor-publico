# AGENTS.md

Instruções para agentes de código que trabalham neste repositório.

## Visão geral

Sistema web de marcação de férias para servidores públicos. A aplicação usa Nuxt 4 com SSR, Vue 3, Tailwind CSS 4, PostgreSQL 18, Drizzle ORM e Vitest/Playwright.

## Requisitos

- Node.js 24.19.0 (`.nvmrc`)
- pnpm 11.22.0
- Docker e Docker Compose
- PostgreSQL 18 para desenvolvimento local ou containers do projeto

## Comandos

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env

pnpm dev
pnpm build
pnpm start

pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test:unit
pnpm test:nuxt
pnpm test:coverage
pnpm test:integration
pnpm test:e2e

pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

- `pnpm lint` usa ESLint com `--max-warnings 0`. Não use Prettier, Biome ou dprint.
- Rode `pnpm lint` e `pnpm typecheck` antes de concluir qualquer alteração.
- Para mudanças de comportamento, rode a suíte relevante: unit/nuxt, integração e E2E.
- `pnpm test:integration` exige o banco de teste em `localhost:5433`:

```bash
docker compose -f docker-compose.test.yml up -d
pnpm test:integration
docker compose -f docker-compose.test.yml down -v
```

- O E2E sobe e derruba a stack isolada. Se as portas padrão estiverem ocupadas:

```bash
APP_PORT=3100 POSTGRES_PORT=5434 \
NUXT_PUBLIC_APP_URL=http://localhost:3100 \
E2E_BASE_URL=http://localhost:3100 \
pnpm test:e2e
```

## Estrutura

```text
app/       páginas, layouts, componentes, composables e middleware Nuxt
server/    API Nitro, autenticação, sessões e acesso ao banco
shared/    schemas Zod, regras puras de férias, tipos e utilitários
drizzle/   schema e migrations SQL
tests/     unitários, componentes, integração e E2E
scripts/   migrations, seed, entrypoint e automação
docs/      documentação operacional
```

## Regras de negócio

- Cada servidor tem 30 dias de férias por ciclo.
- São permitidos no máximo 3 períodos.
- Cada período deve ter pelo menos 1 dia.
- Deve haver pelo menos 15 dias livres entre períodos.
- Períodos não podem se sobrepor nem sair do ciclo configurado.
- O ciclo atual é definido em `settings`; não hardcode datas de ciclo.
- O status interno `confirmed` representa um pedido submetido, não férias aprovadas. Na interface, o badge correspondente é `Solicitado`.
- A análise/aprovação acontece fora do sistema.
- Regras puras ficam em `shared/rules/vacation.ts` e devem ser reutilizadas no cliente e no servidor.
- O servidor sempre revalida regras de negócio, mesmo que a interface já valide.

## Convenções de código

- TypeScript em todo o projeto; evite `any` sem justificativa.
- Componentes Vue usam `<script setup lang="ts">`.
- Siga o estilo e a estrutura dos arquivos vizinhos antes de criar novos padrões.
- Não adicione comentários no código, salvo quando forem realmente necessários para explicar uma decisão não óbvia.
- Textos da interface são em português do Brasil.
- Datas exibidas ao usuário usam `DD/MM/AAAA`; no banco e na API use ISO `YYYY-MM-DD`.
- Validação de entrada usa Zod em `shared/schemas`.
- Erros da API devem seguir o formato estruturado existente e ser normalizados no cliente.
- Use Tailwind e os componentes existentes; não introduza bibliotecas de UI sem necessidade.
- O `VueDatePicker` usa `formats`/`textInput` para `dd/MM/yyyy`, `partialRange: false` e `ariaLabels` para manter o label acessível.

## Testes

- TDD quando possível: reproduza o bug com teste antes da correção.
- Testes devem ser determinísticos: controle relógio/fuso e evite dependência de ordem.
- A suíte unitária roda em `TZ=UTC` e `TZ=America/Sao_Paulo` no CI.
- Cobertura mínima global: 80%. Em `shared/rules`: 100% de linhas e ramos.
- Páginas e fluxos críticos são cobertos por E2E.
- Não remova testes para fazer a suíte passar; ajuste o comportamento ou o teste com justificativa.

## Banco e migrations

- O schema Drizzle fica em `server/database/schema.ts`.
- Gere migrations com `pnpm db:generate` e aplique com `pnpm db:migrate`.
- Nunca edite uma migration já aplicada em produção; crie uma nova.
- O seed é idempotente e cria o admin a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- `SEED_DEMO_DATA=true` cria Maria, João e Ana para demonstração.
- O login do servidor é apenas por e-mail; não reintroduza senha de servidor.

## Segurança

- Nunca commite `.env`, segredos, tokens ou credenciais reais.
- Sessões usam cookies `httpOnly` selados, separados para servidor e admin.
- Rotas de escrita exigem validação de `Origin`/`Sec-Fetch-Site`.
- Mantenha rate limit no login e mensagens genéricas para reduzir enumeração.
- Senhas de admin usam Argon2id.
- Valide e autorize novamente no servidor; nunca confie apenas no cliente.

## Git e PR

- `main` é protegida. Trabalhe em branches curtas:
  - `feature/nome-curto`
  - `fix/nome-curto`
  - `chore/nome-curto`
  - `docs/nome-curto`
- Use Conventional Commits: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`.
- Abra PR para `main`; o merge é por squash.
- O status obrigatório da `main` é `ci-success`.
- Não faça force push nem delete a `main`.
- Mantenha o PR pequeno, com evidências dos testes executados.

## Checklist antes de concluir

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. `pnpm test:nuxt`
5. `pnpm test:integration` quando houver mudança de servidor/banco
6. `pnpm test:e2e` quando houver mudança de fluxo/interface
7. Revisar `git status` e garantir que nenhum segredo ou artefato foi incluído
