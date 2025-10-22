require('dotenv').config({ path: '.env.test' });

let prisma;

try {
  const { PrismaClient } = require('../src/generated/prisma');
  prisma = new PrismaClient();
  
  // 🚨 VERIFICAÇÃO DE SEGURANÇA
  if (!process.env.DATABASE_URL.includes('test') && !process.env.DATABASE_URL.includes('TEST')) {
    console.error('🚨 PERIGO: Banco não é de teste!');
    console.error('DATABASE_URL:', process.env.DATABASE_URL);
    console.error('PARE OS TESTES!');
    process.exit(1);
  }
  
  console.log('🔗 Conectando ao banco de teste...');
  global.prisma = prisma;

} catch (error) {
  console.log('❌ Erro ao inicializar Prisma:', error.message);
  process.exit(1);
}

// Configurações do Jest
if (typeof beforeAll !== 'undefined' && typeof afterAll !== 'undefined') {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.material.deleteMany();
    await prisma.autor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });
}

module.exports = prisma;