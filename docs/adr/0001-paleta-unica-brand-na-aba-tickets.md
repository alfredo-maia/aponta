---
status: accepted
---

# Paleta única `brand-*` do DS na aba Tickets

A aba Tickets usava dois verdes (`brand-600` #008561 e `#00B5A5` fixo) e cores de fora do DS (`teal-*`, `emerald-*`, `rose-*` e degraus de `gray` que o DS não define). Decidimos que o verde `brand-*` e as paletas semânticas do DS são a única fonte de cor da aba, sem hex literal, em decisão confirmada pelo Alfredo no DMTE-427.

## Considered Options

- Adotar o verde-água `#00B5A5` como marca: rejeitado, pois contradiz a paleta oficial Sankhya (`brand-*`) que o resto do Aponta usa.
- Manter os dois verdes por tela: rejeitado, é a incoerência que o pedido quer eliminar.

## Consequences

O detalhe do ticket e os apontamentos mudam de tom. Um token novo precisa entrar no `@theme` quando o DS não tiver o valor necessário, em vez de um hex local. Uma checagem estática no CI passa a impedir a volta de hex e de classes de paleta fora do DS na aba.
