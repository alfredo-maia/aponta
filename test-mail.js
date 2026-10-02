const { simpleParser } = require('mailparser');

async function run() {
  const mail = `From: alfredo@dmtecnologia.com.br
To: suporte@aponta.com.br
Subject: [Aponta] Re: [Chamado TKT-12345] Novo Erro

This is the reply text.`;

  const parsed = await simpleParser(mail);
  console.log(parsed.subject, parsed.text, parsed.from.value[0].address);
}
run();
