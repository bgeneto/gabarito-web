#!/bin/bash

# GabaritoWEB - Script de Gerenciamento

function show_help() {
  echo "Uso: ./manage.sh [comando]"
  echo ""
  echo "Comandos de Desenvolvimento:"
  echo "  dev-start     Inicia o ambiente de desenvolvimento via Docker Compose (em segundo plano -d)"
  echo "  dev-stop      Para e remove os containers de desenvolvimento"
  echo ""
  echo "Comandos de Produção:"
  echo "  prod-start    Gera o build do frontend, aplica alterações no banco de dados e inicia a API de produção"
  echo "  prod-stop     Para o container da API de produção"
  echo ""
  echo "Utilitários:"
  echo "  format        Formata o código-fonte de todo o projeto usando Prettier"
  echo "  db-push       Aplica as alterações do schema TypeScript diretamente no banco SQLite"
  echo "  build         Roda o build geral do monorepo localmente (backend + frontend)"
  echo "  test          Roda os testes de integração de API (usa a instância ativa ou sobe uma temporária)"
}

case "$1" in
  dev-start)
    echo "Iniciando Docker Compose (Desenvolvimento em segundo plano)..."
    docker compose up --build -d
    echo "====================================="
    echo "Ambiente rodando!"
    echo "Vite Frontend: http://localhost:5173"
    echo "Hono Backend:  http://localhost:3000"
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
  format)
    echo "Formatando código com Prettier..."
    npm run format
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
    chmod +x test-api.sh
    
    # Tenta conectar na porta 3000. Se falhar por 'Connection refused' (exit code 7), a API está offline.
    curl -s --connect-timeout 2 http://localhost:3000/ > /dev/null 2>&1
    CURL_STATUS=$?
    
    if [ $CURL_STATUS -ne 7 ]; then
      echo "API ativa detectada na porta 3000. Executando testes diretamente..."
      ./test-api.sh
    else
      echo "API offline. Iniciando servidor temporário no host..."
      npm --prefix backend run dev > /dev/null 2>&1 &
      API_PID=$!
      sleep 3
      ./test-api.sh
      kill $API_PID
    fi
    ;;
  *)
    show_help
    ;;
esac
