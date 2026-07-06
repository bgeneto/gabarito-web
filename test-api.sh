#!/bin/bash

# Porta em que o backend roda
PORT=3000
BASE_URL="http://localhost:$PORT/api"

echo "=== INICIANDO TESTES DE API ==="

# 1. Criar Prova
echo "1. Criando prova..."
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
        "answer_type": "text_exact",
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

PUBLIC_CODE=$(echo "$CREATE_RESP" | grep -o '"public_code":"[^"]*' | grep -o '[^"]*$')
ADMIN_TOKEN=$(echo "$CREATE_RESP" | grep -o '"admin_token":"[^"]*' | grep -o '[^"]*$')

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

# Extrair IDs usando grep simples para compatibilidade
ITEMS_PART=$(echo "$GET_RESP" | grep -o '"items":.*')
ITEM_1_ID=$(echo "$ITEMS_PART" | grep -o '"id":"[^"]*' | head -n 1 | grep -o '[^"]*$')
ITEM_2_ID=$(echo "$ITEMS_PART" | grep -o '"id":"[^"]*' | head -n 2 | tail -n 1 | grep -o '[^"]*$')
ITEM_3_ID=$(echo "$ITEMS_PART" | grep -o '"id":"[^"]*' | head -n 3 | tail -n 1 | grep -o '[^"]*$')

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

SUB_1_ID=$(echo "$SUB_1_RESP" | grep -o '"submission_id":"[^"]*' | grep -o '[^"]*$')
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

SUB_2_ID=$(echo "$SUB_2_RESP" | grep -o '"submission_id":"[^"]*' | grep -o '[^"]*$')

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

# 6. Consultar Nota com Prova Aberta (deve ocultar nota)
echo -e "\n6. Consultando nota do Aluno 1 com prova ABERTA..."
VAL_1_OPEN=$(curl -s "$BASE_URL/submissions/$SUB_1_ID")
echo "Resposta da nota (nota deve ser null):"
echo "$VAL_1_OPEN"

# 7. Acessar Painel do Professor (Admin)
echo -e "\n7. Acessando painel do professor (deve mostrar notas de todos)..."
ADMIN_RESP=$(curl -s "$BASE_URL/admin/exams/$ADMIN_TOKEN")
echo "Resposta do painel do professor:"
echo "$ADMIN_RESP"

# 8. Encerrar Prova pelo Professor
echo -e "\n8. Encerrando prova..."
CLOSE_RESP=$(curl -s -X POST "$BASE_URL/admin/exams/$ADMIN_TOKEN/close")
echo "Resposta do encerramento:"
echo "$CLOSE_RESP"

# 9. Consultar Nota com Prova Fechada (deve retornar nota detalhada)
echo -e "\n9. Consultando nota do Aluno 1 com prova FECHADA..."
VAL_1_CLOSED=$(curl -s "$BASE_URL/submissions/$SUB_1_ID")
echo "Resposta da nota (nota deve ser 10.0 e detalhada):"
echo "$VAL_1_CLOSED"

echo -e "\n10. Consultando nota do Aluno 2 com prova FECHADA..."
VAL_2_CLOSED=$(curl -s "$BASE_URL/submissions/$SUB_2_ID")
echo "Resposta da nota (nota deve ser 2.5):"
echo "$VAL_2_CLOSED"

echo -e "\n=== TESTES DE API CONCLUÍDOS ==="
