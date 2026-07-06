#!/bin/bash

# GabaritoWEB - Script de Gerenciamento

function show_help() {
  echo "Uso: ./manage.sh [comando]"
  echo ""
  echo "Comandos de Desenvolvimento:"
  echo "  dev-start     Inicia o ambiente de desenvolvimento via Docker Compose (com hot-reload)"
  echo "  dev-stop      Para e remove os containers de desenvolvimento"
  echo ""
  echo "Comandos de Produção:"
  echo "  prod-start    Gera o build do frontend, aplica alterações no banco de dados e inicia a API de produção"
  echo "  prod-stop     Para o container da API de produção"
  echo ""
  echo "Utilitários:"
  echo "  db-push       Aplica as alterações do schema TypeScript diretamente no banco SQLite"
  echo "  build         Roda o build geral do monorepo localmente (backend + frontend)"
  echo "  test          Roda os testes de integração de API (sobe a API e executa o curl)"
}

case "$1" in
  dev-start)
    echo "Iniciando Docker Compose (Desenvolvimento)..."
    docker compose up --build
    ;;
  dev-stop)
    echo "Parando Docker Compose (Desenvolvimento)..."
    docker compose down
    ;;
  prod-start)
    echo "=== INICIANDO DEPLOY DE PRODUÇÃO ==="
    echo "1. Gerando build estático do frontend no host..."
    npm run build:frontend
    echo "2. Atualizando banco de dados SQLite via Drizzle Kit..."
    npx drizzle-kit push --config=backend/drizzle.config.ts
    echo "3. Iniciando container de produção da API (gabarito-api)..."
    docker compose -f docker-compose.prod.yml up --build -d
    echo "====================================="
    echo "Deploy realizado com sucesso!"
    echo "Lembre-se: O Caddy deve servir a pasta frontend/dist em /srv/gabarito"
    ;;
  prod-stop)
    echo "Parando container de produção..."
    docker compose -f docker-compose.prod.yml down
    ;;
  db-push)
    echo "Puxando schema Drizzle..."
    npx drizzle-kit push --config=backend/drizzle.config.ts
    ;;
  build)
    echo "Executando build do monorepo..."
    npm run build
    ;;
  test)
    echo "Executando testes de integração da API..."
    # Inicia a API temporariamente em segundo plano
    npm --prefix backend run dev &
    API_PID=$!
    # Aguarda a inicialização
    sleep 3
    chmod +x test-api.sh
    ./test-api.sh
    # Derruba o servidor temporário
    kill $API_PID
    ;;
  *)
    show_help
    ;;
esac
