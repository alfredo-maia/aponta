#!/bin/bash
# Script de backup automático disparado via cron
# Executa como root (ou usuário com privilégio Docker) no VPS

set -e

BACKUP_DIR="/home/hermes/backups/aponta"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="aponta_prod_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Iniciando backup do Aponta (Produção)..."
# Executa dentro do container de produção e comrpime a saída
docker exec aponta-prod-postgres-1 pg_dump -U postgres aponta | gzip > "$BACKUP_DIR/$FILENAME"

echo "Backup salvo em $BACKUP_DIR/$FILENAME."

# Rotacionar backups antigos (mantém últimos 7 dias)
echo "Removendo backups com mais de 7 dias:"
find "$BACKUP_DIR" -type f -name "aponta_prod_*.sql.gz" -mtime +7 -print -delete

echo "Concluído!"
