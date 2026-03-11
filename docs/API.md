# Documentação da API

## Base URL
```
http://localhost:3000/api
```

## Autenticação
Todas as requisições devem incluir o header:
```
Authorization: Bearer <token>
```

---

## Endpoints de Ocorrências

### GET /incidents
Listar ocorrências de uma empresa

**Query Parameters:**
- `companyId` (obrigatório): ID da empresa

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "incident_001",
      "title": "Vazamento de água",
      "description": "Vazamento detectado",
      "priority": "HIGH",
      "status": "ASSIGNED",
      "clientName": "João Silva",
      "address": "Rua das Flores, 123",
      "teamId": "team_001",
      "createdAt": "2026-01-19T10:00:00Z"
    }
  ]
}
```

---

### POST /incidents
Criar nova ocorrência

**Body:**
```json
{
  "title": "Vazamento de água",
  "description": "Vazamento detectado na cozinha",
  "priority": "HIGH",
  "companyId": "comp_001",
  "clientName": "João Silva",
  "clientPhone": "(11) 98765-4321",
  "clientEmail": "joao@email.com",
  "address": "Rua das Flores, 123",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01000-000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "incident_001",
    "title": "Vazamento de água",
    "status": "PENDING",
    "createdAt": "2026-01-19T10:00:00Z"
  }
}
```

---

### GET /incidents/:id
Obter detalhes de uma ocorrência

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "incident_001",
    "title": "Vazamento de água",
    "description": "Vazamento detectado",
    "priority": "HIGH",
    "status": "ARRIVED",
    "clientName": "João Silva",
    "address": "Rua das Flores, 123",
    "teamId": "team_001",
    "messages": [
      {
        "id": "msg_001",
        "content": "Estamos a caminho",
        "sender": "João da Equipe A",
        "createdAt": "2026-01-19T10:15:00Z"
      }
    ],
    "statusHistory": [
      {
        "status": "PENDING",
        "timestamp": "2026-01-19T10:00:00Z"
      },
      {
        "status": "ASSIGNED",
        "timestamp": "2026-01-19T10:05:00Z"
      },
      {
        "status": "DEPARTED",
        "timestamp": "2026-01-19T10:10:00Z"
      }
    ]
  }
}
```

---

### PUT /incidents/:id/status
Atualizar status de uma ocorrência

**Body:**
```json
{
  "status": "ARRIVED",
  "notes": "Chegamos no local, iniciando avaliação"
}
```

**Status válidos:**
- `PENDING`
- `ASSIGNED`
- `DEPARTED`
- `ARRIVED`
- `EVALUATING`
- `REPAIRING`
- `COMPLETED`
- `CANCELLED`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "incident_001",
    "status": "ARRIVED",
    "timestamp": "2026-01-19T10:30:00Z"
  }
}
```

---

## Endpoints de Equipes

### GET /teams
Listar equipes

**Query Parameters:**
- `companyId` (obrigatório): ID da empresa

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "team_001",
      "name": "Equipe A - Zona Leste",
      "status": "AVAILABLE",
      "location": "São Paulo, SP",
      "members": [
        {
          "id": "user_team_001",
          "name": "João da Silva",
          "role": "TEAM_LEADER"
        }
      ]
    }
  ]
}
```

---

### POST /teams
Criar nova equipe

**Body:**
```json
{
  "name": "Equipe D - Zona Centro",
  "companyId": "comp_001",
  "location": "São Paulo, SP"
}
```

---

### GET /teams/available
Listar equipes disponíveis

**Query Parameters:**
- `companyId` (obrigatório): ID da empresa

---

## Endpoints de Chat

### GET /messages
Listar mensagens de uma ocorrência

**Query Parameters:**
- `incidentId` (obrigatório): ID da ocorrência

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_001",
      "content": "Estamos a caminho",
      "sender": {
        "id": "user_team_001",
        "name": "João da Equipe A"
      },
      "createdAt": "2026-01-19T10:15:00Z"
    }
  ]
}
```

---

### POST /messages
Enviar mensagem

**Body:**
```json
{
  "incidentId": "incident_001",
  "content": "Chegamos no local, iniciando avaliação"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "msg_002",
    "content": "Chegamos no local, iniciando avaliação",
    "sender": {
      "id": "user_team_001",
      "name": "João da Equipe A"
    },
    "createdAt": "2026-01-19T10:30:00Z"
  }
}
```

---

## Códigos de Status HTTP

- `200`: OK - Requisição bem-sucedida
- `201`: Created - Recurso criado com sucesso
- `400`: Bad Request - Dados inválidos
- `401`: Unauthorized - Autenticação necessária
- `403`: Forbidden - Sem permissão
- `404`: Not Found - Recurso não encontrado
- `500`: Internal Server Error - Erro do servidor

---

## Prioridades

- `LOW`: Baixa prioridade
- `NORMAL`: Prioridade normal
- `HIGH`: Alta prioridade
- `CRITICAL`: Prioridade crítica

---

## Status de Ocorrência

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando atribuição |
| `ASSIGNED` | Atribuída a uma equipe |
| `DEPARTED` | Equipe saiu da base |
| `ARRIVED` | Equipe chegou no local |
| `EVALUATING` | Realizando avaliação |
| `REPAIRING` | Realizando conserto |
| `COMPLETED` | Ocorrência concluída |
| `CANCELLED` | Ocorrência cancelada |

---

## Exemplos com cURL

### Listar ocorrências
```bash
curl -X GET "http://localhost:3000/api/incidents?companyId=comp_001" \
  -H "Authorization: Bearer seu_token_aqui"
```

### Criar ocorrência
```bash
curl -X POST "http://localhost:3000/api/incidents" \
  -H "Authorization: Bearer seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Vazamento de água",
    "priority": "HIGH",
    "companyId": "comp_001",
    "clientName": "João Silva",
    "address": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP"
  }'
```

### Atualizar status
```bash
curl -X PUT "http://localhost:3000/api/incidents/incident_001/status" \
  -H "Authorization: Bearer seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ARRIVED",
    "notes": "Chegamos no local"
  }'
```

### Enviar mensagem
```bash
curl -X POST "http://localhost:3000/api/messages" \
  -H "Authorization: Bearer seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "incidentId": "incident_001",
    "content": "Estamos a caminho"
  }'
```
