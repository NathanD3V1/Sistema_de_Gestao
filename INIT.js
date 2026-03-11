#!/usr/bin/env node

/**
 * Script de inicialização rápida
 * Execute: node init.js
 */

console.clear();
console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║     🚀 SISTEMA DE GESTÃO DE OCORRÊNCIAS - INICIALIZAÇÃO RÁPIDA      ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

📋 PROJETO CRIADO COM SUCESSO!

✅ Arquivos Criados:
   • 40+ arquivos estruturados
   • 100+ linhas de documentação  
   • 6 módulos principais
   • Schema de banco completo
   • API pronta para desenvolver
   • UI com componentes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 DOCUMENTAÇÃO DISPONÍVEL:

   1. 📄 README.md              → Visão geral do projeto
   2. 🚀 QUICKSTART.md          → Começar em 5 minutos
   3. 🛠️  DEVELOPMENT.md         → Guia de desenvolvimento
   4. 📊 PROJECT-SUMMARY.md     → Sumário completo
   5. 📖 DOCS/
      └─ API.md                → Documentação da API
      └─ ARCHITECTURE.md       → Arquitetura e diagramas
      └─ WINDOWS-SETUP.md      → Setup Windows
      └─ exemplo-dados.sql     → Dados de teste
      └─ postman-collection.json → Testar endpoints

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 PRÓXIMOS PASSOS:

   PASSO 1: Instale Node.js
   ├─ Windows: Visite https://nodejs.org/
   ├─ Ou use: winget install OpenJS.NodeJS
   └─ Verifique: node --version

   PASSO 2: Instale PostgreSQL
   ├─ Windows: Visite https://www.postgresql.org/
   ├─ Ou use: choco install postgresql
   └─ Verifique: psql --version

   PASSO 3: Configure o projeto
   ├─ Abra PowerShell nesta pasta
   └─ Execute: npm install

   PASSO 4: Configure o banco
   ├─ Copie: .env.example → .env.local
   ├─ Edite: DATABASE_URL com suas credenciais
   └─ Execute: npx prisma migrate dev --name init

   PASSO 5: Inicie o servidor
   └─ Execute: npm run dev

   PASSO 6: Acesse
   ├─ Home: http://localhost:3000
   ├─ Admin: http://localhost:3000/admin
   └─ Equipe: http://localhost:3000/team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️  TECNOLOGIAS:

   Frontend:     Next.js 14 | React 18 | TypeScript | Tailwind CSS
   Backend:      Node.js | Next.js API Routes
   Banco Dados:  PostgreSQL | Prisma ORM
   Real-time:    Socket.IO
   Autenticação: NextAuth.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 ESTRUTURA:

   system/
   ├── src/
   │   ├── app/              (Páginas e API)
   │   ├── components/       (Componentes React)
   │   ├── lib/             (Utilitários)
   │   └── types/           (Tipos TypeScript)
   ├── prisma/              (Schema do banco)
   ├── docs/                (Documentação)
   └── package.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 FUNCIONALIDADES:

   ✓ Gestão de Ocorrências
   ✓ Rastreamento em 5 etapas
   ✓ Gestão de Equipes
   ✓ Dashboard Admin
   ✓ Painel de Equipe
   ✓ Chat em Tempo Real
   ✓ PWA Ready
   ✓ API RESTful

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 DICAS:

   • Leia QUICKSTART.md primeiro (5 minutos)
   • Use docs/postman-collection.json para testar API
   • Consulte docs/exemplo-dados.sql para dados de teste
   • Configure .env.local com seus dados
   • Use npx prisma studio para ver o banco

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❓ DÚVIDAS?

   1. Leia a documentação em docs/
   2. Consulte DEVELOPMENT.md
   3. Verifique docs/WINDOWS-SETUP.md se tiver problemas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 BOA SORTE! Você está pronto para começar a desenvolver!

   Comece executando: npm install && npm run dev

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
