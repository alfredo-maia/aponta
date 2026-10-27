# Preparação do RED atual (não é RED histórico)

Snapshot original: 5934446026c6c292b4baf184e2140814e669a5b1.
A CI original falha por Query não importado, tipos incompatíveis em getAgents
após o merge e imports ausentes de ROLE_GROUP_NAME/DEFAULT_PERMISSION_GROUPS.
Evidência: https://github.com/alfredo-maia/aponta/actions/runs/40576004181 .
Import/setup/sintaxe falhando não é RED comportamental.

Para permitir executar as asserções, restauraram-se os imports e a assinatura
getAgents(@Req() req: AuthenticatedRequest), mantendo um stub neutro que retorna
lista vazia e não consulta serviço algum. O RED deve falhar nas asserções do
contrato: o controller precisa repassar a identidade autenticada ao serviço
com escopo de tenant. O GREEN substitui o stub pelo repasse real req.user.
As duas capturas usam o mesmo comando e fontes de teste. Os testes de criação
também verificam os grupos padrão após a restauração dos imports.
Nenhuma evidência antiga foi recapturada ou reescrita.
