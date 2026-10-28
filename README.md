# Férias do Servidor

Sistema web de marcação de férias para o serviço público, com Nuxt 4 SSR, PostgreSQL 18, Drizzle ORM e validação imediata das regras.

## Requisitos

- Node.js 24.19.0 (veja `.nvmrc`)
- pnpm 11.22.0
- Docker e Docker Compose

## Instalação local

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
```

O `DATABASE_URL` do `.env.example` aponta para o banco de desenvolvimento na porta 5432. Para os testes de integração, o banco isolado usa a porta 5433.

## Subir tudo com Docker

```bash
docker compose up --build
```

A aplicação fica em `http://localhost:3000`. O banco PostgreSQL 18 usa volume nomeado e o app só inicia depois que o banco está saudável. O healthcheck está em `/api/health`.

Se a porta 5432 já estiver ocupada por outro PostgreSQL local, use outra porta de host:

```bash
POSTGRES_PORT=5434 docker compose up --build
```

A conexão interna do app com o banco continua em `db:5432`; apenas a porta publicada no host muda.

Para desenvolvimento com hot reload:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Se a 5432 estiver ocupada, use `POSTGRES_PORT=5434 docker compose -f docker-compose.dev.yml up --build`.

Para parar:

```bash
docker compose down
```

Para resetar o banco de desenvolvimento:

```bash
docker compose down -v
```

Para ver logs:

```bash
docker compose logs -f app
docker compose logs -f db
```

## Banco isolado para testes

```bash
docker compose -f docker-compose.test.yml up -d
pnpm test:integration
docker compose -f docker-compose.test.yml down -v
```

O banco de teste fica em `localhost:5433`, com database `ferias_test`. O compose de teste usa o projeto `ferias-test` e o E2E usa `ferias-e2e`, isolados do ambiente de desenvolvimento.

Para E2E, instale o navegador uma vez e rode o script, que sobe a stack, aguarda o healthcheck e derruba tudo ao final:

```bash
pnpm exec playwright install chromium
POSTGRES_PORT=5434 pnpm test:e2e
```

Use `POSTGRES_PORT=5434` apenas se a 5432 estiver ocupada no host. Se a porta 3000 também estiver em uso pelo ambiente de desenvolvimento, rode o E2E em portas isoladas:

```bash
APP_PORT=3100 POSTGRES_PORT=5434 \
NUXT_PUBLIC_APP_URL=http://localhost:3100 \
E2E_BASE_URL=http://localhost:3100 \
pnpm test:e2e
```

## Admin inicial

O admin é criado de forma idempotente pelo seed, usando:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Em produção, troque os valores do `.env` antes da primeira subida. O seed não redefine a senha de um admin existente.

Com `SEED_DEMO_DATA=true`, o seed também cria três servidores de demonstração (`maria@example.com`, `joao@example.com` e `ana@example.com`), todos com a senha `servidor123`. Maria e João têm três períodos confirmados; Ana tem um rascunho.

## Modelo de dados e regras

- `settings`: linha única com o ciclo, total de dias, máximo de períodos, mínimo por período e intervalo mínimo.
- `employees`: servidores, com e-mail único sem diferenciar maiúsculas e exclusão lógica por `is_active`.
- `admins`: administradores, separados dos servidores.
- `vacation_periods`: períodos com data inicial/final, status, override administrativo e justificativa.
- O PostgreSQL impede fim anterior ao início, status inválido, sobreposição para o mesmo servidor (`EXCLUDE USING gist` com `btree_gist`) e justificativa ausente em override.
- As regras puras ficam em `shared/rules/vacation.ts` e são reutilizadas pelo servidor e pela interface.

## API

Endpoints principais:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`: sessão do servidor.
- `GET /api/me/schedule`, `PUT /api/me/schedule`: consulta e salva a agenda em rascunho.
- `POST /api/me/schedule/confirm`: confirma a agenda com exatamente 30 dias.
- `POST /api/admin/auth/login`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/session`: sessão do admin.
- `GET /api/admin/employees`: lista e busca servidores.
- `GET /api/admin/employees/:id`: detalhe da agenda de um servidor.
- `PUT /api/admin/employees/:id/schedule`: substitui a agenda inteira, com override opcional.
- `GET /api/admin/report`: relatório consolidado com coincidências.

As rotas de escrita exigem `Origin` compatível com `NUXT_PUBLIC_APP_URL` (ou `Sec-Fetch-Site` confiável). As sessões ficam em cookies selados `httpOnly`, separados para servidor e admin, com validade de 8 horas.

## Interface

- `/login` e `/agenda`: autenticação do servidor, montagem dos períodos, salvamento de rascunho e confirmação da agenda.
- `/admin/login`, `/admin` e `/admin/servidores/:id`: autenticação administrativa, busca de servidores e edição da agenda com override justificado.
- `/admin/relatorio`: consolidado por servidor, coincidências de férias, impressão e exportação CSV.
- As páginas protegidas usam middleware de sessão; a raiz redireciona para `/agenda` ou `/login` conforme a autenticação.
- A interface reutiliza as mesmas regras de `shared/rules` e trata os erros estruturados da API.

## Scripts

```bash
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

## Qualidade

- ESLint 10 com flat config e ESLint Stylistic é a única ferramenta de lint/formatação.
- Não há Prettier, Biome ou dprint.
- `pnpm lint` roda com `--max-warnings 0`.
- Cobertura mínima global: 80%.
- Cobertura mínima em `shared/rules`: 100% de linhas e ramos.
- Páginas e layouts são validados pelos testes E2E; a cobertura automatizada de unidade/componentes foca regras, schemas, utilitários, composables, middleware e componentes.
- Testes unitários rodam em `TZ=UTC` e `TZ=America/Sao_Paulo`.

## CI/CD

- `.github/workflows/ci.yml`: lint, tipos, testes unitários em matriz de fuso, integração com PostgreSQL 18, build da imagem, E2E, commitlint, dependency review e o agregador `ci-success`.
- `.github/workflows/cd.yml`: reutiliza o CI, publica a imagem no GHCR com tags `sha-<commit>`, `latest` e semver, gera provenance/SBOM e executa Trivy. O deploy é opcional e controlado por `DEPLOY_ENABLED`.
- O único status obrigatório da `main` é `ci-success`.

## Fluxo de contribuição

Branches curtas a partir da `main`, TDD em red → green → refactor, PR com template, squash merge e Conventional Commits. Veja `CONTRIBUTING.md`.

## Estrutura

```text
app/       interface Nuxt
shared/    regras e schemas compartilhados
server/    API Nitro e acesso ao banco
drizzle/   migrations SQL
tests/     unitários, componentes, integração e E2E
scripts/   migrations, seed, entrypoint e automação
docs/      documentação operacional
```

## Segurança

- Sessões em cookies `httpOnly` selados, separados para servidor e admin.
- Senha do admin com Argon2id.
- Rate limit no login.
- Mensagem genérica no login para reduzir enumeração de e-mails.
- Validação Zod e regras de negócio novamente no servidor.
- CSRF por `Origin`/`Sec-Fetch-Site` e SameSite.
- Constraints de integridade no PostgreSQL, incluindo exclusion constraint com `btree_gist`.
- Nenhum segredo deve ser commitado.

## Estado da entrega

Todas as etapas estão implementadas: fundação e CI/CD, modelo de dados e regras, API e autenticação, telas do servidor e área administrativa com relatório. A suíte cobre regras, schemas, componentes, composables, middleware, integração com PostgreSQL e fluxos E2E de servidor e admin. Consulte o histórico de commits e os PRs para acompanhar cada etapa.
