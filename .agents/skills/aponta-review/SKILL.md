---
name: aponta-review
description: Revisar independentemente o SHA entregue pelo Developer do Aponta e devolver aprovação, rejeição comprovada ou bloqueio operacional com evidências.
---

# Revisão independente

Receba base/head SHA, critérios de aceite, SPEC e evidências de testes. Verifique o diff exato e o estado de trabalho. Não revise apenas o último commit por conveniência quando a entrega envolver vários commits.

Confirme o vínculo canônico GitHub/Multica, o manifest e execute `python3 scripts/aponta_delivery.py check --manifest .delivery/deliveries/DMTE-N.json`. Não altere o manifest para aprovar o próprio achado. Quando a avaliação for conclusiva, o comentário final contém uma única linha `RESULTADO=APROVADO` ou `RESULTADO=REJEITADO` e o SHA completo de 40 caracteres. `RESULTADO=BLOQUEADO` é usado quando falta ambiente/acesso/artefato/contexto essencial para avaliar; SHA só é declarado se conhecido. Somente APROVADO conclusivo habilita o publicador Independent QA. Não publique esse check sem revisão atribuível nem aprove SHA diferente.

Reproduza os testes relevantes com cache desativado, confira lint/typecheck e execute E2E quando o escopo ou risco exigir. Examine RBAC, filtros entre tenants, validação de entrada e regressões nos consumidores. Para UI/DS, use `aponta-storybook`; para alterações comportamentais, confira a evidência `aponta-tdd`. Identifique ambiente quebrado separadamente de defeito do produto.

Inspecione o motivo do RED, não apenas exit code. Se há `ModuleNotFoundError`/`ImportError` ou erro de setup, rejeite essa evidência de TDD mesmo com GREEN posterior. Atribua um veredito separado a conformidade funcional e conformidade TDD; uma aprovação funcional não deve esconder prova de processo ausente.

Na revisão de entrega, use um resultado geral inequívoco: `RESULTADO=APROVADO` somente se todos os gates aplicáveis passaram ou há exceção explícita documentada; defeito ou desconformidade comprovados geram `RESULTADO=REJEITADO`; avaliação impedida por requisito operacional ausente gera `RESULTADO=BLOQUEADO`, com verificações não executadas explícitas. A aprovação funcional isolada não libera Delivery quando a conformidade TDD exigida foi rejeitada.

Entregue um resultado conclusivo `APROVADO`/`REJEITADO`, ou `BLOQUEADO` quando não for possível avaliar, SHA exato quando conhecido, critérios e verificações, achados com severidade, arquivo/localização e reprodução. Achado Important ou superior impede aprovação. Não implemente a correção no papel de QA nem autoaprove mudanças feitas por você.

Conclua rodadas APROVADO/REJEITADO com comentário e `done`, inclusive na rejeição; BLOQUEADO permanece `blocked`; o líder encaminha uma nova sub-issue ao Developer e depois uma nova revisão. Falta de contexto necessário ou indisponibilidade de ambiente é BLOQUEADO: manter a própria etapa blocked, notificar individualmente o líder na issue pai com menção estruturada válida, causa/pergunta/responsável e referência do filho. Não marcar done para forçar a barreira nem inventar reprovação de código. Após complemento suficiente, o líder reativa a mesma fase sem nova rodada de correção por simples espera. Após duas rodadas rejeitadas para a mesma causa ou dois erros idênticos de infraestrutura, peça avaliação do líder em vez de repetir indefinidamente.


## Expectativa e UI

Leia as fontes de alinhamento e a referência visual/fluxo confirmadas, não apenas o SPEC resumido. Se o SPEC divergir de uma decisão humana vigente, registre achado de escopo/entendimento e devolva ao líder; não aprovar por aderir ao documento errado. Decisão essencial ausente impede avaliação da intenção e deve ser declarada como bloqueio. Para UI, conferir estados/perfis/responsividade pertinentes e DS/Storybook; distinguir teste comportamental, comparação visual a baseline aprovada e aceite humano. Não fabricar baseline nem atribuir aceite ao usuário por screenshot ou build verde.
