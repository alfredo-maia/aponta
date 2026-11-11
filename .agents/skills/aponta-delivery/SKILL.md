---
name: aponta-delivery
description: Verificar e registrar a entrega do Aponta por etapa (integrado, validado em staging, publicado em produção), com a evidência do commit e das imagens de cada uma.
---

# Entrega verificável por etapa

Receba identidade canônica, SHA aprovado por QA, PR e CI, e confirme que todos se referem ao mesmo commit. Consulte o manifest da entrega, `docs/delivery/WORKFLOW.md` e `docs/delivery/RELEASE.md`.

Integrado, validado em staging e publicado em produção são fatos diferentes, cada um com a sua evidência; nunca declare um pelo outro.

- **Integrado**: o commit de merge está na `main` e o CI de push dele passou. Evidência: SHA do merge e o run do CI.
- **Validado em staging**: o registro `~/deploy/aponta/records/<SHA>.json` na VPS tem `staging.result = passed` para o commit que contém a entrega, com os identificadores das imagens e a lista de verificações. Evidência: o registro e o job `Staging` do run de `CD (Produção)`.
- **Publicado em produção**: o mesmo registro tem `production.result = passed`, e `GET /api/version` e `/version.json` em produção devolvem aquele commit. Evidência: o registro, o job `Produção` e a resposta das duas URLs.

Quem publica é o workflow `CD (Produção)`, disparado pelo CI da `main`: ele constrói as imagens do commit uma vez, valida no staging e promove as mesmas imagens. O agente não aciona CD, não faz merge nem push na `main`, e não roda `aponta_release.py stage`, `promote` ou comando Docker contra staging ou produção; rollback é decisão e ação do usuário. Leia o resultado nos runs e no registro, sem polling: se a etapa ainda não aconteceu, registre RESULTADO=BLOQUEADO com a dependência, o responsável e o evento de retomada, no fio da menção e sem alterar o status do pai.

Staging que falhou não é publicação parcial: produção não recebe aquele commit. Registre a verificação que falhou e devolva ao líder como defeito ou problema de ambiente, separando um do outro. Não invente o SHA implantado se não puder verificá-lo; HTTP 200 na raiz não comprova a funcionalidade.

Depois de publicado, confira o comportamento pertinente à entrega, sem dado sensível e sem alterar produção além do escopo autorizado. Funcionalidade atrás de feature flag só conta como entregue ao usuário quando a flag está ligada no ambiente; registre o estado dela. Aceite humano é um quarto fato e só o usuário o declara.

Só após a prova da etapa atualize a issue GitHub e o board e registre o resultado no fio. O líder consolida o pai Multica. A quinzena não obriga publicar entregas incompletas. Versão do Aponta é o SHA do commit publicado; não há tag de release, e uma tag ou versão só é criada quando o usuário pedir, sem reescrever tag publicada.

Para mudança só de governança ou documentação, registre que a validação em staging do produto não se aplica; a política só vale depois de integrada na `main`. Em MODO=VALIDACAO_ESTEIRA, execute apenas a simulação local solicitada, declarando SIMULADO, sem acesso a staging ou produção.
