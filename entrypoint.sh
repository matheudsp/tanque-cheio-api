#!/bin/sh

# O 'depends_on' no docker-compose garante que o postgres está de pé,
# mas uma pequena espera pode ajudar a garantir que ele esteja 100% pronto para aceitar conexões.
echo "Waiting for database..."
sleep 5

# Executa o script de seed de PRODUÇÃO
echo "Running database seed..."
pnpm run seed:prod

# Inicia a aplicação principal
echo "Starting application..."
exec "$@"