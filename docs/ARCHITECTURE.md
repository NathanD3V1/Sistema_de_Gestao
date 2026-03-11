# Arquitetura do Sistema

## Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE GESTÃO DE OCORRÊNCIAS             │
└─────────────────────────────────────────────────────────────────┘

                          NAVEGADOR/APP
                              │
                    ┌─────────┴──────────┐
                    │                    │
              ADMIN DASHBOARD      TEAM PANEL
              (Empresa)            (Equipe)
                    │                    │
                    └─────────┬──────────┘
                              │
                        ┌─────▼─────┐
                        │ Next.js    │
                        │ Frontend   │
                        └─────┬─────┘
                              │
                    ┌─────────┴──────────────┐
                    │                        │
              REST API              WebSocket
              (HTTP)                (Socket.IO)
                    │                        │
        ┌───────────┴───────────┐            │
        │                       │            │
    ┌───▼──────────┐    ┌──────▼────┐      │
    │  Endpoints   │    │ Real-time  │      │
    │  da API      │    │   Chat     │      │
    └───┬──────────┘    └────────────┘      │
        │                                   │
    ┌───▼──────────────────────────────────▼──┐
    │         Next.js Backend                  │
    │         API Routes                       │
    ├─────────────────────────────────────────┤
    │  ├── /api/incidents                      │
    │  ├── /api/teams                          │
    │  └── /api/messages                       │
    └───┬──────────────────────────────────────┘
        │
    ┌───▼──────────────────────────────────┐
    │      Prisma ORM                       │
    │  (Camada de Dados)                    │
    └───┬──────────────────────────────────┘
        │
    ┌───▼──────────────────────────────────┐
    │      PostgreSQL Database              │
    ├──────────────────────────────────────┤
    │  ├── Users                            │
    │  ├── Companies                        │
    │  ├── Teams                            │
    │  ├── Incidents                        │
    │  ├── StatusHistory                    │
    │  └── Messages                         │
    └───────────────────────────────────────┘
```

## Estrutura de Componentes

```
Frontend (React)
├── Admin Dashboard
│   ├── Ocorrências Ativas
│   ├── Estatísticas
│   ├── Gestão de Equipes
│   └── Relatórios
│
└── Team Panel
    ├── Minhas Tarefas
    ├── Status de Progresso
    ├── Chat
    └── Localização

```

## Fluxo de Ocorrência

```
┌─────────────┐
│   PENDING   │ ← Ocorrência criada
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  ASSIGNED    │ ← Atribuída automaticamente a equipe disponível
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  DEPARTED    │ ← Equipe sai da base
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  ARRIVED     │ ← Equipe chega no local
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ EVALUATING   │ ← Avaliando problema
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  REPAIRING   │ ← Consertando
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ COMPLETED    │ ← Concluída ✓
└──────────────┘
```

## Arquitetura de Dados

```
User
├── id (PK)
├── email
├── name
├── role (ADMIN | MANAGER | TEAM_LEADER | TEAM_MEMBER)
├── company_id (FK)
├── team_id (FK)
└── relationships
    ├── Company
    ├── Team
    └── Messages

Company
├── id (PK)
├── name
├── cnpj
├── email
├── phone
├── address
└── relationships
    ├── Users
    ├── Teams
    └── Incidents

Team
├── id (PK)
├── name
├── company_id (FK)
├── status (AVAILABLE | ON_CALL | IN_TRANSIT | ON_SITE | BUSY)
├── location
└── relationships
    ├── Company
    ├── Users (members)
    └── Incidents

Incident
├── id (PK)
├── title
├── description
├── priority (LOW | NORMAL | HIGH | CRITICAL)
├── status (PENDING | ... | COMPLETED)
├── company_id (FK)
├── team_id (FK)
├── client details
├── location details
└── relationships
    ├── Company
    ├── Team
    ├── StatusHistory
    └── Messages

StatusHistory
├── id (PK)
├── incident_id (FK)
├── status
├── timestamp
└── notes

Message
├── id (PK)
├── content
├── sender_id (FK)
├── incident_id (FK)
└── createdAt
```

## Stack Tecnológico

```
Frontend:
├── Next.js 14
├── React 18
├── TypeScript
├── Tailwind CSS
└── Socket.IO Client

Backend:
├── Next.js API Routes
├── Node.js
├── TypeScript
└── Socket.IO

Database:
├── PostgreSQL
└── Prisma ORM

Deployment:
└── Vercel (recomendado)
```

## Fluxo de Comunicação

```
1. Empresa cria ocorrência
   Empresa → API → BD
   
2. Sistema aloca equipe
   API → Lógica de alocação → Atualiza BD
   
3. Equipe recebe notificação
   Socket.IO → Team Panel
   
4. Equipe atualiza status
   Team Panel → API → BD
   
5. Empresa vê atualização
   Socket.IO → Admin Dashboard
   
6. Chat em tempo real
   Team ↔ Socket.IO ↔ Company
```

## Matriz de Permissões

```
                    Admin  Manager  Leader  Member
Criar Ocorrência     ✓       ✓        ✗      ✗
Atribuir Equipe      ✓       ✓        ✗      ✗
Ver Ocorrências      ✓       ✓        ✓      ✓
Atualizar Status     ✓       ✓        ✓      ✓
Gerenciar Equipes    ✓       ✓        ✓      ✗
Gerenciar Usuários   ✓       ✗        ✗      ✗
Ver Relatórios       ✓       ✓        ✓      ✗
Enviar Chat          ✓       ✓        ✓      ✓
```
