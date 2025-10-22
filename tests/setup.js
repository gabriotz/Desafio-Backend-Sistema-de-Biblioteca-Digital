// tests/setup.js
console.log('✅ Setup carregado - inicializando Prisma...');

let prisma;

try {
  // Use o caminho correto baseado na geração do Prisma
  const { PrismaClient } = require('../src/generated/prisma');
  prisma = new PrismaClient();
  global.prisma = prisma;
  console.log('✅ Prisma inicializado com sucesso');
} catch (error) {
  console.log('❌ Erro ao inicializar Prisma:', error.message);
  // Fallback para mock
  global.prisma = {
    user: { 
      findUnique: () => Promise.resolve(null), 
      create: () => Promise.resolve({}),
      deleteMany: () => Promise.resolve()
    },
    material: { deleteMany: () => Promise.resolve() },
    autor: { deleteMany: () => Promise.resolve() },
    $disconnect: () => Promise.resolve()
  };
}

// Limpeza do banco
beforeAll(async () => {
  await prisma.$connect();
  global.prisma = prisma;
});

// Limpeza completa após todos os testes
afterAll(async () => {
  await prisma.material.deleteMany();
  await prisma.autor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});