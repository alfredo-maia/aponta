# Composição de engenharia no Multica

Entrega administrativa autorizada pelo usuário em 31/10/2026 após revisão dos métodos. O SPEC registra o recorte já discutido; não se alega que antecedeu a configuração remota ou a importação anterior no PR #109. O novo verificador de bundles segue RED/GREEN real a partir de stub importável.

Objetivo: reduzir entendimento presumido e referências ausentes, mantendo método genérico separado do perfil Aponta.

- AC-01: métodos de alinhamento/triagem/SPEC derivados de fontes fixadas, com deltas explícitos e um SPEC canônico. Verificação: SOURCE.json, hashes e revisão dos perfis.
- AC-02: verificador detecta arquivo de referência/script ausente, fonte alterada e caminho que escapa do bundle; aceita referência existente e ignora exemplos cercados. Verificação: scripts/test_engineering_skills.py, RED/GREEN coletados.
- AC-03: seis agentes recebem papéis consistentes e todas as referências; modelos, runtime, permissões, MCPs, WIP e deploy preservados. Verificação: snapshots e configuration-verified.json da implantação administrativa.
- AC-04: fixture isolada exercita invocação real, bloqueio/retomada, Tier1 claro, SPEC, diagnóstico e QA. Verificação: atividades DMTE-293/294–298 e artefatos locais, sem atribuir esses resultados ao produto.
- AC-05: identidade única GitHub/Multica e PR #109 com contrato, documentação e revisão no SHA correto. Verificação: registry, manifest, check de entrega e revisão atribuível.

Exclusões: implementar telas/fluxos do produto, instalar produção, ampliar permissões, alterar modelos, aumentar concorrência, alterar o workflow de deploy ou inventar baseline visual.

Segurança: somente fixture sintética, sem dados de cliente/credenciais. Métodos genéricos não autorizam publicação/fechamento/avanço de fase por si sós. Nenhuma migração de banco do produto ou mudança de API. UI/DS não alterados; validação visual exige referência aprovada em demandas futuras.

Risco: sessão iniciada antes da mudança pode manter contexto anterior; PR aberto não distribui docs pela main; materialização varia com runtime e precisa de evidência. Reversão administrativa usa snapshots protegidos da implantação, com agentes sem execução ativa.
