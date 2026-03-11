import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // TODO: Criar dados de teste
  // 1. Criar empresas
  // 2. Criar usuários (admin, gerentes, membros)
  // 3. Criar equipes
  // 4. Criar ocorrências de exemplo

  console.log('✅ Seed concluído!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
