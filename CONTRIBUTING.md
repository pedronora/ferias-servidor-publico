# Contribuição

## Fluxo

1. Atualize a `main`.
2. Crie uma branch curta a partir dela:
   - `feature/nome-curto`
   - `fix/nome-curto`
   - `chore/nome-curto`
   - `docs/nome-curto`
3. Trabalhe em ciclos TDD: red → green → refactor.
4. Abra um Pull Request para a `main`.
5. O merge é feito por squash, com título em Conventional Commits.
6. A branch é removida após o merge.

## TDD

- Nenhum código de produção sem um teste falhando antes.
- Para bug, primeiro um teste que reproduz o defeito.
- Commits devem separar, quando possível:
  - `test:` teste que falha
  - `feat:`/`fix:` implementação mínima
  - `refactor:` melhoria com testes verdes
- Testes devem ser determinísticos: relógio controlado, sem dependência de ordem, sem dados compartilhados.
- A suíte unitária roda em `TZ=UTC` e `TZ=America/Sao_Paulo`.

## Qualidade

- ESLint é a única ferramenta de lint e formatação. Não use Prettier, Biome ou dprint.
- `pnpm lint` precisa passar com `--max-warnings 0`.
- `pnpm typecheck` precisa passar.
- Cobertura mínima: 80% global e 100% em `shared/rules`.
- Componentes e telas devem ter labels, foco visível, navegação por teclado e mensagens com `aria-live`.

## Commits

Formato:

```text
tipo(escopo opcional): descrição curta no imperativo
```

Tipos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`.

## Pull Requests

- Use o template.
- Mantenha o PR pequeno e revisável.
- Inclua evidências de testes.
- O status obrigatório da `main` é `ci-success`.
