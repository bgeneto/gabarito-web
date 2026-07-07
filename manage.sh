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
  echo "  prod-reset-db Remove o volume do banco e faz deploy limpo (apaga dados da API)"
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
    mkdir -p data/dev
    # --renew-anon-volumes: repopulate node_modules from the image so ownership
    # matches USER node (fixes Vite EACCES on node_modules/.vite after fresh clone).
    docker compose -f docker-compose.dev.yml up --build -d --renew-anon-volumes
    echo "====================================="
    echo "Ambiente rodando!"
    echo "Vite Frontend: http://localhost:5173"
    echo "Hono Backend:  http://localhost:3000"
    ;;
  dev-stop)
    echo "Parando Docker Compose (Desenvolvimento)..."
    docker compose -f docker-compose.dev.yml down
    ;;
  prod-start)
    echo "=== INICIANDO DEPLOY DE PRODUÇÃO ==="
    echo "1. Preparando diretórios locais..."
    mkdir -p frontend/dist data/prod
    echo "2. Gerando build estático do frontend..."
    docker compose build gabarito-frontend-build
    docker compose run --rm gabarito-frontend-build
    if [ ! -f frontend/dist/index.html ]; then
      echo "Erro: frontend/dist/index.html não foi gerado. Verifique os logs do build acima."
      exit 1
    fi
    echo "3. Iniciando migrações do banco e API via Docker Compose..."
    docker compose up --build -d gabarito-api
    echo "====================================="
    echo "Deploy de produção realizado com sucesso via Docker!"
    echo "O frontend foi copiado para frontend/dist e deve ser servido pelo Caddy em /srv/gabarito."
    echo "A API está disponível no container gabarito-api (porta 3000) para proxy reverso."
    ;;
  prod-stop)
    echo "Parando container de produção..."
    docker compose down
    ;;
  prod-reset-db)
    echo "=== RESET DO BANCO DE PRODUÇÃO ==="
    echo "Isso apaga os arquivos em ./data/prod (banco SQLite de produção)."
    echo "Use apenas em deploy inicial ou quando o banco estiver corrompido."
    echo ""
    read -r -p "Tem certeza? Digite Y para confirmar: " confirm
    case "$confirm" in
      Y|y)
        docker compose down
        rm -f ./data/prod/gabarito.db ./data/prod/gabarito.db-* ./data/prod/*.invalid.*
        ./manage.sh prod-start
        ;;
      *)
        echo "Operação cancelada."
        exit 1
        ;;
    esac
    ;;
  format)
    echo "Formatando código com Prettier..."
    npm run format
    ;;
  db-push)
    echo "Puxando schema Drizzle..."
    DATABASE_PATH=./data/dev/gabarito.db npx drizzle-kit push --config=backend/drizzle.config.ts
    ;;
  build)
    echo "Executando build do monorepo..."
    npm run build
    ;;
  test)
    echo "Executando testes unitários do backend..."
    npm run test:unit
    UNIT_STATUS=$?
    if [ $UNIT_STATUS -ne 0 ]; then
      echo "Erro nos testes unitários. Abortando testes de integração."
      exit $UNIT_STATUS
    fi

    echo -e "\nExecutando testes de integração da API..."
    chmod +x test-api.sh

    # Tenta conectar na porta 3000. Se falhar por 'Connection refused' (exit code 7), a API está offline.
    curl -s --connect-timeout 2 http://localhost:3000/ > /dev/null 2>&1
    CURL_STATUS=$?

    if [ $CURL_STATUS -ne 7 ]; then
      echo "API ativa detectada na porta 3000. Executando testes diretamente..."
      ./test-api.sh
    else
      echo "API offline. Iniciando servidor temporário no host..."
      SUPERADMIN_TOKEN="${SUPERADMIN_TOKEN:-test_superadmin_token_for_ci}" npm --prefix backend run dev > /dev/null 2>&1 &
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
