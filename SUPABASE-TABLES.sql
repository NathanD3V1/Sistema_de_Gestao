-- =====================================================
-- SUPABASE SQL - CRIAR TABELAS DO SISTEMA DE OCORRÊNCIAS
-- =====================================================
-- Execute este arquivo no SQL Editor do Supabase
-- IMPORTANTE: Use tipos UUID, não BIGINT!
-- =====================================================

-- 1. CRIAR ENUMS (Tipos Personalizados)
-- =====================================================

-- Enum para Role de Usuário
CREATE TYPE user_role AS ENUM ('ADMIN', 'COMPANY_MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER');

-- Enum para Status da Equipe
CREATE TYPE team_status AS ENUM ('AVAILABLE', 'ON_CALL', 'IN_TRANSIT', 'ON_SITE', 'BUSY');

-- Enum para Prioridade da Ocorrência
CREATE TYPE priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- Enum para Status da Ocorrência
CREATE TYPE incident_status AS ENUM ('PENDING', 'ASSIGNED', 'DEPARTED', 'ARRIVED', 'EVALUATING', 'REPAIRING', 'COMPLETED', 'CANCELLED');


-- 2. CRIAR TABELAS (NA ORDEM CORRETA)
-- =====================================================

-- Primeiro: Tabela de Empresas/Organizações
CREATE TABLE IF NOT EXISTS public.company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    cnpj TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Segundo: Tabela de Equipes (antes de user que referencia team)
CREATE TABLE IF NOT EXISTS public.team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    status team_status DEFAULT 'AVAILABLE',
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Terceiro: Tabela de Usuários
CREATE TABLE IF NOT EXISTS public.user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role user_role DEFAULT 'TEAM_MEMBER',
    company_id UUID REFERENCES public.company(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.team(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quarto: Tabela de Ocorrências
CREATE TABLE IF NOT EXISTS public.incident (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority priority DEFAULT 'NORMAL',
    status incident_status DEFAULT 'PENDING',
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.team(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    departed_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quinto: Tabela de Histórico de Status
CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incident(id) ON DELETE CASCADE,
    status incident_status NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Sexto: Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES public.incident(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 3. CRIAR ÍNDICES (para melhor performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_company ON public.user(company_id);
CREATE INDEX IF NOT EXISTS idx_user_team ON public.user(team_id);
CREATE INDEX IF NOT EXISTS idx_team_company ON public.team(company_id);
CREATE INDEX IF NOT EXISTS idx_incident_company ON public.incident(company_id);
CREATE INDEX IF NOT EXISTS idx_incident_team ON public.incident(team_id);
CREATE INDEX IF NOT EXISTS idx_incident_status ON public.incident(status);
CREATE INDEX IF NOT EXISTS idx_status_history_incident ON public.status_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_message_incident ON public.message(incident_id);
CREATE INDEX IF NOT EXISTS idx_message_sender ON public.message(sender_id);


-- 4. CRIAR DADOS DE EXEMPLO
-- =====================================================

-- Inserir empresa exemplo
INSERT INTO public.company (id, name, cnpj, email, phone, city, state)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'NeoEnergia', '12.345.678/0001-90', 'contato@neoenergia.com', '(71) 99999-9999', 'Salvador', 'BA')
ON CONFLICT (name) DO NOTHING;

-- Inserir equipes exemplo
INSERT INTO public.team (id, name, company_id, status, location)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Equipe Alpha', '00000000-0000-0000-0000-000000000001', 'AVAILABLE', '{"lat": -12.9714, "lng": -38.5014}'),
    ('00000000-0000-0000-0000-000000000002', 'Equipe Beta', '00000000-0000-0000-0000-000000000001', 'AVAILABLE', '{"lat": -13.0100, "lng": -38.5300}'),
    ('00000000-0000-0000-0000-000000000003', 'Equipe Gamma', '00000000-0000-0000-0000-000000000001', 'BUSY', '{"lat": -12.9500, "lng": -38.4800}')
ON CONFLICT (company_id, name) DO NOTHING;

-- Inserir ocorrências exemplo
INSERT INTO public.incident (id, title, description, priority, status, company_id, team_id, client_name, client_phone, address, city, state)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Falha no fornecimento', 'Cliente relatando falta de energia em toda a rua', 'HIGH', 'PENDING', '00000000-0000-0000-0000-000000000001', NULL, 'João Silva', '(71) 99999-1111', 'Rua das Flores, 123', 'Salvador', 'BA'),
    ('00000000-0000-0000-0000-000000000002', 'Manutenção preventiva', 'Revisão anual do transformador', 'LOW', 'ASSIGNED', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Maria Santos', '(71) 99999-2222', 'Av. Principal, 456', 'Salvador', 'BA'),
    ('00000000-0000-0000-0000-000000000003', 'Conexão nova', 'Instalação de nova conexão residencial', 'NORMAL', 'DEPARTED', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Pedro Oliveira', '(71) 99999-3333', 'Rua Nova, 789', 'Salvador', 'BA')
ON CONFLICT (id) DO NOTHING;


-- 5. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (ajuste conforme necessário)
-- Por agora, permitimos acesso total para desenvolvimento
CREATE POLICY "Allow all for company" ON public.company FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for user" ON public.user FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for team" ON public.team FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for incident" ON public.incident FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for status_history" ON public.status_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for message" ON public.message FOR ALL USING (true) WITH CHECK (true);


-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

