# Walkthrough de Implementação - GabaritoWEB (MVP)

A implementação do **GabaritoWEB (MVP)** foi concluída com sucesso! Todo o fluxo de funcionamento foi validado a nível de código, banco de dados e APIs.

---

## O que foi desenvolvido

### 1. Inicialização do Projeto e Monorepo
* Criado o `package.json` raiz configurando os workspaces para `backend/` e `frontend/`.
* Instalado e configurado o utilitário `concurrently` para rodar ambos os servidores simultaneamente com um único comando (`npm run dev`).

### 2. Banco de Dados e ORM (`backend`)
* Banco de dados SQLite inicializado via `better-sqlite3` em modo **WAL (Write-Ahead Logging)** para garantir excelente performance de escrita concorrente.
* Schema do Drizzle ORM modelado em 4 tabelas relacionais em [schema.ts](file:///home/bgeneto/github/gabarito-web/backend/src/db/schema.ts):
  * `exams`: Provas criadas.
  * `exam_items`: Questões respondíveis (tratando todas as questões como itens-folha, ex: 1a, 1b ou 2).
  * `submissions`: Identificação do aluno e nota acumulada final.
  * `submission_answers`: Respostas individuais enviadas pelos estudantes.
* Banco de dados local `gabarito.db` gerado com sucesso através da execução de `drizzle-kit push`.

### 3. Lógica do Servidor Hono (`backend`)
* Servidor Hono implementado em [index.ts](file:///home/bgeneto/github/gabarito-web/backend/src/index.ts) cobrendo todos os contratos de API.
* Criado pipeline de normalização textual em [normalizer.ts](file:///home/bgeneto/github/gabarito-web/backend/src/utils/normalizer.ts):
  * **Trim**, decomposição **Unicode NFD** (remoção de acentos/diacríticos), remoção de cedilha, conversão para **UPPERCASE** e colapso de múltiplos espaços consecutivos.
  * Mapeadores linguísticos inteligentes para verdadeiro/falso (ex: "verdadeiro", "v", "sim", "true", "t" normalizados para "V").
* Middleware de **Rate Limiting** customizado em [rateLimiter.ts](file:///home/bgeneto/github/gabarito-web/backend/src/middleware/rateLimiter.ts) protegendo a API de envio de respostas de IPs spammers (limite de 5 envios/min por IP).
* Hashing criptográfico SHA-256 no banco para o token de administrador do professor (`admin_token`).
* Medida de segurança bloqueando reenvio de respostas usando a mesma matrícula para a mesma prova.

### 4. Interface do Usuário React + Tailwind CSS v4 (`frontend`)
* Montada a casca do app e roteamento reativo baseado em histórico de rotas (`popstate` e `pushState`) em [App.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/App.tsx) (sem dependências externas pesadas).
* Desenvolvidas as seguintes páginas mobile-first:
  * **Home** ([Home.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/Home.tsx)): Painel de escolha inicial ("Sou Aluno" / "Sou Professor") com acesso a gabaritos ou login de admin.
  * **TeacherCreate** ([TeacherCreate.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/TeacherCreate.tsx)): Criador de provas dinâmico, suportando escolha de tipos de resposta, definição de pesos e inserção de múltiplos gabaritos válidos. Exibe links públicos e administrativos, renderizando o **QR Code** via SVG.
  * **TeacherDashboard** ([TeacherDashboard.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/TeacherDashboard.tsx)): Painel administrativo contendo listagem de alunos, cálculo de notas e médias da turma, controle para encerrar a prova, e exportador de resultados nativo para **CSV**.
  * **StudentExam** ([StudentExam.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/StudentExam.tsx)): Tela mobile-first para preenchimento de respostas do aluno com inputs interativos (botões de múltipla escolha e V/F rápidos, ou texto tradicional).
  * **StudentResult** ([StudentResult.tsx](file:///home/bgeneto/github/gabarito-web/frontend/src/pages/StudentResult.tsx)): Visualização das notas. Apresenta status "Aguardando Encerramento" enquanto a prova está aberta e corrige detalhadamente item por item com cores (vermelho/verde) após o fechamento.

---

## Verificação e Testes Realizados

### 1. Testes de Integração Automatizados (API)
Criamos um script Bash completo de testes ([test-api.sh](file:///home/bgeneto/github/gabarito-web/test-api.sh)) que valida o fluxo de ponta a ponta:
1. Criação de prova com Q1a, Q1b e Q2 de tipos mistos.
2. Consulta pública (validação de que as respostas corretas são omitidas para o estudante).
3. Submissão bem-sucedida de aluno com nota 10.0.
4. Submissão parcial com nota 2.5.
5. Bloqueio de duplicidade ou rate limit (retornando erro).
6. Ocultação de notas detalhadas para submissões de prova ainda aberta.
7. Consulta do painel administrativo.
8. Encerramento da prova.
9. Liberação e checagem de nota e gabarito detalhado do aluno.

**Status dos Testes:** PASSOU (Sucesso 100%).

### 2. Validação de Build de Produção
Executamos o comando de build geral do monorepo:
```bash
npm run build
```
O build transpilou o TypeScript do backend com sucesso e gerou os ativos otimizados de produção do frontend sem nenhum erro (`dist/assets/index.js`, `dist/assets/index.css`).

---

## Observação da Verificação Visual
> [!WARNING]
> O subagente de navegação do navegador falhou ao iniciar a interface gráfica devido a um erro de resolução CDP local (`failed to resolve CDP URLs: could not resolve IP for 127.0.0.1`). Esse erro de ambiente impede a renderização automatizada no subagente, mas o build e as APIs foram 100% verificados.
