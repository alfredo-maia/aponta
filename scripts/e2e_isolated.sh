#!/usr/bin/env bash
# E2E local isolado por execução, para checkouts de agentes que rodam em paralelo na mesma máquina.
#
# Cada execução ganha um identificador, um Postgres descartável próprio e portas livres
# próprias para API e web. A limpeza remove só o que tem o rótulo desta execução; nunca
# toca em outra execução, em staging ou em produção. No GitHub Actions isso não é
# necessário: cada job roda numa máquina própria, com o Postgres do próprio job.
#
# Uma execução por checkout: duas no mesmo checkout disputam o diretório de build da API e
# a segunda não sobe. Checkouts diferentes rodam ao mesmo tempo sem interferência. A porta do
# inspetor do Node (9229) continua fixa; a execução que não a obtém só registra um aviso.
#
# Uso: scripts/e2e_isolated.sh [argumentos extras do Playwright]
set -euo pipefail

cd "$(dirname "$0")/.."
RUN_ID="${APONTA_E2E_RUN_ID:-$(date +%s)-$$-$RANDOM}"
CONTAINER="aponta-e2e-$RUN_ID"
LABEL="aponta.e2e.run=$RUN_ID"

free_port() {
  python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()'
}

cleanup() {
  # Só containers com o rótulo desta execução.
  ids=$(docker ps -aq --filter "label=$LABEL")
  [ -z "$ids" ] || docker rm -f -v $ids >/dev/null
}
trap cleanup EXIT

DB_PORT=$(free_port)
export E2E_API_PORT=$(free_port)
export E2E_WEB_PORT=$(free_port)

docker run -d --name "$CONTAINER" --label "$LABEL" \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aponta \
  -p "127.0.0.1:$DB_PORT:5432" --tmpfs /var/lib/postgresql/data postgres:16-alpine >/dev/null

for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:$DB_PORT/aponta?schema=public"
export JWT_SECRET="e2e-$RUN_ID"
export NODE_ENV=development
export E2E_TESTING=true
# CI=true faz o Playwright subir API e web próprias nas portas acima, em vez de
# reaproveitar um servidor que outro checkout tenha deixado no ar.
export CI=true

echo "E2E isolado $RUN_ID: banco 127.0.0.1:$DB_PORT, API $E2E_API_PORT, web $E2E_WEB_PORT"
pnpm exec nx run api:prisma-generate
pnpm exec nx run api:prisma-migrate-deploy
pnpm exec nx run api:prisma-seed
pnpm exec nx run web-e2e:e2e --skip-nx-cache "$@"
