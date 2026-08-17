# Formato JSON do gabarito

Este documento explica o arquivo JSON usado para **importar** e **exportar** o gabarito de uma prova no GabaritoWEB.

O arquivo de exemplo completo está em [`exemplo-gabarito-completo.json`](./exemplo-gabarito-completo.json). Você pode importá-lo na tela **Configurar Prova** para ver o resultado na interface.

***

## 1. Para que serve

O JSON descreve **só o gabarito**: título da prova, lista de itens respondíveis e as respostas oficiais de cada um.

Ele **não** contém:

* o enunciado das questões (o sistema não armazena o texto da prova);
* dados de alunos, notas ou submissões;
* códigos da prova (`G26-XXXXXX`) nem o token do professor (`adm_XXXXXX`).

Pense nele como uma **folha de respostas do professor**, não como a prova impressa.

***

## 2. Como importar e exportar

**Importar** (tela *Configurar Prova*):

1. Clique em **Importar** e escolha um `.json`.
2. Confirme. As questões da tela são **substituídas** pelas do arquivo (não são mescladas).
3. Revise título, tipos e gabaritos e então publique a prova.

**Exportar:**

* Na criação da prova, o botão de download gera este mesmo formato.
* No painel do professor (aba do gabarito), **Exportar gabarito** também gera este formato.

O arquivo baixado pode ser reimportado depois (ida e volta). O nome típico é `gabarito-<titulo-da-prova>.json`.

Use UTF-8, sem comentários e **sem vírgula no último elemento** de listas ou objetos (JSON padrão).

***

## 3. Esqueleto

Todo arquivo válido tem exatamente esta forma:

```json
{
  "title": "Nome da prova",
  "items": [
    { "... um item ..." },
    { "... outro item ..." }
  ]
}
```

| Campo   | Tipo     | Obrigatório | Descrição                                      |
| ------- | -------- | ----------- | ---------------------------------------------- |
| `title` | string   | sim         | Título da prova. Não pode ser vazio.           |
| `items` | array    | sim         | Lista de itens. Precisa ter **pelo menos um**. |

No servidor, o título tem no máximo **200** caracteres e a prova no máximo **500** itens. A importação só preenche o formulário; esses limites valem na hora de **criar** a prova.

Campos extras no objeto raiz (por exemplo uma nota sua) são ignorados na importação. Não use isso como documentação permanente: o export não os devolve.

***

## 4. O que é um “item”

Cada elemento de `items` é **um espaço de resposta** na folha do aluno — não necessariamente “uma questão da prova impressa”.

Exemplos:

* Questão 1 sem letras → **um** item (`questionNumber: 1`, `subLabel: ""`).
* Questão 2 com itens a–f → **seis** itens, todos com `questionNumber: 2` e `subLabel` `"a"` … `"f"`.

A ordem no array é a ordem em que os itens aparecem na tela e para o aluno.

### Campos comuns (todos os tipos)

```json
{
  "questionNumber": 1,
  "subLabel": "",
  "points": 1,
  "answerType": "choice"
}
```

| Campo            | Tipo   | Obrigatório | Regras                                                                                          |
| ---------------- | ------ | ----------- | ----------------------------------------------------------------------------------------------- |
| `questionNumber` | número | sim         | Inteiro ≥ 1. **Tem de ser número JSON** (`1`), não texto (`"1"`).                               |
| `subLabel`       | string | não         | Só letras `a–z`. Vazio `""` = sem subitem. No máximo 3 caracteres. Importação ignora o resto. |
| `points`         | número | sim         | Maior que zero. Frações são permitidas (`0.5`, `1.25`). Também deve ser número, não texto.      |
| `answerType`     | string | sim         | Um de: `choice`, `true_false`, `short_text`, `numerical`.                                       |

Além disso, conforme o tipo:

* `choice`, `true_false` e `short_text` usam o array **`accepted`** no próprio item;
* `numerical` usa o objeto **`answer_config`** (nome com *underscore*).

Não misture: uma questão de múltipla escolha **não** leva `answer_config`; uma numérica **não** usa `accepted`.

***

## 5. Numeração e subitens

`questionNumber` é o número que o aluno vê (`1`, `2`, `7`…).\
`subLabel` é a letra do subitem (`a`, `b`, `c`…).

Regras:

1. **Questão única** — um item com aquele número e `subLabel` vazio.
2. **Questão com subitens** — vários itens com o **mesmo** `questionNumber` e `subLabel` diferentes. Se o número se repete, **todos** precisam de subitem preenchido.
3. **Não duplicar** o par número + subitem (`2` + `"a"` duas vezes é inválido na publicação).
4. Tipos **podem** misturar na mesma questão: `2a` verdadeiro/falso e `2b` numérica, apesar de muito incomum, é permitido, porque cada linha é um item independente.

A importação normaliza o subitem: `"A"` vira `"a"`; `"2a"` perde o dígito e vira `"a"`; caracteres que não são letras são removidos.

Na tela, o aluno vê algo como **Q2A**, **Q2B** (número + subitem em maiúsculas).

***

## 6. Tipos de questão

### 6.1 Múltipla escolha — `choice`

O aluno marca uma letra. Na interface as opções são **A, B, C, D, E**.

```json
{
  "questionNumber": 1,
  "subLabel": "",
  "points": 1,
  "answerType": "choice",
  "accepted": ["A"]
}
```

* `accepted` precisa ter **pelo menos uma** string.
* O valor usual é uma única letra: `"A"`, `"B"`, `"C"`, `"D"` ou `"E"`.
* Na correção, tudo que não for letra é ignorado e a comparação é em maiúsculas. `"a"` e `"A"` equivalem.

### 6.2 Verdadeiro ou falso — `true_false`

```json
{
  "questionNumber": 2,
  "subLabel": "a",
  "points": 0.5,
  "answerType": "true_false",
  "accepted": ["V"]
}
```

No gabarito use **`"V"`** ou **`"F"`** (um único valor).

O aluno, na hora de responder, pode escrever variações; o servidor as reduz a V ou F, por exemplo:

| O aluno escreve                         | Vira |
| --------------------------------------- | ---- |
| `V`, `verdadeiro`, `sim`, `true`, `T`   | `V`  |
| `F`, `falso`, `não`, `nao`, `false`, `N` | `F`  |

Acentos não importam (`não` = `nao`). No JSON do gabarito, mesmo assim, grave só `"V"` ou `"F"`.

### 6.3 Texto curto — `short_text`

Use quando várias redações da mesma resposta devem ser aceitas.

```json
{
  "questionNumber": 3,
  "subLabel": "",
  "points": 1.5,
  "answerType": "short_text",
  "accepted": ["cinco", "5", "5,0", "cinco metros"]
}
```

* `accepted` é a lista de **variações oficiais**. Basta o aluno acertar **uma**.
* Antes de comparar, o servidor: tira espaços extras, remove acentos, troca `ç` por `c` e passa tudo para **MAIÚSCULAS**.
* Por isso `"Água"` no gabarito casa com `"agua"` do aluno.
* Não é busca parcial nem sinônimo automático: só o que você listou (depois da normalização) vale.
* Inclua as formas que você realmente quer aceitar (`"5"` não aceita `"cinco"` a menos que as duas estejam na lista).

***

## 7. Questão numérica — `numerical`

Aqui o gabarito **não** é um texto. É um número esperado, uma tolerância, e opcionalmente unidades com conversão.

O objeto fica em `answer_config` (este nome é com *underscore*; `answerConfig` **não** é lido).

### 7.1 Sem unidade (`unitRequired: false`)

Use quando o enunciado já fixa a unidade (“responda em segundos”) ou quando a resposta é só um número.

**Tolerância absoluta** — aceita um desvio fixo, na mesma unidade do `value`:

```json
{
  "questionNumber": 5,
  "subLabel": "",
  "points": 1,
  "answerType": "numerical",
  "answer_config": {
    "value": 1.45,
    "unitRequired": false,
    "tolerance": { "absolute": 0.01 }
  }
}
```

Intervalo aceito: `[1.44, 1.46]`.\
`1.45`, `1,45` e `1.449` passam; `1.47` não.

**Tolerância relativa** — fração do valor esperado (`0.01` = 1%, `0.005` = 0,5%):

```json
"answer_config": {
  "value": 100,
  "unitRequired": false,
  "tolerance": { "relative": 0.01 }
}
```

Intervalo aceito: `[99, 101]` (1% de 100).

**Valor zero** — relativa não faz sentido (divisão por zero). Use absoluta:

```json
"answer_config": {
  "value": 0,
  "unitRequired": false,
  "tolerance": { "absolute": 0.01 }
}
```

**Valor negativo** é permitido (relativa usa o módulo):

```json
"answer_config": {
  "value": -10,
  "unitRequired": false,
  "tolerance": { "relative": 0.1 }
}
```

Intervalo aceito: `[-11, -9]`.

Com `unitRequired: false` **não** envie `acceptedUnits`. Se o aluno escrever uma unidade que o sistema não reconhece, a resposta é marcada errada (evita aceitar “25 minutos” quando o gabarito era “25” em segundos).

### 7.2 Com unidades (`unitRequired: true`)

O `value` está **sempre na unidade de referência** (canônica). As outras unidades entram com um fator que converte *para* essa referência.

```json
"answer_config": {
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
      "aliases": ["km/h", "quilometro por hora", "kph"]
    }
  ],
  "tolerance": { "relative": 0.005 }
}
```

Algoritmo de correção:

```text
valor_canônico_do_aluno = número_digitado × unitToCanonical da unidade reconhecida
|valor_canônico_do_aluno − value|  ≦  tolerância
```

Exemplo: gabarito `30 m/s`, aluno escreve `108 km/h`:

```text
108 × 0.2777777778 = 30 m/s   → correto (dentro de 0,5%)
```

`100 km/h` → `27.78 m/s` → fora da faixa.

#### Campos de `answer_config` com unidade

| Campo           | Obrigatório                         | Significado                                                                                          |
| --------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `value`         | sim                                 | Número esperado **já na unidade canônica**. Finito (pode ser negativo; zero só com tolerância absoluta). |
| `unitRequired`  | sim                                 | `true` neste modo.                                                                                   |
| `tolerance`     | sim                                 | Só `relative` **ou** só `absolute`, nunca os dois. Valor ≥ 0.                                        |
| `acceptedUnits` | sim se `unitRequired` é `true`      | Lista com pelo menos uma unidade.                                                                    |
| `canonicalUnit` | não                                 | Rótulo da unidade de referência. Se existir, deve ser a mesma que tem `unitToCanonical: 1`.          |

#### Cada entrada de `acceptedUnits`

| Campo              | Obrigatório | Significado                                                                                         |
| ------------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| `unit`             | sim         | Identificador da unidade (`"m/s"`, `"kg"`). O aluno pode escrever exatamente isso.                  |
| `unitToCanonical`  | sim         | Fator **positivo** que multiplica o valor do aluno para chegar na canônica.                         |
| `aliases`          | não         | Textos extras que o aluno pode usar. Lista vazia `[]` é válida: o próprio `unit` já é aceito.       |

Regras importantes:

* **Exatamente uma** unidade deve ter `unitToCanonical: 1`. Essa é a canônica.
* As outras têm fator ≠ 1: `g → kg` usa `0.001` (porque `2000 g × 0.001 = 2 kg`).
* Não coloque duas unidades com fator `1`.
* `aliases` passam pela mesma normalização de texto (maiúsculas, sem acento). `"quilômetros por hora"` e `"quilometros por hora"` equivalem; ainda assim você pode listar as duas.

Como achar o fator: *quanto vale 1 unidade desta lista, medido na canônica?*

| Quero aceitar | Canônica | Fator (`unitToCanonical`)      |
| ------------- | -------- | ------------------------------ |
| `m/s`         | `m/s`    | `1`                            |
| `km/h`        | `m/s`    | `1000/3600` ≈ `0.2777777778`   |
| `mph`         | `m/s`    | `0.44704`                      |
| `kg`          | `kg`     | `1`                            |
| `g`           | `kg`     | `0.001`                        |

### 7.3 Como o número do aluno é lido

* Aceita sinal (`-10`), ponto ou vírgula decimal (`1.45` e `1,45`).
* Se aparecerem **ponto e vírgula**, o **último** é o decimal (`1.234,5` → mil duzentos e trinta e quatro vírgula cinco).
* O restante da string é a unidade, comparada com `unit` e `aliases` já normalizados.
* Sem unidade reconhecida e `unitRequired: true` → incorreto.
* Com texto de unidade não reconhecido e `unitRequired: false` → incorreto.

O comprovante do aluno, depois da correção, mostra o valor **já convertido** para a canônica (por exemplo `"30 m/s"`), não o que ele digitou em km/h.

***

## 8. Mapa rápido dos tipos

| `answerType`   | Onde está o gabarito | Conteúdo típico                                      |
| -------------- | -------------------- | ---------------------------------------------------- |
| `choice`       | `accepted`           | `["A"]` … `["E"]`                                    |
| `true_false`   | `accepted`           | `["V"]` ou `["F"]`                                   |
| `short_text`   | `accepted`           | Uma ou mais strings equivalentes                     |
| `numerical`    | `answer_config`      | `value` + `unitRequired` + `tolerance` (+ unidades)  |

***

## 9. Exemplo mínimo (uma questão)

```json
{
  "title": "Quiz rápido",
  "items": [
    {
      "questionNumber": 1,
      "subLabel": "",
      "points": 1,
      "answerType": "choice",
      "accepted": ["C"]
    }
  ]
}
```

O arquivo [`exemplo-gabarito-completo.json`](./exemplo-gabarito-completo.json) reúne, numa prova só:

* múltipla escolha;
* vários subitens V/F da questão 2;
* texto curto com variações;
* numérica sem unidade (relativa, absoluta e valor negativo);
* numérica com unidades (velocidade, massa e aceleração), inclusive aliases.

***

## 10. Erros frequentes

| Problema | Por quê | O que fazer |
| -------- | ------- | ----------- |
| `"questionNumber": "1"` | A importação exige **número**, não string | Use `1` |
| `"points": "1.5"` | Idem | Use `1.5` |
| `"answerType": "múltipla"` | Só os quatro identificadores abaixo | `choice`, `true_false`, `short_text`, `numerical` |
| `"answerType": "text_exact"` | Nome antigo, rejeitado na importação | Use `short_text` |
| `"answerConfig": { ... }` | O campo correto é `answer_config` | *underscore* |
| `"type": "numerical"` dentro do config | O tipo vive em `answerType` | Não coloque `type` no JSON interno |
| `relative` e `absolute` juntos | O servidor aceita só um modo | Escolha um |
| `value: 0` com só `relative` | Relativa não se aplica a zero | Use `absolute` |
| `unitRequired: true` sem `acceptedUnits` | Precisa de pelo menos uma unidade | Inclua a lista |
| Nenhuma unidade com fator `1` | Falta a canônica | Uma (e só uma) com `unitToCanonical: 1` |
| `acceptedUnits` com `unitRequired: false` | Unidades só quando são obrigatórias | Remova a lista |
| `subLabel` vazio em dois itens com o mesmo número | Subitens obrigatórios se o número se repete | Preencha `"a"`, `"b"`, … |
| Vírgula depois do último item | JSON inválido | Apague a vírgula extra |
| Comentários `//` no arquivo | JSON não admite comentários | Tire-os |

A importação valida o essencial (título, lista, tipo, `accepted` ou `value`/`unitRequired`/`tolerance`). Regras mais finas das questões numéricas (fator 1, tolerâncias misturadas, etc.) são cobradas de novo **ao publicar** a prova. Se o arquivo importar mas a criação falhar, leia a mensagem do servidor: em geral é uma das linhas da tabela acima.

***

## 11. Ida e volta (export → import)

O que o sistema **grava no export** é o que você deve imitar:

* `subLabel` vazio como `""`, não `null`.
* Questões não numéricas com `accepted` no item.
* Questões numéricas com `answer_config` contendo `value`, `unitRequired`, `tolerance` e, se couber, `acceptedUnits` e `canonicalUnit`.
* `canonicalUnit` é preenchido automaticamente na exportação a partir da unidade de fator 1; na importação é opcional.
* Um campo interno de tela (`expected_label`) **não** deve ir no arquivo; o export do painel já o remove.

Forma alternativa aceita só na importação de numéricas: colocar `value`, `unitRequired`, `tolerance` e `acceptedUnits` **direto no item**, sem `answer_config`. Prefira sempre `answer_config`, que é o que o export gera.

***

## 12. Lembrete pedagógico

1. Este JSON é o **gabarito**, não a prova.
2. Um item = um espaço de resposta = um `questionNumber` + um `subLabel`.
3. Três tipos textuais usam `accepted`; o numérico usa `answer_config`.
4. No numérico, grave o valor **na unidade de referência** e ensine as outras com `unitToCanonical`.
5. Tolerância: **um** modo só; zero exige absoluta.
6. `questionNumber` e `points` são números JSON, não texto.
