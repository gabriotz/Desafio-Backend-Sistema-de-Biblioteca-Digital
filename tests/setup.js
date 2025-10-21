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
beforeEach(async () => {
  if (global.prisma.material && global.prisma.material.deleteMany) {
    await global.prisma.material.deleteMany();
    await global.prisma.autor.deleteMany();
    await global.prisma.user.deleteMany();
  }
});

afterAll(async () => {
  if (global.prisma.$disconnect) {
    await global.prisma.$disconnect();
  }
});