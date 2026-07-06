# IDEAÇÃO

Pretendo desenvolver um aplicativo web (com abordagem *mobile first*) no qual os alunos insiram suas respostas após finalizarem a prova. O fluxo operacional seria o seguinte: ao encerrar a avaliação, o professor disponibilizaria um código QR que direcionaria o aluno a uma página específica para o registro das respostas, questão por questão, em campos de texto. Esses campos seriam validados automaticamente contra um gabarito definido pelo docente. O professor poderia configurar múltiplas respostas aceitáveis por item para abranger as diferentes formas de expressão do aluno (por exemplo: “5”, “5s”, “5 segundos”, “5 s”, “cinco”; ou “o mesmo”, “a mesma”, “igual”). Para a validação, os textos seriam normalizados (remoção de espaços e conversão para maiúsculas).

A plataforma não exigiria cadastro de usuários. Na tela inicial, o visitante selecionaria uma das duas opções: “Sou aluno” ou “Sou professor”. Caso seja aluno, ele inseriria um código de acesso (provavelmente o mesmo associado ao QR code, embora este redirecione diretamente para o formulário) para visualizar suas respostas, o gabarito e a nota obtida. Se for professor, ele configuraria o número de questões (e subitens, quando aplicável), definiria os gabaritos com as variantes aceitáveis e atribuiria a pontuação de cada item. Ao final da configuração, o sistema geraria um código de identificação da prova (para consulta posterior das respostas e notas dos alunos) e um QR code para compartilhamento com os estudantes.

Para a implementação, pretendo utilizar uma stack leve e moderna, como React, Tailwind CSS v4 e SQLite. Gostaria de saber sua opinião sobre a viabilidade e a qualidade da proposta. Podemos refinar conjuntamente essa ideia até a elaboração de um documento de especificações técnicas (SDD)?



# OPINIÃO



Sim, a ideia é **boa, factível e tem um escopo muito adequado para um MVP**. Ela resolve um problema real: reduzir o trabalho manual de correção, permitir estatísticas imediatas e ainda preservar uma dinâmica simples de sala de aula, sem login obrigatório.

A sua stack proposta — **React + Tailwind v4 + SQLite** — é coerente para começar. React é adequado para uma interface mobile-first baseada em componentes; Tailwind CSS v4 tem integração oficial com Vite, o que combina bem com um app leve; e SQLite é uma boa escolha para um sistema pequeno/médio, especialmente se hospedado em uma VPS simples. SQLite em modo WAL permite leitura e escrita concorrentes, embora continue havendo essencialmente um escritor por vez, o que é aceitável para esse tipo de aplicação se as submissões forem rápidas. ([React](https://react.dev/?utm_source=chatgpt.com))

## A ideia central está correta

O fluxo faz sentido:

1. Professor cria uma prova.
2. Define questões, subitens, pontuação e gabaritos.
3. O sistema gera:
   - um **código público da prova**;
   - um **QR code para os alunos responderem**;
   - um **código privado/administrativo para o professor consultar resultados**.
4. Aluno acessa pelo QR code.
5. Insere identificação mínima, por exemplo nome e matrícula.
6. Preenche respostas questão por questão.
7. Sistema corrige automaticamente.
8. Professor visualiza notas, acertos, erros e estatísticas.

O ponto mais importante: eu **não usaria o mesmo código para tudo**. O ideal é separar:

```txt
Código público da prova: usado pelos alunos para responder.
Código privado do professor: usado para ver respostas, notas e gabarito.
```

Caso contrário, se o código do QR code também der acesso ao gabarito e às estatísticas, qualquer aluno poderia consultar as respostas corretas antes do fim da aplicação.

## O maior desafio não é técnico; é a correção das respostas

A normalização básica que você propôs é necessária:

```txt
" 5 segundos " → "5 SEGUNDOS"
"o mesmo" → "O MESMO"
"a mesma" → "A MESMA"
```

Mas, para provas de física, eu não dependeria apenas de comparação textual. Ela funciona para respostas conceituais simples, mas fica frágil para respostas numéricas.

Por exemplo, estas respostas deveriam poder ser aceitas como equivalentes:

```txt
5
5 s
5s
5 segundos
5,0 s
5.0 s
cinco segundos
```

E estas talvez também, dependendo do item:

```txt
10 m/s para baixo
-10 m/s
10m/s
10 metros por segundo
```

Então eu separaria os validadores em tipos.

## Tipos de correção recomendados

### 1. Resposta textual exata normalizada

Boa para itens como:

```txt
massa
peso
o mesmo
a mesma
igual
dobrada
duas vezes maior
```

Estrutura:

```json
{
  "type": "text_exact",
  "accepted": ["O MESMO", "A MESMA", "IGUAL"]
}
```

### 2. Resposta numérica com tolerância

Boa para respostas como:

```txt
6,24 N
6.24 N
6,2 N
```

Estrutura:

```json
{
  "type": "number",
  "value": 6.24,
  "tolerance": 0.05,
  "unit": "N"
}
```

Isso evita cadastrar manualmente:

```txt
6.24 N
6,24N
6,2 N
6.2 newtons
6,24 newton
```

### 3. Resposta numérica sem unidade obrigatória

Às vezes o enunciado já pede explicitamente a unidade, por exemplo “em segundos”. Nesse caso, a resposta poderia aceitar só o número:

```json
{
  "type": "number",
  "value": 5,
  "tolerance": 0.01,
  "unitRequired": false
}
```

### 4. Resposta numérica com unidade obrigatória

Útil quando você quer exigir dimensionalidade:

```json
{
  "type": "number",
  "value": 30,
  "tolerance": 0.1,
  "unit": "m/s",
  "unitRequired": true
}
```

### 5. Resposta por alternativas

Para múltipla escolha:

```json
{
  "type": "choice",
  "accepted": ["A"]
}
```

## Eu evitaria depender apenas de “múltiplas strings corretas”

A estratégia de múltiplas possibilidades é boa para começar, mas pode virar um problema de manutenção. Para respostas conceituais, tudo bem. Para respostas numéricas, melhor usar:

```txt
valor esperado + tolerância + unidade esperada + direção opcional
```

Assim, em vez de cadastrar vinte variações de `5 s`, você cadastra uma regra:

```txt
valor = 5
unidade = s
tolerância = 0,01
```

E o sistema aceita:

```txt
5
5s
5 s
5 segundos
5,0 segundos
5.0 s
```

## Fluxo ideal do aluno

Eu imaginaria algo assim:

```txt
Tela 1 — Identificação
- Nome
- Matrícula ou identificador
- Turma, se necessário

Tela 2 — Respostas
Questão 1(a): [campo]
Questão 1(b): [campo]
...
Questão 3(g): [campo]

Tela 3 — Revisão
- Lista de respostas preenchidas
- Botão “Enviar respostas”

Tela 4 — Confirmação
- “Respostas registradas com sucesso”
- Código/recibo da submissão
```

Eu não mostraria nota automaticamente enquanto a prova ainda estiver aberta, a menos que essa seja a intenção pedagógica. Melhor ter uma configuração:

```txt
Mostrar nota ao aluno:
[ ] Nunca
[ ] Após envio
[ ] Somente depois que o professor encerrar a prova
```

Para provas avaliativas reais, eu escolheria por padrão:

```txt
Somente depois que o professor encerrar a prova.
```

## Fluxo ideal do professor

```txt
Tela 1 — Criar prova
- Título da prova
- Disciplina
- Turma
- Data
- Mostrar resultado ao aluno? sim/não
- Permitir reenvio? sim/não
- Encerrar automaticamente? opcional

Tela 2 — Estrutura da prova
- Quantidade de questões
- Subitens por questão
- Pontuação por item

Tela 3 — Gabarito
Para cada item:
- Tipo de correção
- Resposta esperada
- Tolerância, se numérica
- Unidade esperada, se houver
- Alternativas equivalentes, se textual

Tela 4 — Publicação
- Código público
- QR code
- Link de resposta
- Código privado do professor

Tela 5 — Resultados
- Lista de alunos
- Nota total
- Respostas dadas
- Correção item a item
- Exportar CSV
```

## Modelo de dados inicial

Algo próximo disso seria suficiente para o MVP:

```txt
exams
- id
- title
- public_code
- admin_code_hash
- status: draft | open | closed
- show_results_mode
- created_at
- closed_at

exam_items
- id
- exam_id
- label
- statement_optional
- points
- position
- answer_type
- answer_config_json

submissions
- id
- exam_id
- student_name
- student_identifier
- submitted_at
- total_score
- correction_status

submission_answers
- id
- submission_id
- item_id
- raw_answer
- normalized_answer
- is_correct
- score_awarded
- correction_details_json
```

O campo mais importante é:

```txt
answer_config_json
```

Porque ele permite guardar configurações diferentes de correção sem precisar mudar o schema toda hora.

Exemplo para resposta textual:

```json
{
  "type": "text_exact",
  "accepted": ["MASSA"]
}
```

Exemplo para resposta numérica:

```json
{
  "type": "number",
  "value": 5,
  "tolerance": 0.01,
  "acceptedUnits": ["S", "SEGUNDO", "SEGUNDOS"],
  "unitRequired": false
}
```

Exemplo para múltipla escolha:

```json
{
  "type": "choice",
  "accepted": ["A"]
}
```

## Normalização mínima

A normalização deveria fazer pelo menos isto:

```txt
- converter para maiúsculas;
- remover espaços extras;
- normalizar acentos (lembrar de Ç = C);
- trocar vírgula decimal por ponto;
- remover espaços entre número e unidade quando útil;
- converter palavras simples para números, se desejado;
- tratar plural/singular de unidades;
- mapear sinônimos.
```

Exemplo:

```txt
"  cinco   segundos " → "5 SEGUNDO"
"5,0 s" → "5.0 S"
"o mesmo" → "O MESMO"
"à mesma" → "A MESMA"
```

Eu criaria um pipeline assim:

```txt
raw answer
→ trim
→ Unicode normalize
→ uppercase
→ remove duplicated spaces
→ normalize accents
→ normalize decimal comma
→ normalize known synonyms
→ parse according to answer type
→ compare
```

## Segurança sem cadastro

Dá para não ter cadastro, mas eu colocaria algumas proteções mínimas.

Primeiro: códigos longos e não sequenciais.

Ruim:

```txt
PROVA123
```

Melhor:

```txt
NAT-2026-F4K9Q2
```

Para acesso do professor, melhor ainda:

```txt
admin token: 32+ caracteres aleatórios
```

Segundo: separar link de aluno e link de professor.

```txt
/aluno/NAT-2026-F4K9Q2
/professor/resultado/um-token-longo-privado
```

Terceiro: não expor gabarito via API pública antes da prova ser encerrada.

Quarto: armazenar o código administrativo com hash, não em texto puro.

Quinto: rate limit básico para evitar spam de submissões.

## Duplicidade de respostas

Como não haverá login, você precisa decidir como tratar múltiplos envios do mesmo aluno.

Opções:

### Opção A — permitir múltiplos envios

Mais simples. O sistema mantém o último envio.

```txt
Mesmo nome + mesma matrícula + mesma prova → atualiza tentativa anterior.
```

### Opção B — bloquear reenvio

Mais rígido. IMPORTANTE: Está é a minha preferência

```txt
Mesmo identificador não pode enviar de novo.
```

### Opção C — permitir reenvio até a prova fechar

Provavelmente a melhor para o MVP.

```txt
Enquanto a prova estiver aberta, o aluno pode corrigir.
Após fechar, não pode mais.
```

## Estatísticas úteis para o professor

Além da nota, o app poderia mostrar:

```txt
- média da turma;
- mediana;
- maior nota;
- menor nota;
- distribuição de notas;
- percentual de acerto por questão;
- questões mais erradas;
- respostas mais frequentes por item;
- alunos que não responderam algum item;
- exportação CSV.
```

A estatística mais valiosa pedagogicamente é o **percentual de acerto por item**, porque mostra quais conceitos precisam ser retomados.

## Nome funcional do produto

Algumas opções:

```txt
Gabarito Web
ProvaCheck
Correção Rápida
RespondeProva
Gabaritador
ProvaQR
```

Para um projeto acadêmico simples, eu gosto de:

```txt
ProvaQR
```

É direto, memorável e explica bem a mecânica.

## Stack recomendada para o MVP

Eu faria assim:

```txt
Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS v4
- React Hook Form ou formulário controlado simples
- Zod para validação

Backend:
- Node.js
- Fastify ou Hono
- SQLite
- Drizzle ORM ou Kysely
- QR code generator

Deploy:
- VPS simples
- Caddy ou Nginx como reverse proxy
- SQLite em volume persistente
- backup automático do arquivo .sqlite
```

React com Vite é uma opção natural para um SPA leve, e o próprio ecossistema do React documenta caminhos com ferramentas como Vite, Parcel ou RSBuild para projetos montados do zero. ([React](https://react.dev/learn/creating-a-react-app?utm_source=chatgpt.com)) Tailwind v4 também combina bem com esse cenário porque possui plugin oficial para Vite. ([Tailwind CSS](https://tailwindcss.com/blog/tailwindcss-v4?utm_source=chatgpt.com))

## Minha recomendação arquitetural

Eu não começaria com Next.js, autenticação completa, multi-tenant complexo, painel institucional etc.

Começaria com um MVP enxuto:

```txt
1. Criar prova
2. Criar itens
3. Definir gabaritos
4. Gerar QR code
5. Receber respostas
6. Corrigir automaticamente
7. Mostrar resultados ao professor
8. Exportar CSV
```

Depois, em uma segunda fase:

```txt
9. Banco de provas
10. Importação/exportação JSON
11. Correção parcial
12. Respostas numéricas com unidade
13. Relatórios por questão
14. Modo simulado para alunos
15. Geração de gabarito a partir de planilha
```

Tipos de correção no escopo do MVP
A proposta lista 5 tipos de validação (texto exato, numérico com/sem tolerância, numérico com unidade obrigatória, múltipla escolha). Implementar todos de uma vez aumenta bastante a complexidade do gabarito e da normalização (parsing de unidades, sinônimos, direção vetorial etc.).

Quais tipos de correção devem entrar no MVP inicial?

✅ A. Apenas texto exato normalizado (com lista de variantes aceitáveis) + múltipla escolha + verdadeiro ou falso 

B. Texto exato + múltipla escolha + numérico simples (com tolerância, sem unidade)

C. Todos os tipos, incluindo numérico com unidade obrigatória e sinônimos de unidade

Identificação do aluno
Como o aluno deve se identificar ao responder, dado que não há cadastro/login?

✅A. Nome + matrícula (texto livre, sem validação de unicidade)

B. Apenas nome (mais simples, mas maior risco de duplicidade/confusão)

C. Nome + matrícula, com verificação de duplicidade (bloqueia/avisa se a matrícula já enviou)

Política de reenvio de respostas
Você indicou preferência pela Opção B (bloquear reenvio) no texto, mas também mencionou a Opção C (permitir reenvio até a prova fechar) como "provavelmente a melhor para o MVP". Qual devemos adotar?

✅A. Bloquear reenvio: uma vez enviado, não pode mais editar (sua preferência declarada)

B. Permitir reenvio/edição enquanto a prova estiver com status "aberta"

C. Permitir reenvio ilimitado (sempre mantém a última tentativa, mesmo com prova aberta ou fechada)

Visibilidade da nota para o aluno
Qual deve ser o comportamento padrão (configurável ou fixo) para quando o aluno pode ver sua nota/gabarito?

A. Configurável pelo professor por prova (nunca / após envio / somente após encerramento) — mais flexível, mais complexo

✅B. Fixo: somente após o professor encerrar a prova (comportamento único, mais simples de implementar)

C. Fixo: imediatamente após o envio (feedback instantâneo)

Estrutura de questões e subitens
O gabarito pode ter questões com subitens (ex: 1a, 1b, 3g). Como deve funcionar a pontuação nesse caso?

✅A. Pontuação apenas no nível do subitem (item folha); questão é só um agrupador visual

B. Pontuação tanto na questão quanto nos subitens, com soma automática

C. Sem subitens no MVP — cada questão é um único item de resposta/pontuação (simplifica bastante o modelo de dados)

Escopo de segurança e stack para o MVP
Sobre as recomendações de segurança (hash do código admin, rate limiting, tokens longos) e a stack de backend sugerida (Fastify/Hono + Drizzle/Kysely) — como deseja proceder?

✅A. Adotar a stack sugerida (Node.js + Fastify/Hono + SQLite + Drizzle ORM) e todas as proteções básicas de segurança já no MVP

B. Adotar a stack, mas simplificar segurança no MVP (códigos longos aleatórios, sem hash/rate-limit ainda — adicionar depois)

C. Quero discutir/alterar a escolha de stack antes de prosseguir

Estatísticas no MVP
A lista de estatísticas sugeridas é extensa (média, mediana, distribuição, % de acerto por item, respostas mais frequentes, exportação CSV). Quais devem entrar no MVP inicial?

✅A. Apenas nota individual por aluno + lista de submissões (sem estatísticas agregadas ainda)

B. Nota individual + média/mediana da turma + % de acerto por item + exportação CSV

C. Conjunto completo de estatísticas descrito na proposta (incluindo distribuição de notas e respostas mais frequentes)

Nome do produto
Você sugeriu "GabaritoWEB" como nome funcional. Podemos adotar esse nome para o projeto/epic?

✅ A. Sim, usar "GabaritoWEB"

B. Não, quero sugerir outro nome

C. Sem preferência / não é importante agora

Detalhe: pontuação de questão com subitens
Você escolheu "pontuação tanto na questão quanto nos subitens, com soma automática". Preciso entender melhor a mecânica pretendida:

A. A questão tem uma pontuação própria (ex: nota de "abertura"/participação) SOMADA à soma dos subitens (ex: Questão 1 = 2 pts fixos + soma de 1a+1b+1c)

✅ B. A questão não tem resposta própria; sua "pontuação" é apenas o total exibido, calculado automaticamente como a soma dos subitens (não há pontos extras na questão-mãe)

C. Depende da questão: o professor decide se uma questão terá subitens (soma automática) OU será um item único com resposta e pontuação próprias (não ambos ao mesmo tempo)


Ótimo, todas as decisões estão alinhadas e sem ambiguidades pendentes. Aqui está o resumo consolidado do escopo do GabaritoWEB (MVP) que ficou definido:

Escopo Consolidado do MVP
Tipos de correção: apenas texto exato normalizado (com lista de variantes aceitáveis), múltipla escolha e verdadeiro/falso. Numérico com tolerância/unidade fica para fase 2.

Identificação do aluno: nome + matrícula, texto livre, sem verificação de unicidade.

Reenvio de respostas: bloqueado — uma vez enviado, não pode mais editar.

Visibilidade da nota: fixo, somente após o professor encerrar a prova (sem opção configurável no MVP).

Estrutura de questões/subitens:

Questões podem ter subitens (1a, 1b, ...).
A pontuação existe apenas no nível do subitem (item folha).
A questão-mãe não tem resposta nem pontos próprios; sua "pontuação" exibida é somente a soma automática dos subitens.
Questões sem subitens seriam, na prática, um único "subitem" com pontuação própria (para manter o modelo consistente).
Segurança: adotar todas as proteções básicas já no MVP — códigos longos e não sequenciais, hash do código administrativo do professor, separação entre link do aluno e link do professor, gabarito não exposto via API antes do encerramento da prova, rate limit básico contra spam de submissões.

Estatísticas no MVP: apenas nota individual por aluno + lista de submissões. Sem estatísticas agregadas (média, mediana, % de acerto por item etc.) por enquanto — fica para fase 2.

Nome do produto: GabaritoWEB.

Stack:

Frontend: React + TypeScript + Vite + Tailwind CSS v4, formulário controlado (ou React Hook Form) + Zod.
Backend: Node.js + Fastify (ou Hono) + SQLite + Drizzle ORM (ou Kysely).
QR code gerado no backend/frontend a partir do código público da prova.
Deploy: VPS + Caddy/Nginx como reverse proxy, SQLite em volume persistente com backup do arquivo .sqlite.
Um ponto que ainda merece nota (não bloqueante)
Como as questões sem subitens também precisam de pontuação e resposta, no modelo de dados o mais limpo é tratar toda questão como tendo pelo menos 1 subitem "implícito" — ou seja, exam_items sempre representa um item-folha respondível e pontuável, e o agrupamento em "questão" é só um campo (question_number + sub_label opcional) usado para exibição. Isso evita ter dois modelos de dados diferentes (questão-com-subitens vs. questão-sem-subitens) e simplifica bastante o schema e a lógica de correção/soma. Vou seguir essa abordagem ao elaborar a especificação técnica, a menos que você prefira o contrário.

Como o repositório está vazio (projeto novo), o próximo passo natural é formalizar tudo isso em specs técnicas (modelo de dados, fluxos, contratos de API) e, se aplicável, tickets de implementação — mas isso depende do workflow que você deseja seguir a partir daqui.

Suggested Next Steps
Não há um workflow específico configurado nesta conversa até o momento. Sugiro prosseguir com um dos seguintes caminhos:

**Confirmado:** a abordagem "toda questão é um item-folha respondível, com agrupamento visual" para o modelo de dados, é mais simple e atende bem!


Solicito agora a elaboração das especificações técnicas (SDD) detalhando modelo de dados, fluxos de aluno/professor, contratos de API e regras de normalização/correção.
Solicitar a quebra em tickets de implementação para o MVP, uma vez que as specs estejam definidas. pergunte-me se ficou algo em aberto...