const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true }
  });
  
  const grouped = {};
  users.forEach(u => {
    if (!grouped[u.role]) grouped[u.role] = [];
    grouped[u.role].push(u);
  });
  
  console.log(JSON.stringify(grouped, null, 2));
  await prisma.$disconnect();
}
run();
