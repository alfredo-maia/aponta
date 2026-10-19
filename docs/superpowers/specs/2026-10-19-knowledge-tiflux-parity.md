## Painel de Conhecimentos — paridade TiFlux (DMTE-79, rodada 2)

Segunda investigação do painel de conhecimentos do TiFlux (login + navegação via
Playwright, telas de criação/edição e do "Compartilhar"). O PR #81 (já em
`in_review`) cobriu ordenação, multi-tag, autor/data e alternador Lista/Grade —
escopo Tier 2. Esta rodada mapeia o que falta e eleva o escopo para **Tier 3**:
requer SDD completo, TDD, sub-agente de code review e proíbe commit sem
aprovação do reviewer, conforme a regra do Aponta para feature grande.

### O que foi observado no TiFlux (evidência desta investigação)

1. **Pasta (hierarquia)** — `/v/knowledge_folders` lista pastas (ícone emoji,
   nome, descrição, contagem de conhecimentos); cada pasta abre
   `/v/knowledge_folder/:id` com a lista de artigos daquela pasta.
2. **Catálogo** — não é "cliente": é o **Catálogo de Serviços** (combobox
   multi-select ao criar um conhecimento, ex. "Serviços de Backup / Auditoria
   / Auditoria nos backups"). Vincula o artigo a item(ns) de um catálogo de
   serviços hierárquico (Categoria / Subcategoria / Serviço).
3. **Vincular a um cliente** — dentro do diálogo **Compartilhar** do artigo:
   campo "Clientes" (multi-select de Organizations) + "Grupos de atendentes"
   (multi-select) definem quem vê o artigo quando ele é Privado, com uma
   checkbox "Adicionar novos clientes automaticamente".
4. **Editor de texto** — WYSIWYG completo no formulário de criação: bloco
   (parágrafo/título), fonte, tamanho, negrito/itálico/sublinhado/tachado,
   cor, copiar/limpar formatação, listas ordenada/não ordenada, recuo,
   alinhamento, altura de linha, inserir tabela/link/emoji/arquivo inline,
   preview, desfazer/refazer, contador de caracteres/palavras.
5. **Anexo (máx. 25MB)** — botão "Anexar arquivo" dedicado (diferente do
   "inserir arquivo" inline do editor) com a legenda "Tamanho máximo 25MB"; o
   artigo salvo mostra "Anexos (N)" com link de download.
6. **Compartilhamento** — diálogo "Compartilhar" por artigo: **Tipo de
   acesso** = Público ou Privado; quando Privado, visibilidade por Grupos de
   atendentes e/ou Clientes (item 3).
7. **Apresentação inicial agrupada por pasta** — tela inicial de
   Conhecimentos é a grade de pastas (item 1), não uma lista plana de artigos.
8. **Base pública ou não — duas camadas distintas**:
   - Por artigo (item 6): Público/Privado.
   - Global: um **portal público sem login**, branded, em
     `/r/externals/knowledges/list/:id`, acessível via "Acessar a base" /
     "Copiar link" a partir do botão "Base pública". Mostra só pastas/artigos
     marcados como públicos (confirmado: uma pasta com 60 artigos
     internamente aparece com 27 no portal público).
9. **Extras identificados (não pedidos explicitamente, mas presentes)**:
   - Contador de visualizações por artigo ("Visto N vezes").
   - Avaliação de conhecimento (toggle em Configurações: "Ativar avaliações",
     com link para o guia "avaliacao-de-conhecimentos") — feedback do tipo
     útil/não útil por quem lê.
   - "Escrito por" + "Atualizado em" na página de detalhe (já portado no PR
     #81 na listagem; falta na página de detalhe, que ainda não existe no
     Aponta — hoje os artigos só abrem inline na própria listagem).

### Mapeamento para o Aponta (reuso de modelos já existentes)

- **Grupos de atendentes** → já existe como `AgentGroup` (Prisma), usado em
  Organizations (`agentGroups: AgentGroup[]`). Reusar, não recriar.
- **Clientes** → já existe `Organization`. Reusar para o multi-select de
  "Clientes" do Compartilhar.
- **Anexos com limite de tamanho** → já existe o padrão em
  `apps/api/src/tickets/attachments.controller.ts` (multer `diskStorage`,
  `FileInterceptor`, `limits.fileSize`, `fileFilter` por MIME). Replicar o
  mesmo padrão para conhecimentos, com `MAX_FILE_SIZE = 25 * 1024 * 1024`.
- **Editor rico** → gap real; Aponta usa `EzTextArea` (textarea simples) em
  todo lugar. Precisa de uma biblioteca WYSIWYG nova (ex. Tiptap) — primeira
  vez que isso entra no projeto; decisão de arquitetura, não só de UI.
- **Catálogo de Serviços** → gap real; não existe nenhum conceito de catálogo
  de serviços no Aponta hoje (Contracts tem "modalidades comerciais", mas é
  billing, não um catálogo hierárquico de tipos de serviço). Precisa de
  modelo novo (`ServiceCatalogItem`, hierárquico) ou, alternativa mais barata,
  reaproveitar `tags` já existente — a definir (ver decisão de produto
  abaixo).
- **Pasta (hierarquia)** → gap real; precisa de `KnowledgeFolder` novo
  (self-relation para subpastas, ou achatado em 1 nível — a confirmar) e
  `Article.folderId`.
- **Portal público sem login** → gap real; precisa de uma rota pública nova
  no `apps/web` (fora do `AppLayout` autenticado) e um endpoint público no
  `apps/api` que force `isPublic = true` e filtre por pasta pública.

### Decisões de produto — defaults adotados (sem resposta explícita a tempo)

Como a confirmação ficou em "vamos lá" sem escolher entre as alternativas,
segui com o default de menor risco/escopo em cada ponto, deixando registrado
para correção a qualquer momento:

1. **Catálogo de Serviços** → default: recorte simplificado. `ServiceCatalogItem`
   **flat** (sem árvore de 3 níveis como o TiFlux), many-to-many com `Article`,
   administrado por uma lista simples (sem tela de árvore). Entra no Stage 2.
2. **Pasta** → default: **1 nível** (pasta simples, sem subpasta). Mantém a
   "apresentação inicial agrupada por pasta" sem o custo de uma árvore
   recursiva. Entra no Stage 1.
3. **Editor rico** → default: **Tiptap** (headless, React-first, extensível
   por plugins) como a lib WYSIWYG nova do projeto. Entra no Stage 3.
4. **Avaliação de conhecimento e contador de visualizações** → default:
   **entram como extras no Stage 4** (menor prioridade, não bloqueiam as
   fases anteriores).

### Faseamento (Tier 3 — SDD → TDD → review → commit, por fase)

Dado o tamanho, a entrega em uma única PR seria arriscada demais para revisar
e testar com qualidade. 4 sub-issues (stages) sob a DMTE-79, cada uma com seu
próprio ciclo TDD + code-review antes do commit:

1. **Stage 1 — Pastas**: `KnowledgeFolder` (Prisma, 1 nível), `Article.folderId`,
   tela inicial agrupada por pasta (grade), breadcrumb pasta → artigos.
   Pré-requisito de tudo mais.
2. **Stage 2 — Compartilhamento, ACL e Catálogo**: `Article.visibility`
   (PUBLIC/PRIVATE), join tables `Article↔AgentGroup` e `Article↔Organization`
   (reusando os models já existentes), `ServiceCatalogItem` flat +
   `Article↔ServiceCatalogItem`, diálogo "Compartilhar" na UI.
3. **Stage 3 — Editor rico e anexos**: trocar `EzTextArea` por Tiptap no
   formulário de artigo; `KnowledgeAttachment` (Prisma) seguindo o padrão de
   `attachments.controller.ts`, limite de 25MB.
4. **Stage 4 — Portal público e extras**: rota pública sem login
   (`/r/knowledge/...` no Aponta, filtrando só o que é público), contador de
   visualizações, avaliação de conhecimento.

Cada stage sai em PR próprio, com testes e um sub-agente revisor antes do
commit — nenhuma fase fecha sem isso. Stage 1 começa agora; Stages 2-4 ficam
parked (`backlog`) e são promovidos um a um quando a barreira do stage
anterior fechar.
