# Sistema de Gestão e Controle de Ocorrências

Um sistema completo de rastreamento em tempo real para gerenciamento de ocorrências e coordenação de equipes, com interfaces separadas para empresa e equipes de campo.

## 🎯 Funcionalidades

- ✅ **Gestão de Ocorrências**: Criar, atribuir e acompanhar ocorrências
- ✅ **Rastreamento em Tempo Real**: 5 etapas de progresso
  1. Saída da base
  2. Chegada no local
  3. Início da avaliação
  4. Realização do conserto
  5. Conclusão do conserto
- ✅ **Gestão de Equipes**: Cadastro e disponibilidade de equipes
- ✅ **Dashboard Admin**: Fiscalização de todas as ocorrências
- ✅ **Painel de Equipe**: Interface de trabalho em campo
- ✅ **Chat em Tempo Real**: Comunicação entre empresa e equipes
- ✅ **PWA**: Funciona como app em mobile/tablet

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL (via Prisma ORM)
- **Estilização**: Tailwind CSS
- **Chat Tempo Real**: Socket.IO
- **Autenticação**: NextAuth.js

## 📁 Estrutura do Projeto

```
.
├── src/
│   ├── app/
│   │   ├── admin/          # Dashboard da empresa
│   │   ├── team/           # Painel da equipe
│   │   ├── api/            # Rotas da API
│   │   │   ├── incidents/  # Endpoints de ocorrências
│   │   │   ├── teams/      # Endpoints de equipes
│   │   │   └── messages/   # Endpoints de chat
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Página inicial
│   │   └── globals.css
│   ├── lib/
│   │   ├── apiClient.ts    # Cliente HTTP
│   │   └── utils.ts        # Funções utilitárias
│   ├── types/
│   │   └── index.ts        # Tipos TypeScript
│   └── components/         # Componentes reutilizáveis (future)
├── prisma/
│   ├── schema.prisma       # Schema do banco de dados
│   └── migrations/         # Migrações do banco
├── .env.example            # Exemplo de variáveis de ambiente
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🚀 Como Começar

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- PostgreSQL 14+

### Instalação

1. **Clone o repositório** (se aplicável)

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure o banco de dados**:
   - Crie um banco PostgreSQL
   - Copie `.env.example` para `.env.local`
   - Configure `DATABASE_URL` com suas credenciais

4. **Execute as migrações**:
   ```bash
   npx prisma migrate dev
   ```

5. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

6. **Acesse**:
   - Home: http://localhost:3000
   - Admin: http://localhost:3000/admin
   - Equipe: http://localhost:3000/team

## 📊 Schema do Banco de Dados

### Tabelas Principais

- **Users**: Usuários (Admin, Gerentes, Membros da Equipe)
- **Companies**: Empresas/Organizações
- **Teams**: Equipes de trabalho
- **Incidents**: Ocorrências/Chamados
- **StatusHistory**: Histórico de mudanças de status
- **Messages**: Mensagens de chat

Veja [prisma/schema.prisma](prisma/schema.prisma) para detalhes completos.

## 🔐 Tipos de Usuários

1. **ADMIN**: Acesso total ao sistema
2. **COMPANY_MANAGER**: Gerencia empresa e ocorrências
3. **TEAM_LEADER**: Lidera equipe
4. **TEAM_MEMBER**: Membro da equipe

## 📱 Status da Ocorrência

- `PENDING`: Aguardando atribuição
- `ASSIGNED`: Atribuída a uma equipe
- `DEPARTED`: Equipe saiu da base
- `ARRIVED`: Chegou no local
- `EVALUATING`: Realizando avaliação
- `REPAIRING`: Realizando conserto
- `COMPLETED`: Ocorrência concluída
- `CANCELLED`: Ocorrência cancelada

## 🔄 Status da Equipe

- `AVAILABLE`: Disponível
- `ON_CALL`: Em alerta
- `IN_TRANSIT`: Em trânsito
- `ON_SITE`: No local
- `BUSY`: Ocupada

## 📝 Próximos Passos

1. **Implementar autenticação** com NextAuth.js
2. **Conectar com Prisma** para operações de banco de dados
3. **Implementar Socket.IO** para chat em tempo real
4. **Criar componentes reutilizáveis** para UI
5. **Adicionar notificações** push
6. **Implementar geolocalização** para rastreamento
7. **Criar testes** unitários e de integração
8. **Deploy** em produção

## 🤝 Contribuindo

Este é um projeto em desenvolvimento. Sinta-se livre para sugerir melhorias e correções.

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue ou entre em contato.

---

**Desenvolvido com ❤️ para gestão eficiente de ocorrências**
