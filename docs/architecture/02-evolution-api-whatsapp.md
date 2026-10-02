# Integração Aponta e Evolution API (WhatsApp)

## 1. Banco de Dados
- **User**: Adicionar campo `phone String?` para correlacionar o sender originário (ex: 5511999999999).
- **Ticket**: Adicionar origin `source String @default("WEB")` (pode ser WA, WEB, EMAIL).

## 2. Recepção (Webhook no NestJS)
`POST /integrations/evolution/webhook`
Ao chegar uma mensagem de texto (MESSAGES_UPSERT):
- Verifica se existe ticket em andamento (OPEN / IN_PROGRESS / PENDING__) para esse telefone.
- **Se SIM**: Anexa como *Comentário* (`Comment`) do cliente no chamado ativo.
- **Se NÃO**: Ativa o Robô (Chatbot) preguntando qual o problema/departamento e gera o ticket originário `WA`.

## 3. Disparo de Resposta
No instante em que um Agente comenta num Ticket originado por `WA`, o EventEmmiter do Node pega o evento e bate no endpoint da Evolution `POST /message/sendText` pra entregar no celular do Cliente.
