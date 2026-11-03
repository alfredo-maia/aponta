---
name: aponta-tdd
description: Coletar ou auditar evidências RED/GREEN do Aponta como complemento ao método tdd original do Matt.
---

# Evidências Aponta para TDD

O método é a skill tdd original, incluindo testes em seams confirmadas e refatoração na etapa de revisão. Este perfil define somente captura e auditoria das evidências do projeto.

Para mudanças de comportamento, escreva o teste que demonstra o defeito ou novo comportamento e execute-o antes da implementação. RED deve falhar pela expectativa comportamental correta; erro de sintaxe, dependência ou ambiente não substitui a evidência de RED.

Se o módulo/função ainda não existe, crie primeiro apenas o stub com assinatura importável e comportamento neutro (por exemplo, retornar a entrada), sem satisfazer o critério. Confirme que o runner executou o teste e falhou na asserção do comportamento; só então conte o RED. `ModuleNotFoundError`, `ImportError`, arquivo ausente e falha de setup são preparação incompleta, não RED aceito.

Implemente o mínimo para GREEN e execute o mesmo teste; refatorações ocorrem na revisão conforme tdd/code-review originais. Use Jest/Nest TestingModule no backend e Vitest/Testing Library no frontend conforme o projeto existente; Playwright cobre integração e jornadas. Escolha a camada que prova o comportamento sem reproduzir detalhes internos desnecessários.

Use o coletor `scripts/aponta_delivery.py record` do checkout para guardar RED/GREEN, base, hashes dos testes/fontes e critérios. O contrato em docs/delivery/WORKFLOW.md mostra a sintaxe. O mesmo comando e os mesmos testes devem passar na verificação `check --manifest .delivery/deliveries/DMTE-N.json`. Não escreva JSON de resultados para substituir uma execução ausente; legados sem prova ficam explicitamente pendentes de revisão.

No resultado registre: critério `AC`, arquivo/teste, comando, horário e saída resumida de RED e GREEN, além do SHA final e gates executados. Guarde saída integral em artefato local apropriado sem credenciais. Teste existente que já falha pela regressão pode ser o RED; documente a sequência real, sem fabricar prova retroativa.

QA verifica a evidência de RED/GREEN, confere que o teste cobre o critério e reproduz GREEN no SHA entregue. RED por import/setup deve ser explicitamente REJEITADO como prova de TDD, mesmo que o GREEN final passe. Sem evidência comportamental, declare `TDD não comprovado` e peça a prova ou uma exceção explícita adequada ao escopo. Não fabrique prova retroativa nem trate presença de testes ou cobertura como prova de TDD.

Documentação sem comportamento e alterações puramente mecânicas podem justificar `TDD não aplicável`, com validação proporcional ao risco. Não crie testes sem valor só para preencher o relatório.
