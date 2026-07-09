# 📝 GabaritoWEB

> Plataforma web _mobile-first_ para publicação e autocorreção de gabaritos de provas — sem cadastro, sem complicação.

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Hono](https://img.shields.io/badge/Hono-API-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/Licença-MIT-yellow.svg)](LICENSE)

---

## ✨ Visão Geral

O **GabaritoWEB** permite que professores criem provas com gabarito oficial e compartilhem um link ou QR Code com os alunos. Os alunos submetem suas respostas e recebem a correção automaticamente assim que a prova é encerrada — sem necessidade de cadastro para nenhuma das partes.

### Fluxo resumido

```
Professor cria a prova  →  Compartilha o código/QR Code
Aluno submete respostas →  Aguarda encerramento
Professor encerra prova →  Aluno consulta nota detalhada
```

---

## 🚀 Funcionalidades

| Funcionalidade                   | Descrição                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 📋 **Criação de provas**         | Múltiplas questões com subitens, pontuações individuais e tipos variados                                    |
| 🔢 **Tipos de questão**          | Múltipla escolha, Verdadeiro/Falso, Texto curto e **Numérica** (valor + tolerância, com suporte a unidades) |
| 📱 **QR Code automático**        | Gerado na criação da prova para compartilhamento rápido                                                     |
| ✅ **Autocorreção**              | Correção no servidor: normalização textual (acentos, maiúsculas, espaços) e grading numérico com unidades   |
| 🔒 **Sem gabarito exposto**      | O gabarito nunca trafega para o cliente; a correção ocorre 100% no servidor                                 |
| 📊 **Dashboard em tempo real**   | Painel do professor atualizado automaticamente com novas submissões via polling                             |
| 🚫 **Anti-duplicidade**          | Impede que um mesmo aluno (por matrícula) submeta mais de uma vez                                           |
| 📤 **Import/Export de gabarito** | Exporta e importa configurações de prova em formato JSON                                                    |
| 🌙 **Tema escuro**               | Interface moderna com glassmorphism, tema slate/ciano e suporte _mobile-first_                              |
| 🐳 **Docker pronto**             | Ambientes de desenvolvimento e produção via Docker Compose                                                  |
| 🛡️ **Painel Superadmin**         | Visão global somente leitura de provas, estatísticas e tráfego (token via `.env`)                           |

---

## 🛠️ Stack Tecnológica

### Frontend

- **[React 19](https://react.dev)** + **[TypeScript](https://www.typescriptlang.org)** — SPA com roteador reativo próprio (sem biblioteca externa)
- **[Vite](https://vitejs.dev)** — Build tool e servidor de desenvolvimento
- **[Tailwind CSS v4](https://tailwindcss.com)** — Estilização _utility-first_ com tema escuro personalizado

### Backend

- **[Node.js](https://nodejs.org)** + **[Hono](https://hono.dev)** — API REST leve e performática
- **[SQLite](https://sqlite.org)** (modo WAL) — Banco de dados embarcado e portável
- **[Drizzle ORM](https://orm.drizzle.team)** + **Drizzle Kit** — ORM type-safe e migrações

### Infraestrutura

- **[Docker](https://docker.com)** + **Docker Compose** — Containers para dev e produção
- **[Caddy](https://caddyserver.com)** _(recomendado)_ — Servidor web para produção com HTTPS automático

---

## 📂 Estrutura do Projeto

```text
gabarito-web/
├── backend/                        # API Hono & Banco de dados
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts            # Conexão SQLite (modo WAL)
│   │   │   └── schema.ts           # Schemas Drizzle ORM
│   │   ├── middleware/
│   │   │   └── rateLimiter.ts      # Rate limit por aluno (5/min) e por prova+IP (60/min)
│   │   ├── utils/
│   │   │   ├── normalizer.ts       # Pipeline de normalização textual
│   │   │   ├── numericalParser.ts  # Parser de respostas numéricas
│   │   │   └── numericalGrader.ts  # Correção numérica (unitToCanonical)
│   │   └── index.ts                # Definição de rotas e servidor Hono
│   ├── Dockerfile                  # Imagem de produção
│   ├── Dockerfile.dev              # Imagem de desenvolvimento (hot-reload)
│   ├── drizzle.config.ts           # Configuração do Drizzle Kit
│   └── package.json
├── frontend/                       # SPA React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Página inicial (escolha de papel)
│   │   │   ├── TeacherCreate.tsx   # Criação de prova pelo professor
│   │   │   ├── TeacherDashboard.tsx# Painel de administração da prova
│   │   │   ├── StudentExam.tsx     # Tela de resposta do aluno
│   │   │   └── StudentResult.tsx   # Tela de consulta de nota
│   │   ├── components/             # Componentes reutilizáveis (Modal, etc.)
│   │   ├── App.tsx                 # Roteador reativo e layout principal
│   │   ├── main.tsx                # Ponto de entrada do React
│   │   └── index.css               # Importações do Tailwind v4 e estilos base
│   ├── Dockerfile.dev              # Imagem de desenvolvimento
│   ├── vite.config.ts              # Proxy /api → porta 3000
│   └── package.json
├── docker-compose.yml              # Ambiente de produção (padrão)
├── docker-compose.dev.yml          # Ambiente de desenvolvimento
├── manage.sh                       # Script central de gerenciamento
├── test-api.sh                     # Testes de integração da API
├── package.json                    # Workspace root (npm workspaces)
└── .agents/
    └── SDD.md                      # Documento de Especificação Técnica
```

---

## ⚡ Início Rápido

### Pré-requisitos

- [Node.js 22+](https://nodejs.org)
- [npm 10+](https://npmjs.com)
- [Docker](https://docker.com) e Docker Compose _(opcional, para execução em containers)_

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/seu-usuario/gabarito-web.git
cd gabarito-web
npm install
```

### 2. Configurar o banco de dados

```bash
npx drizzle-kit push --config=backend/drizzle.config.ts
```

### 3. Executar em desenvolvimento (local)

```bash
npm run dev
```

Isso inicia:

- **Frontend (Vite):** http://localhost:5173
- **Backend (Hono):** http://localhost:3000

---

## 🐳 Execução com Docker

### Desenvolvimento (hot-reload)

```bash
./manage.sh dev-start   # Sobe os containers em segundo plano
./manage.sh dev-stop    # Para e remove os containers
```

- Frontend disponível em: **http://localhost:5173**
- Backend disponível em: **http://localhost:3000**

### Produção

```bash
./manage.sh prod-start  # Build, migração de banco e inicialização da API
./manage.sh prod-stop   # Para o container de produção
```

> **Nota:** Em produção, o Caddy (ou outro servidor web) deve servir a pasta `frontend/dist/` e fazer proxy reverso das requisições `/api/*` para a porta **3000**.

---

## 🧰 Script `manage.sh` — Referência Completa

| Comando                  | Descrição                                                      |
| ------------------------ | -------------------------------------------------------------- |
| `./manage.sh dev-start`  | Sobe os containers de desenvolvimento via Docker Compose       |
| `./manage.sh dev-stop`   | Para e remove os containers de desenvolvimento                 |
| `./manage.sh prod-start` | Build do frontend + migração do banco + inicia API de produção |
| `./manage.sh prod-stop`  | Para o container da API de produção                            |
| `./manage.sh build`      | Build completo do monorepo (backend + frontend) localmente     |
| `./manage.sh db-push`    | Sincroniza o schema TypeScript com o banco SQLite              |
| `./manage.sh format`     | Formata o código-fonte com Prettier                            |
| `./manage.sh test`       | Executa testes unitários e testes de integração da API         |

---

## 🗄️ Modelo de Dados

```mermaid
erDiagram
    EXAMS ||--o{ EXAM_ITEMS : "possui"
    EXAMS ||--o{ SUBMISSIONS : "recebe"
    SUBMISSIONS ||--o{ SUBMISSION_ANSWERS : "contém"
    EXAM_ITEMS ||--o{ SUBMISSION_ANSWERS : "respondido_em"

    EXAMS {
        text id PK
        text title
        text public_code UK
        text admin_code_hash
        text status
        integer created_at
        integer closed_at
    }

    EXAM_ITEMS {
        text id PK
        text exam_id FK
        integer question_number
        text sub_label
        real points
        text answer_type
        text answer_config_json
        integer position
    }

    SUBMISSIONS {
        text id PK
        text exam_id FK
        text student_name
        text student_identifier
        integer submitted_at
        real total_score
    }

    SUBMISSION_ANSWERS {
        text id PK
        text submission_id FK
        text item_id FK
        text raw_answer
        text normalized_answer
        integer is_correct
        real score_awarded
    }
```

### Tipos de Questão (`answer_type`)

| Tipo         | Descrição                                          | Exemplo de gabarito                                                   |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| `choice`     | Múltipla escolha (letra)                           | `{ "accepted": ["A"] }`                                               |
| `true_false` | Verdadeiro ou Falso                                | `{ "accepted": ["V"] }`                                               |
| `short_text` | Texto curto (com variações)                        | `{ "accepted": ["MASSA", "PESO"] }`                                   |
| `numerical`  | Valor numérico com tolerância (unidades opcionais) | Ver [AGENTS.md](AGENTS.md) para o formato completo de `answer_config` |

Questões **numéricas** aceitam respostas como `108 km/h` ou `25,75`, convertem para uma unidade canônica definida pelo professor e comparam com tolerância relativa ou absoluta — ideal para exercícios de Física, Química e Matemática aplicada.

---

## 🔌 API — Referência dos Endpoints

Todas as rotas utilizam `Content-Type: application/json`.

### Professor

| Método | Rota                                  | Descrição                                            |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| `POST` | `/api/exams`                          | Cria uma nova prova                                  |
| `GET`  | `/api/admin/exams/:admin_token`       | Consulta painel da prova (com gabarito e submissões) |
| `POST` | `/api/admin/exams/:admin_token/close` | Encerra a prova e libera notas                       |

### Aluno

| Método | Rota                                  | Descrição                                        |
| ------ | ------------------------------------- | ------------------------------------------------ |
| `GET`  | `/api/exams/:public_code`             | Busca a prova pelo código público (sem gabarito) |
| `POST` | `/api/exams/:public_code/submissions` | Envia as respostas do aluno                      |
| `GET`  | `/api/submissions/:submission_id`     | Consulta nota e detalhamento da correção         |

### Exemplo: Criar Prova

```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Física Geral I — Prova 1",
    "items": [
      {
        "question_number": 1,
        "sub_label": "a",
        "points": 2.0,
        "answer_type": "choice",
        "answer_config": { "accepted": ["B"] }
      },
      {
        "question_number": 2,
        "sub_label": null,
        "points": 3.0,
        "answer_type": "true_false",
        "answer_config": { "accepted": ["V"] }
      }
    ]
  }'
```

**Resposta `201 Created`:**

```json
{
  "id": "abc123",
  "public_code": "G26-DNEM9G",
  "admin_token": "adm_A7K9QF",
  "message": "Prova criada com sucesso!"
}
```

---

## 🧪 Testes

### Testes unitários (backend)

```bash
npm run test:unit
```

### Testes de integração (API completa)

```bash
./manage.sh test
```

O script detecta automaticamente se a API está no ar e, caso não esteja, sobe uma instância temporária para executar os testes.

---

## 🔐 Segurança

| Mecanismo                      | Detalhes                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Token administrativo**       | Formato `adm_XXXXXX` (6 chars base36). Apenas o hash SHA-256 é armazenado no banco; comparação com `timingSafeEqual` em falhas |
| **Sessão admin (SPA)**         | Token fica em `sessionStorage`; URL do painel é `/admin` (links diretos usam base64url cosmético em `/admin/:segment`)         |
| **Código público**             | Formato `GYY-XXXXXX` (ano + 6 chars base36). Não expõe o gabarito                                                              |
| **Gabarito oculto**            | A rota pública `/api/exams/:public_code` nunca retorna `answer_config_json`                                                    |
| **Notas ocultas**              | Enquanto a prova estiver aberta, `total_score` retorna `null` para o aluno                                                     |
| **Rate limiting (envio)**      | 5 tentativas/min por matrícula e 60/min por prova+IP na rota de envio (409 não conta)                                          |
| **Rate limiting (admin)**      | 20 tentativas inválidas/min por IP em `/api/admin/*` (401 conta; sucesso não conta)                                            |
| **Rate limiting (superadmin)** | 10 falhas de auth/min e 60 req/min autenticadas por IP em `/api/superadmin/*`                                                  |
| **Anti-duplicidade**           | Matrícula duplicada na mesma prova retorna `409 Conflict`                                                                      |
| **Comprovante compacto**       | ID de submissão com 6 chars base36 com detecção de colisão e retry                                                             |
| **Superadmin**                 | Token estático em `SUPERADMIN_TOKEN`; área somente leitura em `/superadmin`                                                    |
| **Logs de acesso**             | IPs hasheados (SHA-256); retenção configurável via `ACCESS_LOG_RETENTION_DAYS`                                                 |

### Painel Superadmin

URL: `/superadmin` (não aparece na página inicial). No **servidor de produção**, crie/edite o `.env` na raiz do projeto (mesmo diretório do `docker-compose.yml`):

```bash
openssl rand -hex 32
# .env (sem aspas, uma linha, sem espaços extras):
SUPERADMIN_TOKEN=efa4548dc2e10ea9517aa45cc43fc4a385e4f97718ad2752c2f596140a81ee4e
```

**Importante em produção:** alterar o `.env` não atualiza um container já em execução. Recrie a API:

```bash
./manage.sh prod-stop
./manage.sh prod-start
# ou: docker compose up -d --force-recreate gabarito-api
```

Confirme nos logs do container: `Superadmin: habilitado`.

Teste direto na API (no servidor):

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:3000/api/superadmin/session
# Esperado: 200
```

Se retornar `401` com `Token ausente`, o **proxy reverso (Caddy/Nginx)** pode estar bloqueando o header `Authorization` — garanta que ele seja repassado à API.

O painel exibe estatísticas globais de provas, submissões, tráfego e drill-down por prova — sem possibilidade de alterar dados.

---

## ⚙️ Normalização de Respostas

Para aceitar variações textuais sem exigir configuração complexa, o backend aplica um pipeline de limpeza antes de comparar respostas:

1. **Trim** — Remove espaços no início e no final
2. **NFD Unicode** — Decompõe acentos e caracteres especiais
3. **Remoção de diacríticos** — Remove marcas de acento
4. **Cedilha** — Mapeia `Ç` → `C`
5. **Maiúsculas** — Converte tudo para `UPPERCASE`
6. **Espaços** — Colapsa múltiplos espaços em um único

**Mapeamentos Verdadeiro/Falso:**

| Entrada do aluno                                      | Interpretado como |
| ----------------------------------------------------- | ----------------- |
| `V`, `VERDADEIRO`, `VERDADE`, `SIM`, `S`, `TRUE`, `T` | `V`               |
| `F`, `FALSO`, `NAO`, `N`, `FALSE`                     | `F`               |

**Exemplo `short_text`:**

```
Gabarito:  ["o mesmo", "a mesma", "igual"]
Resposta:  "  À mesma. "
Após norm: "A MESMA"  ✅ Correto
```

**Questões numéricas (`numerical`):**

Respostas como `108 km/h` ou `6,24 N` são interpretadas no servidor: o valor é extraído, a unidade é reconhecida por aliases configurados pelo professor e convertida para a unidade canônica antes da comparação com tolerância. Não há normalização textual genérica — a lógica está em `numericalParser.ts` e `numericalGrader.ts`.

---

## 🗂️ Drizzle ORM — Comandos Úteis

```bash
# Aplica o schema TypeScript diretamente no banco SQLite
npx drizzle-kit push --config=backend/drizzle.config.ts

# Abre o painel visual interativo do banco de dados
npx drizzle-kit studio --config=backend/drizzle.config.ts
```

> **Atenção:** Execute sempre a partir da raiz do monorepo.

---

## 🌐 Deploy em Produção

### Arquitetura recomendada

```
Internet → Caddy (HTTPS + arquivos estáticos) → /api/* → Hono API (Docker, porta 3000)
                                               → /*     → frontend/dist/
```

### Passos

```bash
# 1. Gerar build do frontend, migrar banco e subir API
./manage.sh prod-start

# 2. Configurar o Caddy (exemplo de Caddyfile):
# gabarito.exemplo.com {
#     root * /srv/gabarito
#     file_server
#     reverse_proxy /api/* localhost:3000
# }
```

O banco de dados SQLite é persistido automaticamente no volume Docker `gabaritoweb-db`.

---

## 🤝 Contribuindo

1. Faça um _fork_ do repositório
2. Crie uma _branch_: `git checkout -b feature/minha-feature`
3. Realize seus commits: `git commit -m 'feat: adiciona minha feature'`
4. Formate o código: `./manage.sh format`
5. Execute os testes: `./manage.sh test`
6. Abra um _Pull Request_

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
  <sub>Desenvolvido com ❤️ para facilitar a vida de professores e alunos.</sub>
</div>
