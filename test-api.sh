#!/bin/bash

# Porta em que o backend roda
PORT=3000
BASE_URL="http://localhost:$PORT/api"

# Verifica dependências
if ! command -v jq >/dev/null 2>&1; then
  echo "Erro: jq não está instalado. Instale-o para executar os testes de API."
  exit 1
fi

echo "=== INICIANDO TESTES DE API ==="

# Health check
echo "0. Testando health check..."
HEALTH_RESP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health")
if [ "$HEALTH_RESP" != "200" ]; then
  echo "FALHOU: health check retornou HTTP $HEALTH_RESP (esperado 200)"
  exit 1
fi
echo "OK: health check"

# 1. Testar validações ao criar prova
echo "1. Testando validações de criação de prova (deve falhar)..."

# Caso 1: Questão repetida sem subitem
RESP_DUP_NO_SUB=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/exams" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prova Inválida 1",
    "items": [
      {"question_number": 1, "sub_label": null, "points": 1, "answer_type": "choice", "answer_config": {"accepted": ["A"]}},
      {"question_number": 1, "sub_label": "", "points": 1, "answer_type": "choice", "answer_config": {"accepted": ["B"]}}
    ]
  }')

# Caso 2: Questão com subitem repetido
RESP_DUP_SUB=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/exams" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prova Inválida 2",
    "items": [
      {"question_number": 1, "sub_label": "a", "points": 1, "answer_type": "choice", "answer_config": {"accepted": ["A"]}},
      {"question_number": 1, "sub_label": "a", "points": 1, "answer_type": "choice", "answer_config": {"accepted": ["B"]}}
    ]
  }')

# Caso 3: Questão duplicada (sem subitem)
RESP_DUP_SIMPLE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/exams" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prova Inválida 3",
    "items": [
      {"question_number": 2, "sub_label": null, "points": 1, "answer_type": "choice", "answer_config": {"accepted": ["A"]}},
      {"question_number": 2, "sub_label": null, "points": 1, "answer_type": "choice", "answer_config": {"accepted": ["B"]}}
    ]
  }')

echo "HTTP Code Caso 1 (esperado 400): $RESP_DUP_NO_SUB"
echo "HTTP Code Caso 2 (esperado 400): $RESP_DUP_SUB"
echo "HTTP Code Caso 3 (esperado 400): $RESP_DUP_SIMPLE"

if [ "$RESP_DUP_NO_SUB" != "400" ] || [ "$RESP_DUP_SUB" != "400" ] || [ "$RESP_DUP_SIMPLE" != "400" ]; then
  echo "Erro: Validações de criação de prova não funcionaram como esperado."
  exit 1
fi

echo "Validações de criação de prova funcionando corretamente."

# 1. Criar Prova
echo -e "\n1. Criando prova válida..."
CREATE_RESP=$(curl -s -X POST "$BASE_URL/exams" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Física Geral I - MVP Test",
    "items": [
      {
        "question_number": 1,
        "sub_label": "a",
        "points": 2.5,
        "answer_type": "choice",
        "answer_config": {
          "accepted": ["A"]
        }
      },
      {
        "question_number": 1,
        "sub_label": "b",
        "points": 2.5,
        "answer_type": "short_text",
        "answer_config": {
          "accepted": ["massa", "peso"]
        }
      },
      {
        "question_number": 2,
        "sub_label": null,
        "points": 5.0,
        "answer_type": "true_false",
        "answer_config": {
          "accepted": ["V"]
        }
      }
    ]
  }')

echo "Resposta de criação:"
echo "$CREATE_RESP"

PUBLIC_CODE=$(echo "$CREATE_RESP" | jq -r '.public_code')
ADMIN_TOKEN=$(echo "$CREATE_RESP" | jq -r '.admin_token')

echo "Public Code: $PUBLIC_CODE"
echo "Admin Token: $ADMIN_TOKEN"

if [ -z "$PUBLIC_CODE" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "Erro: não foi possível obter os códigos de prova"
  exit 1
fi

# 2. Consultar Prova (Público)
echo -e "\n2. Consultando prova pública..."
GET_RESP=$(curl -s "$BASE_URL/exams/$PUBLIC_CODE")
echo "Resposta da consulta pública (gabarito deve estar ocultado):"
echo "$GET_RESP"

# Extrair IDs dos itens com jq
ITEM_1_ID=$(echo "$GET_RESP" | jq -r '.items[0].id')
ITEM_2_ID=$(echo "$GET_RESP" | jq -r '.items[1].id')
ITEM_3_ID=$(echo "$GET_RESP" | jq -r '.items[2].id')

echo "Item 1 ID: $ITEM_1_ID"
echo "Item 2 ID: $ITEM_2_ID"
echo "Item 3 ID: $ITEM_3_ID"

# 3. Submeter Resposta do Aluno 1 (Sucesso, nota total esperada = 10.0)
echo -e "\n3. Submetendo respostas do Aluno 1 (corretas)..."
SUB_1_RESP=$(curl -s -X POST "$BASE_URL/exams/$PUBLIC_CODE/submissions" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_name\": \"Aluno Nota Dez\",
    \"student_identifier\": \"MAT10\",
    \"answers\": {
      \"$ITEM_1_ID\": \"A\",
      \"$ITEM_2_ID\": \"  massa \",
      \"$ITEM_3_ID\": \"verdadeiro\"
    }
  }")
echo "Resposta de submissão do Aluno 1:"
echo "$SUB_1_RESP"

SUB_1_ID=$(echo "$SUB_1_RESP" | jq -r '.submission_id')
echo "Submission 1 ID: $SUB_1_ID"

# 4. Submeter Resposta do Aluno 2 (Parcial, nota total esperada = 2.5)
echo -e "\n4. Submetendo respostas do Aluno 2 (parciais/erradas)..."
SUB_2_RESP=$(curl -s -X POST "$BASE_URL/exams/$PUBLIC_CODE/submissions" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_name\": \"Aluno Parcial\",
    \"student_identifier\": \"MAT25\",
    \"answers\": {
      \"$ITEM_1_ID\": \"B\",
      \"$ITEM_2_ID\": \"peso\",
      \"$ITEM_3_ID\": \"falso\"
    }
  }")
echo "Resposta de submissão do Aluno 2:"
echo "$SUB_2_RESP"

SUB_2_ID=$(echo "$SUB_2_RESP" | jq -r '.submission_id')

# 5. Tentar submissão duplicada (deve retornar erro 409)
echo -e "\n5. Tentando submissão duplicada para Aluno 1..."
DUP_RESP=$(curl -s -X POST "$BASE_URL/exams/$PUBLIC_CODE/submissions" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_name\": \"Aluno Nota Dez\",
    \"student_identifier\": \"MAT10\",
    \"answers\": {
      \"$ITEM_1_ID\": \"A\"
    }
  }")
echo "Resposta da duplicada (deve ser 409):"
echo "$DUP_RESP"

DUP_STATUS=$(echo "$DUP_RESP" | jq -r '.error // empty')
DUP_RECEIPT=$(echo "$DUP_RESP" | jq -r '.submission_id // empty')
DUP_ALREADY=$(echo "$DUP_RESP" | jq -r '.already_submitted // empty')
if [ -n "$DUP_RECEIPT" ] && [ "$DUP_RECEIPT" != "null" ]; then
  echo "FALHOU: submissão duplicada NÃO deve retornar submission_id (PII); recebido $DUP_RECEIPT"
  exit 1
fi
if [ "$DUP_STATUS" != "Conflito" ]; then
  echo "FALHOU: submissão duplicada deve retornar erro Conflito"
  exit 1
fi
if [ "$DUP_ALREADY" != "true" ]; then
  echo "FALHOU: submissão duplicada deve retornar already_submitted=true"
  exit 1
fi
echo "OK: submissão duplicada retornou 409 sem submission_id (PII-safe)"

# 6. Consultar Nota com Prova Aberta (deve ocultar nota)
echo -e "\n6. Consultando nota do Aluno 1 com prova ABERTA..."
VAL_1_OPEN=$(curl -s "$BASE_URL/submissions/$SUB_1_ID")
echo "Resposta da nota (nota deve ser null):"
echo "$VAL_1_OPEN"

# 7. Acessar Painel do Professor (Admin)
echo -e "\n7. Acessando painel do professor (deve mostrar notas de todos)..."
ADMIN_SESSION_RESP=$(curl -s -X POST "$BASE_URL/admin/session" \
  -H "Content-Type: application/json" \
  -d "{\"admin_token\": \"$ADMIN_TOKEN\"}")
ADMIN_SESSION=$(echo "$ADMIN_SESSION_RESP" | jq -r '.session_token')
if [ -z "$ADMIN_SESSION" ] || [ "$ADMIN_SESSION" = "null" ]; then
  echo "Erro: não foi possível obter sessão administrativa"
  echo "$ADMIN_SESSION_RESP"
  exit 1
fi
ADMIN_AUTH_HEADER="Authorization: Bearer $ADMIN_SESSION"

ADMIN_RESP=$(curl -s "$BASE_URL/admin/exams" -H "$ADMIN_AUTH_HEADER")
echo "Resposta do painel do professor:"
echo "$ADMIN_RESP"

# Verificar notas iniciais no painel admin
SCORE_1_INIT=$(echo "$ADMIN_RESP" | jq '[.submissions[] | select(.student_identifier=="MAT10") | .total_score][0]')
SCORE_2_INIT=$(echo "$ADMIN_RESP" | jq '[.submissions[] | select(.student_identifier=="MAT25") | .total_score][0]')
echo "Nota inicial Aluno 1 (esperado 10.0): $SCORE_1_INIT"
echo "Nota inicial Aluno 2 (esperado 2.5): $SCORE_2_INIT"
if [ "$SCORE_1_INIT" != "10" ] && [ "$SCORE_1_INIT" != "10.0" ]; then
  echo "FALHOU: nota inicial do Aluno 1 incorreta"
  exit 1
fi
if [ "$SCORE_2_INIT" != "2.5" ]; then
  echo "FALHOU: nota inicial do Aluno 2 incorreta"
  exit 1
fi

ADMIN_MAX_SCORE=$(echo "$ADMIN_RESP" | jq -r '.max_score // empty')
ADMIN_BUCKET_COUNT=$(echo "$ADMIN_RESP" | jq '.score_distribution.buckets | length')
ADMIN_ITEM_STATS=$(echo "$ADMIN_RESP" | jq -r '.items[0].stats.correct_rate_percent // empty')
echo "max_score no painel admin: $ADMIN_MAX_SCORE"
echo "buckets de distribuição: $ADMIN_BUCKET_COUNT"
echo "taxa de acerto item 1: $ADMIN_ITEM_STATS%"
if [ -z "$ADMIN_MAX_SCORE" ] || [ "$ADMIN_MAX_SCORE" = "null" ]; then
  echo "FALHOU: painel admin sem max_score"
  exit 1
fi
if [ "$ADMIN_BUCKET_COUNT" != "5" ]; then
  echo "FALHOU: score_distribution.buckets deveria ter 5 faixas"
  exit 1
fi
if [ -z "$ADMIN_ITEM_STATS" ] || [ "$ADMIN_ITEM_STATS" = "null" ]; then
  echo "FALHOU: painel admin sem stats por item"
  exit 1
fi

ADMIN_PASS_RATE=$(echo "$ADMIN_RESP" | jq -r '.passing_stats.pass_rate_percent // empty')
ADMIN_CUTOFF=$(echo "$ADMIN_RESP" | jq -r '.passing_stats.cutoff_percent // empty')
echo "taxa de aprovação (corte 50%): $ADMIN_PASS_RATE%"
echo "corte configurado: $ADMIN_CUTOFF%"
if [ -z "$ADMIN_PASS_RATE" ] || [ "$ADMIN_PASS_RATE" = "null" ]; then
  echo "FALHOU: painel admin sem passing_stats.pass_rate_percent"
  exit 1
fi
if [ "$ADMIN_CUTOFF" != "50" ]; then
  echo "FALHOU: passing_stats.cutoff_percent deveria ser 50"
  exit 1
fi

# 7b. Editar gabarito do item 1 (choice A -> B) e recalcular notas
echo -e "\n7b. Editando gabarito do item 1 (resposta correta: B)..."
PATCH_1_RESP=$(curl -s -X PATCH "$BASE_URL/admin/exams/items/$ITEM_1_ID" \
  -H "$ADMIN_AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 2.5,
    "answer_type": "choice",
    "answer_config": { "accepted": ["B"] }
  }')
echo "Resposta do PATCH item 1:"
echo "$PATCH_1_RESP"

PATCH_1_MSG=$(echo "$PATCH_1_RESP" | jq -r '.message // empty')
if [ "$PATCH_1_MSG" != "Gabarito atualizado e notas recalculadas." ]; then
  echo "FALHOU: PATCH item 1 não retornou mensagem de sucesso"
  echo "$PATCH_1_RESP"
  exit 1
fi

ADMIN_AFTER_PATCH_1=$(curl -s "$BASE_URL/admin/exams" -H "$ADMIN_AUTH_HEADER")
SCORE_1_AFTER_PATCH=$(echo "$ADMIN_AFTER_PATCH_1" | jq '[.submissions[] | select(.student_identifier=="MAT10") | .total_score][0]')
SCORE_2_AFTER_PATCH=$(echo "$ADMIN_AFTER_PATCH_1" | jq '[.submissions[] | select(.student_identifier=="MAT25") | .total_score][0]')
echo "Nota após PATCH Aluno 1 (esperado 7.5): $SCORE_1_AFTER_PATCH"
echo "Nota após PATCH Aluno 2 (esperado 5.0): $SCORE_2_AFTER_PATCH"
if [ "$SCORE_1_AFTER_PATCH" != "7.5" ]; then
  echo "FALHOU: nota do Aluno 1 após recálculo incorreta"
  exit 1
fi
if [ "$SCORE_2_AFTER_PATCH" != "5" ] && [ "$SCORE_2_AFTER_PATCH" != "5.0" ]; then
  echo "FALHOU: nota do Aluno 2 após recálculo incorreta"
  exit 1
fi

# 7c. Alterar pontuação do item 1 (2.5 -> 1.0) e recalcular
echo -e "\n7c. Alterando pontuação do item 1 para 1.0..."
PATCH_2_RESP=$(curl -s -X PATCH "$BASE_URL/admin/exams/items/$ITEM_1_ID" \
  -H "$ADMIN_AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 1.0,
    "answer_type": "choice",
    "answer_config": { "accepted": ["B"] }
  }')
echo "Resposta do PATCH pontos:"
echo "$PATCH_2_RESP"

ADMIN_AFTER_PATCH_2=$(curl -s "$BASE_URL/admin/exams" -H "$ADMIN_AUTH_HEADER")
SCORE_2_AFTER_POINTS=$(echo "$ADMIN_AFTER_PATCH_2" | jq '[.submissions[] | select(.student_identifier=="MAT25") | .total_score][0]')
echo "Nota após alteração de pontos Aluno 2 (esperado 3.5): $SCORE_2_AFTER_POINTS"
if [ "$SCORE_2_AFTER_POINTS" != "3.5" ]; then
  echo "FALHOU: nota do Aluno 2 após alteração de pontos incorreta"
  exit 1
fi

# 7d. PATCH com token inválido (deve retornar 401)
echo -e "\n7d. Testando PATCH com token inválido..."
PATCH_BAD_TOKEN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/admin/exams/items/$ITEM_1_ID" \
  -H "Authorization: Bearer sessao_invalida" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 1.0,
    "answer_type": "choice",
    "answer_config": { "accepted": ["A"] }
  }')
echo "HTTP Code token inválido (esperado 401): $PATCH_BAD_TOKEN_HTTP"
if [ "$PATCH_BAD_TOKEN_HTTP" != "401" ]; then
  echo "FALHOU: PATCH com token inválido deveria retornar 401"
  exit 1
fi

# 7e. PATCH com accepted vazio (deve retornar 400)
echo -e "\n7e. Testando PATCH com gabarito vazio..."
PATCH_EMPTY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/admin/exams/items/$ITEM_1_ID" \
  -H "$ADMIN_AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 1.0,
    "answer_type": "choice",
    "answer_config": { "accepted": [] }
  }')
echo "HTTP Code accepted vazio (esperado 400): $PATCH_EMPTY_HTTP"
if [ "$PATCH_EMPTY_HTTP" != "400" ]; then
  echo "FALHOU: PATCH com accepted vazio deveria retornar 400"
  exit 1
fi

# 8. Encerrar Prova pelo Professor
echo -e "\n8. Encerrando prova..."
CLOSE_RESP=$(curl -s -X POST "$BASE_URL/admin/exams/close" -H "$ADMIN_AUTH_HEADER")
echo "Resposta do encerramento:"
echo "$CLOSE_RESP"

# 9. Consultar Nota com Prova Fechada (deve retornar nota detalhada)
echo -e "\n9. Consultando nota do Aluno 1 com prova FECHADA..."
VAL_1_CLOSED=$(curl -s "$BASE_URL/submissions/$SUB_1_ID")
echo "Resposta da nota (nota deve refletir recálculo, ex: 7.5):"
echo "$VAL_1_CLOSED"

STUDENT_PERCENT=$(echo "$VAL_1_CLOSED" | jq -r '.performance_context.student_percent // empty')
STUDENT_PERCENTILE=$(echo "$VAL_1_CLOSED" | jq -r '.performance_context.percentile // empty')
echo "percentual do aluno 1: $STUDENT_PERCENT%"
echo "percentil do aluno 1: $STUDENT_PERCENTILE%"
if [ -z "$STUDENT_PERCENT" ] || [ "$STUDENT_PERCENT" = "null" ]; then
  echo "FALHOU: submissão fechada sem performance_context.student_percent"
  exit 1
fi
if [ -z "$STUDENT_PERCENTILE" ] || [ "$STUDENT_PERCENTILE" = "null" ]; then
  echo "FALHOU: submissão fechada sem performance_context.percentile"
  exit 1
fi

echo -e "\n10. Consultando nota do Aluno 2 com prova FECHADA..."
VAL_2_CLOSED=$(curl -s "$BASE_URL/submissions/$SUB_2_ID")
echo "Resposta da nota (nota deve refletir recálculo, ex: 3.5):"
echo "$VAL_2_CLOSED"

# 11. Testes da área Superadmin
echo -e "\n11. Testando área Superadmin..."
SUPERADMIN_TOKEN="${SUPERADMIN_TOKEN:-test_superadmin_token_for_ci}"

# Telemetria de page view
PV_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/telemetry/pageview" \
  -H "Content-Type: application/json" \
  -d '{"path": "/prova/TEST"}')
echo "HTTP Code pageview telemetry (esperado 200): $PV_RESP"
if [ "$PV_RESP" != "200" ]; then
  echo "FALHOU: telemetry pageview"
  exit 1
fi

# Sem token de superadmin no header
SA_NO_AUTH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/superadmin/overview" \
  -H "Authorization: Bearer token_invalido_xyz")
echo "HTTP Code superadmin token inválido (esperado 401 ou 404): $SA_NO_AUTH_HTTP"
if [ "$SA_NO_AUTH_HTTP" != "401" ] && [ "$SA_NO_AUTH_HTTP" != "404" ]; then
  echo "FALHOU: superadmin deveria retornar 401 ou 404 sem token válido"
  exit 1
fi

# POST em rota superadmin deve ser 405 ou 404
SA_POST_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/superadmin/overview" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN")
echo "HTTP Code POST superadmin (esperado 405 ou 404): $SA_POST_HTTP"
if [ "$SA_POST_HTTP" != "405" ] && [ "$SA_POST_HTTP" != "404" ]; then
  echo "FALHOU: POST em superadmin deveria retornar 405 ou 404"
  exit 1
fi

# Com token válido (se feature habilitada no servidor)
SA_SESSION_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/superadmin/session" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN")
echo "HTTP Code superadmin session: $SA_SESSION_HTTP"

if [ "$SA_SESSION_HTTP" = "200" ]; then
  SA_OVERVIEW=$(curl -s "$BASE_URL/superadmin/overview" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN")
  SA_EXAMS_TOTAL=$(echo "$SA_OVERVIEW" | jq -r '.exams.total // empty')
  echo "Total de provas no overview superadmin: $SA_EXAMS_TOTAL"
  if [ -z "$SA_EXAMS_TOTAL" ]; then
    echo "FALHOU: overview superadmin sem campo exams.total"
    exit 1
  fi

  if echo "$SA_OVERVIEW" | grep -q "admin_code_hash"; then
    echo "FALHOU: overview expõe admin_code_hash"
    exit 1
  fi

  EXAM_ID=$(echo "$CREATE_RESP" | jq -r '.id')
  SA_DETAIL=$(curl -s "$BASE_URL/superadmin/exams/$EXAM_ID" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN")
  SA_DETAIL_TITLE=$(echo "$SA_DETAIL" | jq -r '.title // empty')
  if [ "$SA_DETAIL_TITLE" != "Física Geral I - MVP Test" ]; then
    echo "FALHOU: detalhe superadmin da prova"
    echo "$SA_DETAIL"
    exit 1
  fi
  echo "OK: superadmin overview e detalhe de prova"

  # Backup export
  BACKUP_FILE=$(mktemp /tmp/gabarito-backup-XXXXXX.gbr.gz)
  SA_EXPORT_HTTP=$(curl -s -o "$BACKUP_FILE" -w "%{http_code}" -X POST "$BASE_URL/superadmin/backup/export" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"exam_ids\": [\"$EXAM_ID\"]}")
  echo "HTTP Code backup export: $SA_EXPORT_HTTP"
  if [ "$SA_EXPORT_HTTP" != "200" ]; then
    echo "FALHOU: exportação de backup superadmin"
    exit 1
  fi
  BACKUP_MAGIC=$(head -c 2 "$BACKUP_FILE" | od -An -tx1 | tr -d ' \n')
  if [ "$BACKUP_MAGIC" != "1f8b" ]; then
    echo "FALHOU: arquivo de backup não é gzip válido"
    exit 1
  fi

  # Restore duplicado deve ignorar prova existente
  SA_RESTORE_RESP=$(curl -s -X POST "$BASE_URL/superadmin/backup/restore" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -F "file=@$BACKUP_FILE")
  SA_SKIPPED=$(echo "$SA_RESTORE_RESP" | jq -r '.skipped | length // 0')
  SA_IMPORTED=$(echo "$SA_RESTORE_RESP" | jq -r '.imported | length // 0')
  echo "Backup restore: importadas=$SA_IMPORTED ignoradas=$SA_SKIPPED"
  if [ "$SA_SKIPPED" -lt 1 ] || [ "$SA_IMPORTED" != "0" ]; then
    echo "FALHOU: restore deveria ignorar prova já existente"
    echo "$SA_RESTORE_RESP"
    exit 1
  fi
  rm -f "$BACKUP_FILE"
  echo "OK: backup export e restore (skip em duplicata)"
else
  echo "AVISO: superadmin desabilitado no servidor (session HTTP $SA_SESSION_HTTP). Defina SUPERADMIN_TOKEN para testes completos."
fi

# 12. Questão numérica (unitToCanonical + tolerância relativa)
echo -e "\n12. Testando questão numérica..."
NUM_CREATE_RESP=$(curl -s -X POST "$BASE_URL/exams" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Física - Velocidade Numérica",
    "items": [
      {
        "question_number": 1,
        "sub_label": null,
        "points": 4.0,
        "answer_type": "numerical",
        "answer_config": {
          "value": 30,
          "canonicalUnit": "m/s",
          "unitRequired": true,
          "acceptedUnits": [
            {
              "unit": "m/s",
              "unitToCanonical": 1,
              "aliases": ["m/s", "metro por segundo"]
            },
            {
              "unit": "km/h",
              "unitToCanonical": 0.2777777778,
              "aliases": ["km/h", "quilometro por hora"]
            }
          ],
          "tolerance": { "relative": 0.005 }
        }
      },
      {
        "question_number": 2,
        "sub_label": null,
        "points": 1.0,
        "answer_type": "numerical",
        "answer_config": {
          "value": 25.75,
          "unitRequired": false,
          "tolerance": { "absolute": 0.01 }
        }
      }
    ]
  }')

NUM_PUBLIC=$(echo "$NUM_CREATE_RESP" | jq -r '.public_code')
NUM_ADMIN=$(echo "$NUM_CREATE_RESP" | jq -r '.admin_token')
if [ -z "$NUM_PUBLIC" ] || [ "$NUM_PUBLIC" = "null" ]; then
  echo "FALHOU: criação de prova numérica"
  echo "$NUM_CREATE_RESP"
  exit 1
fi

NUM_GET=$(curl -s "$BASE_URL/exams/$NUM_PUBLIC")
NUM_ITEM_1=$(echo "$NUM_GET" | jq -r '.items[0].id')
NUM_ITEM_2=$(echo "$NUM_GET" | jq -r '.items[1].id')

NUM_SUB_OK=$(curl -s -X POST "$BASE_URL/exams/$NUM_PUBLIC/submissions" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_name\": \"Aluno Numérico\",
    \"student_identifier\": \"NUM001\",
    \"answers\": {
      \"$NUM_ITEM_1\": \"108 km/h\",
      \"$NUM_ITEM_2\": \"25,74\"
    }
  }")
NUM_SUB_ID=$(echo "$NUM_SUB_OK" | jq -r '.submission_id')
if [ -z "$NUM_SUB_ID" ] || [ "$NUM_SUB_ID" = "null" ]; then
  echo "FALHOU: submissão numérica correta"
  echo "$NUM_SUB_OK"
  exit 1
fi

NUM_ADMIN_SESSION=$(curl -s -X POST "$BASE_URL/admin/session" \
  -H "Content-Type: application/json" \
  -d "{\"admin_token\": \"$NUM_ADMIN\"}" | jq -r '.session_token')
NUM_ADMIN_PANEL=$(curl -s "$BASE_URL/admin/exams" \
  -H "Authorization: Bearer $NUM_ADMIN_SESSION")
NUM_SCORE=$(echo "$NUM_ADMIN_PANEL" | jq '[.submissions[] | select(.student_identifier=="NUM001") | .total_score][0]')
echo "Submissão numérica correta score: $NUM_SCORE (esperado 5.0)"
if [ "$NUM_SCORE" != "5" ] && [ "$NUM_SCORE" != "5.0" ]; then
  echo "FALHOU: pontuação numérica incorreta para respostas corretas"
  echo "$NUM_ADMIN_PANEL"
  exit 1
fi

NUM_SUB_BAD=$(curl -s -X POST "$BASE_URL/exams/$NUM_PUBLIC/submissions" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_name\": \"Aluno Numérico Errado\",
    \"student_identifier\": \"NUM002\",
    \"answers\": {
      \"$NUM_ITEM_1\": \"100 km/h\",
      \"$NUM_ITEM_2\": \"25,77\"
    }
  }")
NUM_ADMIN_PANEL_2=$(curl -s "$BASE_URL/admin/exams" \
  -H "Authorization: Bearer $NUM_ADMIN_SESSION")
NUM_BAD_SCORE=$(echo "$NUM_ADMIN_PANEL_2" | jq '[.submissions[] | select(.student_identifier=="NUM002") | .total_score][0]')
echo "Submissão numérica errada score: $NUM_BAD_SCORE (esperado 0)"
if [ "$NUM_BAD_SCORE" != "0" ] && [ "$NUM_BAD_SCORE" != "0.0" ]; then
  echo "FALHOU: respostas erradas deveriam zerar a nota"
  exit 1
fi

curl -s -X POST "$BASE_URL/admin/exams/close" \
  -H "Authorization: Bearer $NUM_ADMIN_SESSION" > /dev/null

NUM_CLOSED=$(curl -s "$BASE_URL/submissions/$NUM_SUB_ID")
NUM_EXPECTED=$(echo "$NUM_CLOSED" | jq -r '.answers[0].acceptedAnswers[0] // empty')
echo "Gabarito numérico na submissão fechada: $NUM_EXPECTED"
if [ -z "$NUM_EXPECTED" ] || [ "$NUM_EXPECTED" = "null" ]; then
  echo "FALHOU: submissão fechada sem gabarito numérico formatado"
  exit 1
fi
echo "OK: questão numérica (km/h -> m/s, tolerância absoluta sem unidade)"

echo -e "\n=== TESTES DE API CONCLUÍDOS ==="
