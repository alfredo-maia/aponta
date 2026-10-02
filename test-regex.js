const subj = "[Aponta] Nova resposta no chamado TKT-32F981";
console.log(subj.match(/chamado\s+([a-z0-9-]+)/i)[1]);
