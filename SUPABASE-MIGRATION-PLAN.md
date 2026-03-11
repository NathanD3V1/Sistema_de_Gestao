# 🚀 Plano de Migração para Supabase

## 📊 Estado Atual do Projeto

### ✅ O que já existe:
- Schema Prisma completo para PostgreSQL
- API Routes Next.js
- Frontend React/Next.js
- Armazenamento atual em arquivos JSON (incidentStore.ts, fileStore.ts)
- Dependências: Prisma, NextAuth, Socket.IO, SWR, Zustand

### ❌ Problema atual:
- Dados armazenados em JSON não são adequados para produção
- Sem persistência real
- Dificuldade em escalar
- Não suporta múltiplos usuários simultâneos

---

## 🎯 Migração para Supabase

### 1. Configuração do Supabase

#### Criar projeto no Supabase:
1. Acesse https://supabase.com
2. Crie novo projeto
3. Anote as credenciais:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (para admin)

#### Atualizar `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Banco local (mantém para desenvolvimento)
DATABASE_URL="postgresql://user:password@localhost:5432/incidents"

# JWT Secret
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 2. Instalação de dependências

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 3. Criar cliente Supabase

Criar `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

### 4. Adapter Prisma + Supabase

O schema Prisma já está pronto! Apenas configure o Supabase como servidor PostgreSQL:

1. No dashboard do Supabase, vá em **Settings → Database**
2. Encontre as credenciais de conexão
3. Atualize `DATABASE_URL` no `.env.local`

### 5. Migração de Dados (Opcional)

Se quiser migrar dados do JSON para Supabase:

```typescript
// Script de migração
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function migrate() {
  // Ler dados do JSON
  const incidentsData = await fs.readFile(
    path.join(process.cwd(), 'src', 'data', 'incidents.json'),
    'utf-8'
  );
  const incidents = JSON.parse(incidentsData);

  // Migrar para Supabase via Prisma
  for (const incident of incidents) {
    await prisma.incident.create({
      data: {
        id: incident.id,
        title: incident.title,
        description: incident.description || '',
        priority: incident.priority,
        status: incident.status,
        // ... outros campos
      }
    });
  }
}

migrate();
```

---

## 💡 Funcionalidades Extras com Supabase

### 1. 🔐 Autenticação (já instalada)
```bash
# Já está instalada: next-auth
# Configure em src/app/api/auth/[...nextauth]/route.ts
```

### 2. 📡 Realtime (Subscriptions)
```typescript
// Ouvir mudanças em incidents
const channel = supabase
  .channel('incidents')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'Incident' 
  }, (payload) => {
    console.log('Mudança detectada:', payload);
  })
  .subscribe();
```

### 3. 📍 Rastreamento em Tempo Real
- Usar Supabase Realtime para GPS das equipes
- Armazenar localização em tabela separada

### 4. 🔔 Notificações Push
- Web Push com Supabase
- Notificações em tempo real

### 5. 📊 Analytics
- Supabase Analytics integrado
- Dashboard de métricas

### 6. ☁️ Storage (Arquivos)
- Upload de fotos/relatórios
- Assinaturas digitais

---

## 📋 Próximos Passos Recomendados

### Fase 1: Configuração Básica (1 dia)
- [ ] Criar conta Supabase
- [ ] Configurar variáveis de ambiente
- [ ] Conectar Prisma ao Supabase
- [ ] Executar migrações

### Fase 2: Autenticação (1 dia)
- [ ] Configurar NextAuth com provider de email
- [ ] Criar páginas de login
- [ ] Proteger rotas

### Fase 3: Realtime (1 dia)
- [ ] Configurar subscriptions
- [ ] Atualizar UI para tempo real
- [ ] Chat em tempo real

### Fase 4: Extras (2 dias)
- [ ] Notificações push
- [ ] Upload de arquivos
- [ ] Analytics

---

## 🎉 Benefícios da Migração

| Antes (JSON) | Depois (Supabase) |
|--------------|-------------------|
| Dados locais | Dados na nuvem |
| Sem concorrência | Múltiplos usuários |
| Sem backup automático | Backup automático |
| Sem realtime | Tempo real |
| Dados perdidos se HD falhar | Alta disponibilidade |
| Diffícil colaboração | Acesso compartilhado |

---

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase + Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Prisma + Supabase](https://www.prisma.io/docs/guides/database/supabase)

