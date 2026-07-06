# Plano de Implementação - GabaritoWEB (MVP)

Este documento descreve o plano passo a passo para a inicialização e o desenvolvimento do aplicativo **GabaritoWEB** baseado nas especificações técnicas do [SDD.md](file:///home/bgeneto/github/gabarito-web/SDD.md).

---

## User Review Required

> [!IMPORTANT]
>
> - **Estratégia de Monorepo / Estrutura de Pastas**: Inicializaremos duas pastas principais no repositório: `backend/` para a API Hono e `frontend/` para a SPA React/Vite. A pasta raiz conterá arquivos de configuração global se necessário.
> - **Pacote de QR Code**: No frontend, utilizaremos a biblioteca `qrcode.react` para gerar dinamicamente o código QR com base no link de resposta pública gerado pelo backend.
> - **Segurança e Persistência**: SQLite será configurado localmente via `better-sqlite3`. Faremos hashes com a biblioteca padrão do Node.js `crypto` (ex: `pbkdf2` ou `scrypt` ou `createHash('sha256')`) para o código administrativo do professor para evitar dependências pesadas de compilação C++ como o `bcrypt`.

---

## Open Questions

> [!NOTE]
> Não há perguntas abertas críticas bloqueando o início, pois todas as definições do escopo do MVP foram acordadas no chat anterior. Se houver alguma observação durante a revisão, por favor insira nos comentários.

---

## Proposed Changes

### Componente 1: Inicialização do Repositório e Dependências

#### [NEW] [package.json](file:///home/bgeneto/github/gabarito-web/package.json)

Configuração do workspace npm na raiz para facilitar a execução simultânea do backend e frontend se necessário.

#### [NEW] [backend/package.json](file:///home/bgeneto/github/gabarito-web/backend/package.json)

Configuração de dependências do backend:

- `hono`
- `@hono/node-server`
- `better-sqlite3`
- `drizzle-orm`
- `dotenv`
- DevDependencies: `typescript`, `drizzle-kit`, `@types/better-sqlite3`, `tsx`.

#### [NEW] [frontend/package.json](file:///home/bgeneto/github/gabarito-web/frontend/package.json)

Configuração de dependências do frontend:

- `react`, `react-dom`
- `lucide-react` (ícones modernos)
- `qrcode.react` (geração de QR code)
- `zod`
- DevDependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss` (v4), `typescript`, `@types/react`, `@types/react-dom`.

---

### Componente 2: Banco de Dados e Drizzle ORM (`backend`)

#### [NEW] [schema.ts](file:///home/bgeneto/github/gabarito-web/backend/src/db/schema.ts)

Implementação dos schemas Drizzle baseados nas tabelas de `exams`, `exam_items`, `submissions`, e `submission_answers`.

#### [NEW] [index.ts](file:///home/bgeneto/github/gabarito-web/backend/src/db/index.ts)

Inicialização da conexão SQLite com `better-sqlite3` e configuração do modo WAL (Write-Ahead Logging).

#### [NEW] [drizzle.config.ts](file:///home/bgeneto/github/gabarito-web/backend/drizzle.config.ts)

Configuração do Drizzle Kit para migrações do banco de dados SQLite.

---

### Componente 3: Lógica e Endpoints do Servidor (`backend`)

#### [NEW] [normalizer.ts](file:///home/bgeneto/github/gabarito-web/backend/src/utils/normalizer.ts)

Funções utilitárias para o pipeline de normalização textual (NFD, remoção de acentos, maiúsculas, colapso de espaços e mapeamento de V/F).

#### [NEW] [rateLimiter.ts](file:///home/bgeneto/github/gabarito-web/backend/src/middleware/rateLimiter.ts)

Middleware customizado Hono para limitação de taxa (rate limiting) de IPs na submissão de respostas.

#### [NEW] [index.ts](file:///home/bgeneto/github/gabarito-web/backend/src/index.ts)

Servidor Hono contendo as rotas da API descritas no contrato do SDD:

- `POST /api/exams` - Criação de Prova
- `GET /api/exams/:public_code` - Busca pública da Prova (sem gabarito)
- `POST /api/exams/:public_code/submissions` - Envio de Respostas (com normalização e autocorreção instantânea)
- `GET /api/submissions/:submission_id` - Detalhe de nota do aluno (oculto se prova aberta)
- `GET /api/admin/exams/:admin_token` - Detalhes administrativos com notas de todos os alunos
- `POST /api/admin/exams/:admin_token/close` - Fechamento da prova pelo professor

---

### Componente 4: Interface do Usuário (`frontend`)

#### [NEW] [index.css](file:///home/bgeneto/github/gabarito-web/frontend/src/index.css)

Configuração do Tailwind CSS v4 e paleta de cores moderna (tons escuros elegantes, azul profundo, acentos em ciano, tipografia limpa).

#### [NEW] [App.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/App.tsx)

Roteador do frontend baseado em estado React (ou `react-router-dom` para navegação limpa por URLs). Usaremos rotas para `/`, `/prova/:public_code`, `/submissao/:submission_id` e `/admin/:admin_token`.

#### [NEW] [Home.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/Home.tsx)

Página inicial unificada oferecendo botões destacados: "Sou Aluno" e "Sou Professor". Campo para digitação direta do código público ou redirecionamento.

#### [NEW] [TeacherCreate.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/TeacherCreate.tsx)

Painel do professor para criar prova. Permite definir título, adicionar questões de forma interativa, selecionar o tipo (texto exato, múltipla escolha, V/F), definir os valores de pontuação e o gabarito. Ao enviar, exibe os links administrativo e público, com geração do código QR.

#### [NEW] [TeacherDashboard.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/TeacherDashboard.tsx)

Painel administrativo da prova do professor. Exibe listagem em tempo real de envios de alunos, notas calculadas, botão para encerrar a prova, e exportação dos resultados em CSV.

#### [NEW] [StudentExam.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/StudentExam.tsx)

Interface para o aluno responder à prova. Design mobile-first limpo, progresso visual das questões, identificação com nome e matrícula, e revisão final antes de submeter.

#### [NEW] [StudentResult.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/StudentResult.tsx)

Página de visualização do resultado do aluno. Exibe mensagem de aguardo se a prova estiver aberta, ou o score final e feedback detalhado por item se a prova estiver encerrada.

---

## Verification Plan

### Automated Tests

Para validar as APIs, criaremos um script Bash contendo chamadas de teste usando `curl` que cobrem:

1. Criação de prova com múltiplos tipos de questões.
2. Consulta pública da prova.
3. Duas submissões de alunos (uma com respostas certas e outra com incorretas).
4. Tentativa de submissão duplicada (deve falhar com 409).
5. Consulta da submissão com prova aberta (deve ocultar nota).
6. Acesso ao painel do professor.
7. Fechamento da prova pelo professor.
8. Consulta da submissão com prova fechada (deve exibir nota e respostas corretas).

### Manual Verification

1. Testar o fluxo completo em simulador mobile ou navegador utilizando o subagente de navegação para interações de UI.
2. Verificar responsividade e design em larguras estreitas (abordagem mobile-first).
3. Testar a exportação de arquivo CSV no painel do professor.
