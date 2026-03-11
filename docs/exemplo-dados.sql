-- Script SQL de exemplo para dados de teste
-- Execute este script APÓS rodar as migrações do Prisma

-- Inserir Empresa
INSERT INTO "Company" (id, name, cnpj, email, phone, address, city, state, "createdAt", "updatedAt")
VALUES (
  'comp_001',
  'Empresa de Manutenção XYZ',
  '12345678000190',
  'contato@empresa.com.br',
  '(11) 3000-0000',
  'Rua Principal, 100',
  'São Paulo',
  'SP',
  NOW(),
  NOW()
);

-- Inserir Equipes
INSERT INTO "Team" (id, name, "companyId", status, location, "createdAt", "updatedAt")
VALUES 
  ('team_001', 'Equipe A - Zona Leste', 'comp_001', 'AVAILABLE', 'São Paulo, SP', NOW(), NOW()),
  ('team_002', 'Equipe B - Zona Oeste', 'comp_001', 'AVAILABLE', 'São Paulo, SP', NOW(), NOW()),
  ('team_003', 'Equipe C - Zona Sul', 'comp_001', 'AVAILABLE', 'São Paulo, SP', NOW(), NOW());

-- Inserir Usuários - Admin
INSERT INTO "User" (id, email, password, name, role, "companyId", "teamId", "createdAt", "updatedAt")
VALUES (
  'user_admin_001',
  'admin@empresa.com.br',
  'hashed_password_here', -- IMPORTANTE: Use senha com hash real
  'Admin Sistema',
  'ADMIN',
  'comp_001',
  NULL,
  NOW(),
  NOW()
);

-- Inserir Usuários - Gerente
INSERT INTO "User" (id, email, password, name, role, "companyId", "teamId", "createdAt", "updatedAt")
VALUES (
  'user_manager_001',
  'gerente@empresa.com.br',
  'hashed_password_here',
  'Gerente de Operações',
  'COMPANY_MANAGER',
  'comp_001',
  NULL,
  NOW(),
  NOW()
);

-- Inserir Usuários - Membros das Equipes
INSERT INTO "User" (id, email, password, name, role, "companyId", "teamId", "createdAt", "updatedAt")
VALUES 
  ('user_team_001', 'lider_a@empresa.com.br', 'hashed_password_here', 'Líder Equipe A', 'TEAM_LEADER', 'comp_001', 'team_001', NOW(), NOW()),
  ('user_team_002', 'membro_a1@empresa.com.br', 'hashed_password_here', 'Membro A1', 'TEAM_MEMBER', 'comp_001', 'team_001', NOW(), NOW()),
  ('user_team_003', 'membro_a2@empresa.com.br', 'hashed_password_here', 'Membro A2', 'TEAM_MEMBER', 'comp_001', 'team_001', NOW(), NOW()),
  ('user_team_004', 'lider_b@empresa.com.br', 'hashed_password_here', 'Líder Equipe B', 'TEAM_LEADER', 'comp_001', 'team_002', NOW(), NOW()),
  ('user_team_005', 'membro_b1@empresa.com.br', 'hashed_password_here', 'Membro B1', 'TEAM_MEMBER', 'comp_001', 'team_002', NOW(), NOW());

-- Inserir Ocorrências de Exemplo
INSERT INTO "Incident" (id, title, description, priority, status, "companyId", "teamId", "clientName", "clientPhone", "clientEmail", address, city, state, "zipCode", "createdAt", "updatedAt")
VALUES 
  (
    'incident_001',
    'Vazamento de água',
    'Vazamento detectado na cozinha do cliente',
    'HIGH',
    'ASSIGNED',
    'comp_001',
    'team_001',
    'João Silva',
    '(11) 98765-4321',
    'joao@email.com',
    'Rua das Flores, 123',
    'São Paulo',
    'SP',
    '01000-000',
    NOW(),
    NOW()
  ),
  (
    'incident_002',
    'Falha em ar condicionado',
    'Equipamento não ligando',
    'NORMAL',
    'PENDING',
    'comp_001',
    NULL,
    'Maria Santos',
    '(11) 97654-3210',
    'maria@email.com',
    'Av. Paulista, 500',
    'São Paulo',
    'SP',
    '01311-100',
    NOW(),
    NOW()
  ),
  (
    'incident_003',
    'Conserto de porta',
    'Fechadura quebrada',
    'LOW',
    'COMPLETED',
    'comp_001',
    'team_002',
    'Pedro Costa',
    '(11) 96543-2109',
    'pedro@email.com',
    'Rua Augusta, 789',
    'São Paulo',
    'SP',
    '01305-100',
    NOW(),
    NOW()
  );

-- Inserir Histórico de Status para incident_001
INSERT INTO "StatusHistory" (id, "incidentId", status, timestamp, notes)
VALUES 
  ('history_001', 'incident_001', 'PENDING', NOW() - INTERVAL '1 hour', 'Ocorrência criada'),
  ('history_002', 'incident_001', 'ASSIGNED', NOW() - INTERVAL '50 minutes', 'Atribuída à Equipe A'),
  ('history_003', 'incident_001', 'DEPARTED', NOW() - INTERVAL '45 minutes', 'Equipe saiu da base'),
  ('history_004', 'incident_001', 'ARRIVED', NOW() - INTERVAL '20 minutes', 'Equipe chegou no local');

-- Inserir Mensagens de Exemplo
INSERT INTO "Message" (id, content, "senderId", "incidentId", "createdAt")
VALUES 
  ('msg_001', 'Estamos a caminho do local', 'user_team_002', 'incident_001', NOW() - INTERVAL '20 minutes'),
  ('msg_002', 'Já chegamos, iniciando avaliação', 'user_team_002', 'incident_001', NOW() - INTERVAL '15 minutes'),
  ('msg_003', 'Problema identificado, iniciando conserto', 'user_team_002', 'incident_001', NOW() - INTERVAL '10 minutes'),
  ('msg_004', 'Acompanhando. Qual é o tempo estimado?', 'user_manager_001', 'incident_001', NOW() - INTERVAL '8 minutes');

-- NOTES:
-- 1. Este é apenas um exemplo. Os emails e nomes são fictícios.
-- 2. As senhas mostradas aqui são placeholders. Use sempre senhas com hash (bcrypt recomendado).
-- 3. Para gerar um hash de senha, use: 
--    const hashedPassword = await bcrypt.hash('sua_senha', 10);
-- 4. Adapte os valores (IDs, emails, localidades) conforme necessário para seu ambiente.
-- 5. Os timestamps usam NOW() que será a data/hora atual do servidor PostgreSQL.
