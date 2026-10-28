# Deploy no TrueNAS

Runbook de produção no TrueNAS SCALE 25.10.7, com imagem do GHCR e Cloudflare Tunnel.

## Arquitetura

```text
Internet
  -> Cloudflare Access (ferias.nora.vc)
  -> Cloudflare Tunnel
  -> cloudflared existente
  -> http://IP_DO_TRUENAS:3030
  -> app:3000
  -> db:5432
```

O `cloudflared` não faz parte deste compose. Ele já existe no TrueNAS e deve apontar para a porta publicada pelo app.

## Pré-requisitos

- Imagem pública no GHCR.
- Datasets `hdd-pool/ferias` e `hdd-pool/backup/ferias`.
- Porta `3030` livre no host.
- Cloudflare Access ativo para `ferias.nora.vc`.
- Acesso ao shell do TrueNAS com `sudo`.

Confira a imagem sem credenciais:

```bash
docker manifest inspect ghcr.io/pedronora/ferias-servidor-publico:latest
```

O comando deve terminar com sucesso. Se retornar `401` ou `unauthorized`, o pacote ainda está privado.

## 1. Criar os datasets

No TrueNAS, em **Datasets**, crie:

```text
hdd-pool/ferias
hdd-pool/backup
hdd-pool/backup/ferias
```

Use datasets ZFS, não diretórios criados com `mkdir`.

## 2. Criar o `.env`

No shell do TrueNAS:

```bash
sudo install -m 600 /dev/null /mnt/hdd-pool/ferias/.env
```

Gere os segredos:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use o primeiro valor em `POSTGRES_PASSWORD` e no `DATABASE_URL`. Use o segundo em `NUXT_SESSION_SECRET`.

Edite `/mnt/hdd-pool/ferias/.env` com o editor disponível (`nano` ou `vi`):

```env
POSTGRES_USER=ferias
POSTGRES_PASSWORD=COLE_A_SENHA_HEX
POSTGRES_DB=ferias
DATABASE_URL=postgresql://ferias:COLE_A_SENHA_HEX@db:5432/ferias

NUXT_SESSION_SECRET=COLE_O_SEGREDO_HEX
NUXT_PUBLIC_APP_URL=https://ferias.nora.vc

ADMIN_EMAIL=seu-email@dominio.com
ADMIN_PASSWORD=COLE_UMA_SENHA_FORTE

RUN_MIGRATIONS=true
RUN_SEED=true
SEED_DEMO_DATA=false
TZ=America/Sao_Paulo
```

O `NUXT_PUBLIC_APP_URL` precisa ser exatamente `https://ferias.nora.vc`, sem barra no final. Ele controla a validação de `Origin` e o atributo `secure` dos cookies.

## 3. Instalar o Custom App

No TrueNAS:

1. Abra **Apps**.
2. Vá em **Discover**.
3. Escolha **Custom App**.
4. Escolha **Install via YAML**.
5. Nome do app: `ferias`.
6. Cole o conteúdo de `deploy/truenas/compose.yml`.
7. Salve e aguarde o status **Running**.

O compose usa o caminho absoluto `/mnt/hdd-pool/ferias/.env` e publica `3030:3000`.

## 4. Ajustar o Cloudflare Tunnel

No painel do Cloudflare, ajuste o origin do hostname `ferias.nora.vc` para:

```text
http://IP_DO_TRUENAS:3030
```

Não use `app:3000`: o `cloudflared` existente está fora da rede Docker deste compose. O Cloudflare Access já deve estar aplicado ao hostname.

## 5. Primeira subida

Acompanhe os logs do container `app`. Na primeira execução, o entrypoint roda:

1. migrations;
2. seed do admin;
3. servidor Nuxt em `0.0.0.0:3000`.

Se o seed falhar, o app não inicia. Verifique `ADMIN_EMAIL`, `ADMIN_PASSWORD` e a conexão com o banco.

Teste o healthcheck pela rede local:

```bash
curl -fsS http://IP_DO_TRUENAS:3030/api/health
```

Acesse:

```text
https://ferias.nora.vc/admin/login
```

O admin é criado apenas na primeira execução. Alterar `ADMIN_PASSWORD` depois não redefine a senha de um admin existente.

## 6. Atualizações

O CD publica a cada push na `main`:

```text
ghcr.io/pedronora/ferias-servidor-publico:latest
ghcr.io/pedronora/ferias-servidor-publico:sha-<commit>
```

Fluxo manual:

1. Faça merge na `main` e aguarde o CD.
2. No TrueNAS, abra **Apps -> ferias -> Update**.
3. Confira os logs e o healthcheck.
4. Valide o login e as telas principais.

O `pull_policy: always` faz o app tentar baixar a `latest` ao subir. Se o botão de update não aparecer, edite e salve o app ou puxe a imagem manualmente e reinicie o container.

## 7. Rollback

Edite o app e troque a imagem para a tag anterior:

```yaml
image: ghcr.io/pedronora/ferias-servidor-publico:sha-<commit-anterior>
```

Salve e aguarde o container subir. Migrations já aplicadas não são revertidas automaticamente; se houver mudança de schema, valide a compatibilidade antes do rollback.

## 8. Backup

Crie um cron no TrueNAS:

```bash
sudo sh -c '
  docker exec $(docker ps -qf name=ferias-db) \
    pg_dump -U ferias -d ferias \
    | gzip > "/mnt/hdd-pool/backup/ferias/ferias-$(date +\%F).sql.gz"
'
```

O `\%F` é necessário em arquivos de cron. Depois, agende snapshots do dataset `hdd-pool/backup/ferias`.

Mantenha também uma cópia segura de `/mnt/hdd-pool/ferias/.env`. Sem esse arquivo, você perde a senha do banco e o segredo de sessão.

## 9. Segurança

- O login de servidor é feito apenas por e-mail, sem senha. O Cloudflare Access é a proteção real do hostname.
- Não remova a policy do Access enquanto o app estiver público.
- O admin usa senha com Argon2id.
- O Postgres não publica porta no host.
- O `.env` deve ficar com permissão `600` e nunca ser commitado.
- Não habilite `DEPLOY_ENABLED` no GitHub Actions para este deploy; a atualização é manual pelo TrueNAS.

## 10. Troubleshooting

Imagem não baixa:

- Confirme que o pacote GHCR está público.
- Teste `docker manifest inspect` no TrueNAS.

Cloudflare retorna 502:

- Confirme que o app está **Running**.
- Confirme o origin `http://IP_DO_TRUENAS:3030`.
- Teste `curl http://IP_DO_TRUENAS:3030/api/health` no host.

Erro de `Origin` ou login não persiste:

- Confirme `NUXT_PUBLIC_APP_URL=https://ferias.nora.vc`.
- Remova barras extras no final da URL.

Banco unhealthy:

- Confira `POSTGRES_*`, `DATABASE_URL` e o volume `ferias_db_data`.
- Veja os logs do container `db`.
