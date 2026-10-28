# Proteção da branch main

## Regras

- Pull Request obrigatório para a `main`.
- Mínimo de 1 aprovação.
- Revisão de code owners obrigatória.
- Status check obrigatório: `ci-success`.
- Branch atualizada antes do merge.
- Conversas resolvidas antes do merge.
- Histórico linear (squash merge).
- Push direto, force push e exclusão da `main` bloqueados.
- Regras aplicadas também a administradores.
- Exclusão automática da branch após o merge.

O job `ci-success` é o único check obrigatório. Ele agrega lint, tipos, testes unitários, integração, build da imagem, E2E, commitlint e dependency review. Assim, novos jobs podem ser adicionados sem reconfigurar a proteção.

## Aplicação

Pré-requisitos:

- `gh` autenticado com permissão de administrador no repositório.
- Pelo menos uma execução do workflow de CI concluída, para que o check `ci-success` exista.
- `CODEOWNERS` com o usuário/time real no lugar do placeholder.

Execute:

```bash
./scripts/setup-branch-protection.sh
```

O script usa `gh api` para configurar a proteção e `gh repo edit` para ativar a exclusão automática da branch.

## Ruleset alternativo

Se a organização usar Rulesets, crie um ruleset para `main` com:

- require pull request
- required approvals: 1
- require code owner review
- required status check: `ci-success`
- require branch up to date
- require conversation resolution
- block force pushes
- block deletions
- block direct pushes, inclusive para admins
- linear history

## Observações

- O check `ci-success` só aparece depois da primeira execução do CI.
- O `dependency-review` e o `commitlint` são pulados em push direto na `main`; o agregador permite essa exceção apenas para esses dois jobs.
- Em repositórios privados, o dependency review pode exigir GitHub Advanced Security.
