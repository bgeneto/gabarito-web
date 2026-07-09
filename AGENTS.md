# AGENTS.md - Guia do Agente de IA para o GabaritoWEB

Este arquivo contém instruções detalhadas sobre a arquitetura do projeto **GabaritoWEB**, as regras de negócio, o modelo de dados e os fluxos de desenvolvimento para orientar futuros agentes de IA que venham a dar manutenção ou estender esta aplicação.

---

## 1. Visão Geral do Projeto

O **GabaritoWEB** é uma aplicação web leve e responsiva (_mobile-first_) projetada para que professores publiquem gabaritos oficiais de provas e alunos submetam suas respostas para autocorreção instantânea.

- **Abordagem sem cadastro**: Alunos não se cadastram (apenas se identificam por Nome e Matrícula no momento do envio). Professores gerenciam a prova através de um link contendo um **Token Administrativo** aleatório privado.
- **Stack Tecnológica**:
  - **Frontend**: React + TypeScript + Vite + Tailwind CSS v4.
  - **Backend**: Node.js + Hono API + SQLite.
  - **ORM**: Drizzle ORM (com Drizzle Kit para migrações).

---

## 2. Estrutura do Repositório

O projeto adota uma estrutura monorepo baseada em npm workspaces:

```text
gabarito-web/
├── backend/                  # API Hono & Banco de dados
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts      # Conexão SQLite (WAL mode)
│   │   │   └── schema.ts     # Schemas Drizzle ORM
│   │   ├── middleware/
│   │   │   ├── rateLimiter.ts       # Limitação de submissões por IP
│   │   │   ├── superadminAuth.ts    # Auth Bearer para superadmin
│   │   │   ├── accessLogger.ts      # Logging de requisições API
│   │   │   └── telemetryRateLimiter.ts
│   │   ├── routes/
│   │   │   └── superadmin.ts        # Endpoints GET somente leitura
│   │   ├── services/
│   │   │   └── superadminStats.ts   # Agregações e estatísticas globais
│   │   ├── utils/
│   │   │   ├── normalizer.ts        # Pipeline de limpeza e correção textual
│   │   │   ├── numericalParser.ts   # Parser de respostas numéricas (valor + unidade)
│   │   │   └── numericalGrader.ts   # Correção numérica (unitToCanonical + tolerância)
│   │   └── index.ts          # Endpoints do Hono & servidor
│   ├── tsconfig.json
│   └── drizzle.config.ts     # Configuração do Drizzle Kit
├── frontend/                 # SPA React
│   ├── src/
│   │   ├── pages/            # Telas (Home, Teacher*, Student*, Superadmin*)
│   │   ├── App.tsx           # Layout principal e roteador reativo customizado
│   │   ├── main.tsx          # Ponto de entrada do React
│   │   └── index.css         # Importações do Tailwind v4 e estilos base
│   ├── tsconfig.json
│   └── vite.config.ts        # Configura o proxy do /api para a porta 3000
├── package.json              # Workspace root package
├── test-api.sh               # Script Bash de teste de integração
├── SDD.md                    # Documento de Especificação Técnica
└── AGENTS.md                 # Este guia de orientação
```

---

## 3. Modelo de Dados (SQLite + Drizzle ORM)

As relações do banco de dados estão estruturadas da seguinte forma em `backend/src/db/schema.ts`:

1. **`exams`**:
   - `id` (PK, string): UUID.
   - `title` (string): Nome da prova.
   - `publicCode` (string, unique): Código público gerado no backend (`GYY-XXXXXX`, ex: `G26-DNEM9G`).
   - `adminCodeHash` (string): Hash SHA-256 do token administrativo do professor (`adm_XXXXXX`, ex: `adm_A7K9QF`). Usado para autenticação do professor; nunca exposto em respostas JSON.
   - `adminToken` (string, nullable): Token administrativo em texto plano (`adm_XXXXXX`). Persistido na criação da prova; pode ser `null` em provas antigas criadas antes da migração que passou a armazená-lo.
   - `status` (string): `'open'` ou `'closed'`.
   - `createdAt` e `closedAt` (integer): Timestamps epoch milissegundos.

2. **`exam_items`**:
   - Representa as questões e subitens respondíveis (itens-folha).
   - `questionNumber` (integer): Número principal da questão (ex: `1`, `2`).
   - `subLabel` (string, nullable): Identificador de subitem (ex: `"a"`, `"b"`).
   - `points` (real): Pontuação do item.
   - `answerType` (string): `'choice'`, `'true_false'`, `'short_text'` ou `'numerical'`.
   - `answerConfigJson` (string): JSON com a configuração de correção específica do tipo (ver seção 4).

3. **`submissions`**:
   - Registro de envio de respostas de um aluno.
   - `id` (PK, string): Código de comprovante de submissão do aluno de 6 caracteres base36 (ex: `A7K9QF`).
   - `studentName` (string) e `studentIdentifier` (string): Nome e matrícula.
   - `totalScore` (real): Soma das notas nos itens corretos.
   - O reenvio de respostas com a mesma matrícula (`studentIdentifier`) para a mesma prova é bloqueado no backend.

4. **`submission_answers`**:
   - Respostas do aluno para cada item específico.
   - `rawAnswer` (string) e `normalizedAnswer` (string): Respostas antes e depois do pipeline de limpeza.
   - `isCorrect` (integer: `1` ou `0`).
   - `scoreAwarded` (real).

5. **`access_logs`**:
   - Registro de acessos (requisições API e page views do SPA).
   - `eventType`: `'api_request'` ou `'page_view'`.
   - `path` normalizado (tokens/códigos substituídos por placeholders).
   - `routeCategory`, `ipHash` (SHA-256 do IP), `examId` opcional, `responseTimeMs` opcional.
   - Retenção configurável via `ACCESS_LOG_RETENTION_DAYS` (padrão 90 dias).

---

## 4. Pipeline de Normalização de Respostas

Para aceitar variações textuais simples sem exigir IA ou regex complexas do professor, o backend aplica um pipeline de limpeza em `backend/src/utils/normalizer.ts`:

```typescript
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .normalize("NFD") // Decompõe acentos e caracteres especiais
    .replace(/[\u0300-\u036f]/g, "") // Filtra os acentos
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c")
    .toUpperCase()
    .replace(/\s+/g, " "); // Colapsa múltiplos espaços
}
```

### Regras por Tipo de Questão:

- **Múltipla Escolha (`choice`)**: Remove todos os caracteres que não sejam letras (`A-Z`) e compara em maiúsculo.
- **Verd. ou Falso (`true_false`)**: Mapeia termos comuns como `"VERDADEIRO"`, `"SIM"`, `"TRUE"`, `"T"`, `"S"`, `"V"` para `"V"`. E `"FALSO"`, `"FALSE"`, `"NAO"`, `"N"`, `"F"` para `"F"`.
- **Texto Curto (`short_text`)**: Aplica a normalização padrão no input do aluno e compara contra as variações normalizadas do gabarito oficial.
- **Numérica (`numerical`)**: Extrai valor numérico e unidade opcional da resposta bruta, converte para a unidade canônica via `unitToCanonical` e compara com tolerância relativa ou absoluta. Implementação em `backend/src/utils/numericalParser.ts` e `numericalGrader.ts`.

### Configuração `answer_config_json` por tipo

O campo `answer_type` na coluna `exam_items.answer_type` é a fonte de verdade do tipo; **não** inclua `"type"` dentro do JSON.

#### `choice`, `true_false`, `short_text`

```json
{ "accepted": ["A"] }
```

#### `numerical` — sem unidade obrigatória

Quando o enunciado já fixa a unidade (ex.: “em segundos”), basta aceitar só o número:

```json
{
  "value": 25.75,
  "unitRequired": false,
  "tolerance": { "absolute": 0.01 }
}
```

#### `numerical` — com unidades e conversão canônica

Cada unidade aceita traz um fator `unitToCanonical` que multiplica o valor informado pelo aluno para obtê-lo na unidade canônica (`canonicalUnit`). Exemplo: `108 km/h × 0.2777777778 = 30 m/s`.

```json
{
  "value": 30,
  "canonicalUnit": "m/s",
  "unitRequired": true,
  "acceptedUnits": [
    {
      "unit": "m/s",
      "unitToCanonical": 1,
      "aliases": ["m/s", "metro por segundo", "metros por segundo"]
    },
    {
      "unit": "km/h",
      "unitToCanonical": 0.2777777778,
      "aliases": ["km/h", "quilometro por hora", "quilometros por hora"]
    },
    {
      "unit": "mph",
      "unitToCanonical": 0.44704,
      "aliases": ["mph", "mi/h", "milha por hora", "milhas por hora"]
    }
  ],
  "tolerance": { "relative": 0.005 }
}
```

**Algoritmo de correção:**

```typescript
const expected = config.value;
const received = parsed.value * matchedUnit.unitToCanonical;
const relativeError = Math.abs(received - expected) / Math.abs(expected);
return relativeError <= config.tolerance.relative; // ou comparação absoluta
```

**Regras de validação (`validateItem.ts`):**

- `value` deve ser número finito.
- `tolerance` deve ter **exatamente um** de `relative` ou `absolute` (não ambos).
- Se `unitRequired: true`: exige `canonicalUnit`, `acceptedUnits` não vazio; cada unidade precisa de `unit`, `unitToCanonical` > 0 e `aliases` não vazio; deve existir entrada da unidade canônica com fator `1`.
- Se `value === 0` e só houver tolerância relativa, a configuração é rejeitada (use tolerância absoluta).
- Se `unitRequired: false`, `acceptedUnits` não deve ser informado.

**Parsing da resposta do aluno (`numericalParser.ts`):**

1. Extrai número inicial (suporta `,` e `.` como separador decimal; se ambos aparecem, o último é o decimal).
2. Restante da string = texto da unidade (normalizado com `normalizeText` para casar aliases).
3. Se `unitRequired: true` e não houver unidade reconhecida → incorreto.
4. Se `unitRequired: false` e houver texto de unidade não reconhecido → incorreto (evita aceitar unidade errada silenciosamente).

**Campo `normalized_answer` em submissões numéricas:** valor convertido para a unidade canônica, ex.: `"30 m/s"` ou `"25.75"`.

---

## 5. Como Executar e Trabalhar no Projeto

### 5.1. Instalação e Preparação

As dependências do monorepo são instaladas a partir da raiz:

```bash
npm install
```

_Nota: Caso o Drizzle Kit reclame que a dependência `drizzle-orm` não foi encontrada devido a problemas de hoisting nos workspaces do npm, instale os pacotes de banco de dados diretamente na raiz (`npm install drizzle-orm drizzle-kit --save-dev`)._

### 5.2. Executando o Ambiente de Desenvolvimento

Roda o frontend (Vite na porta `5173`) e o backend (Hono na porta `3000`) simultaneamente:

```bash
npm run dev
```

### 5.3. Banco de Dados / Drizzle Commands

Como o Drizzle está configurado com caminhos absolutos, sempre execute os comandos a partir da raiz:

- Puxar alterações do schema TS para o arquivo SQLite:
  ```bash
  npx drizzle-kit push --config=backend/drizzle.config.ts
  ```
  _Em produção (Docker), o entrypoint aplica migrações versionadas em `backend/drizzle/` via `migrate.js`. Após alterar `schema.ts`, gere um novo arquivo com `npx drizzle-kit generate --config=backend/drizzle.config.ts` (executar a partir da raiz do monorepo) antes do deploy._
- Visualizar o banco de dados no painel interativo do Drizzle Studio:
  ```bash
  npx drizzle-kit studio --config=backend/drizzle.config.ts
  ```

### 5.4. Build de Produção

Compila o TypeScript do backend e empacota o frontend:

```bash
npm run build
```

### 5.5. Rodando Testes de API

Para rodar a verificação de sanidade das rotas, ligue o servidor de desenvolvimento em segundo plano e execute:

```bash
chmod +x test-api.sh
./test-api.sh
```

### 5.6. Executando via Docker e Script de Gerenciamento

O projeto fornece um script central de gerenciamento no host ([manage.sh](file:///home/bgeneto/github/gabarito-web/manage.sh)) para unificar builds, migrações de banco e operações do Docker.

#### Desenvolvimento (Docker com Hot-Reload)

- **Iniciar**: Roda os containers de dev em segundo plano (-d) montando as pastas locais para atualização automática dos fontes:
  ```bash
  ./manage.sh dev-start
  ```
- **Parar**: Derruba e limpa os containers de desenvolvimento:
  ```bash
  ./manage.sh dev-stop
  ```

#### Produção (Deploy Integrado)

- **Iniciar**: Executa o build de produção do frontend (`dist/`), aplica as atualizações pendentes do banco SQLite e inicia o container da API de produção (`gabarito-api` na porta 3000) em segundo plano (-d) com persistência automática de dados no volume `gabaritoweb-db`:
  ```bash
  ./manage.sh prod-start
  ```
  _Nota: Com esta abordagem, o servidor web externo (Caddy) deve servir diretamente a pasta `frontend/dist` no caminho `/srv/gabarito` e fazer proxy reverso da API._
- **Parar**: Derruba o container da API de produção:
  ```bash
  ./manage.sh prod-stop
  ```

#### Outros Utilitários do Script

- `./manage.sh format`: Formata recursivamente todo o código-fonte do repositório utilizando Prettier.
- `./manage.sh db-push`: Sincroniza o schema com o SQLite.
- `./manage.sh test`: Executa os testes de integração do `test-api.sh` (utilizando a instância ativa se disponível, ou subindo uma temporária automaticamente).

### 5.7. Área Superadmin (Leitura + Backup Seletivo)

Painel global para o operador do serviço, acessível em `/superadmin` (não linkado na Home).

- **Autenticação**: `SUPERADMIN_TOKEN` no `.env` do servidor; enviado pelo frontend via header `Authorization: Bearer <token>` (armazenado em `sessionStorage`).
- **Endpoints de leitura** (`GET`, prefixo `/api/superadmin/`): `session`, `overview`, `exams`, `exams/:examId`, `access`.
- **Backup seletivo** (`POST`, prefixo `/api/superadmin/backup/`): `export` (gzip JSON com provas selecionadas) e `restore` (importa provas ausentes; ignora conflitos de `id` ou `public_code`). Demais rotas superadmin permanecem somente leitura (405 em `POST`/`PATCH`/`DELETE`).
- **Exposição do token administrativo**: `admin_token` (texto plano, formato `adm_XXXXXX`) é exposto **somente** nas respostas autenticadas da API superadmin (`GET /api/superadmin/exams` e `GET /api/superadmin/exams/:examId`). Rotas públicas e de professor/aluno — por exemplo `GET /api/exams/:public_code`, `POST /api/exams/:public_code/submissions`, `GET /api/submissions/:id` e autenticação admin via `admin_token` no body — **nunca** retornam `admin_token` nem `admin_code_hash`. Arquivos de backup podem conter `admin_code_hash` e `admin_token` (quando disponível) para recuperação do acesso do professor.
- **Telemetria**: `POST /api/telemetry/pageview` registra page views do SPA em `access_logs`; middleware `accessLogger` registra requisições API.
- **Variáveis opcionais**: `SUPERADMIN_ALLOWED_IPS`, `ACCESS_LOG_RETENTION_DAYS`, `SUPERADMIN_BACKUP_ENABLED` (padrão habilitado quando superadmin está ativo).

---

## 6. Diretrizes Importantes para Desenvolvimento Futuro

- **Sem Bibliotecas de Roteamento Complexas**: O frontend utiliza um mini roteador reativo no próprio [App.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/App.tsx) que escuta eventos `popstate`. Mantenha essa abordagem para evitar inflar o bundle ou introduzir incompatibilidades de rotas no Vite.
- **Segurança de Gabaritos**: Nunca modifique a rota pública `GET /api/exams/:public_code` para retornar as respostas corretas (`answer_config_json`). A correção e atribuição de pontos devem ocorrer estritamente no servidor (`POST /api/exams/:public_code/submissions`).
- **Exposição do `admin_token`**: O token administrativo em texto plano só pode aparecer em respostas da API superadmin autenticada. Não adicione `admin_token` a rotas públicas, de professor ou de aluno.
- **Exposição de Notas**: O estudante só pode visualizar sua nota final e o detalhamento das questões no endpoint `/api/submissions/:submission_id` se a prova estiver com o status `'closed'`. Se estiver aberta, a nota deve retornar como `null`.
- **Aparência e Design**: Mantenha o tema escuro moderno do Tailwind CSS v4, aproveitando o painel de glassmorphism (`glass-panel`) e paletas em tons de ardósia, ciano e azul profundo. Certifique-se de que todas as telas sejam otimizadas para toque e telas de celular (mobile-first).
