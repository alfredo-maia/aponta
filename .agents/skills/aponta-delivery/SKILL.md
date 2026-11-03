---
name: aponta-delivery
description: Verificar e registrar a entrega do Aponta no SHA aprovado, respeitando que o usuário gerencia merge e deploy.
---

# Entrega verificável sob gestão do usuário

Receba identidade canônica, SHA aprovado por QA, PR e CI. Confirme que todos se referem ao mesmo artefato. Consulte `.delivery/registry.json` e docs/delivery/WORKFLOW.md.

O usuário declarou que cuidará do deploy. Não altere nem acione CD, não faça merge/push na main, SSH, sudo ou comandos Docker de produção. Quando depender do usuário, registre RESULTADO=BLOQUEADO, dependência, responsável e evento de retomada; responda no fio da menção, sem alterar o status do pai. Não faça polling ou redeploy paralelo.

Após o usuário fornecer confirmação de publicação, confira saúde e comportamento pertinente, sem usar dados sensíveis ou alterar produção além do escopo autorizado. Diferencie merge, implantação e aceite; HTTP 200 na raiz não comprova a funcionalidade. Registre evidências e limitações; não invente o SHA implantado se não puder verificá-lo.

Só após prova de entrega atualize issue GitHub e board e registre o resultado no fio. O líder consolida o pai Multica. A quinzena não obriga publicar entregas incompletas.

Para mudanças somente de governança/documentação, registre quando deploy do produto não se aplica; política em branch/PR só está publicada quando integrada na main. Em MODO=VALIDACAO_ESTEIRA, execute apenas a simulação local solicitada, declarando SIMULADO, sem acesso a produção.

PR #108 integrado na main em 26/10/2026: confirmar versão do checkout, sem reabrir a espera por esse merge. Integração não comprova deploy ou funcionamento de produto.
