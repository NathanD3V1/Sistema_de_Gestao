sim # 🚀 Plano de Implementação - Sistema de Gestão de Ocorrências

## Funcionalidades a Implementar

| # | Funcionalidade | Status Atual | Prioridade |
|---|----------------|--------------|------------|
| 1 | Migração Supabase | Schema pronto, falta conectar | 🔴 Alta |
| 2 | Dashboard Admin | Parcial (precisa melhorias) | 🔴 Alta |
| 3 | Chat em Tempo Real | Configuração pronta, falta integrar | 🔴 Alta |
| 4 | Rastreamento GPS com Rota | Localização funciona, falta rota no mapa | 🟡 Média |
| 5 | Notificações Push | Não implementado | 🟡 Média |
| 6 | Upload de Fotos | Não implementado | 🟡 Média |
| 7 | Relatórios/Estatísticas | Não implementado | 🟡 Média |

---

## 1. 🔄 Migração Supabase

### 1.1 Configuração do Cliente Supabase
- Criar `src/lib/supabase.ts`
- Configurar variáveis de ambiente
- Instalar dependências

### 1.2 Conectar API Routes ao Supabase
- Atualizar `src/app/api/incidents/route.ts`
- Atualizar `src/app/api/teams/route.ts`
- Atualizar `src/app/api/messages/route.ts`

### 1.3 Realtime (Subscriptions)
- Configurar ouvinte de mudanças no banco
- Sincronizar UI em tempo real

---

## 2. 📊 Dashboard Admin Melhorias

### 2.1 Funcionalidades a Adicionar
- [ ] Gráficos de ocorrências por status
- [ ] Gráficos de prioridade
- [ ] Tempo médio de resolução
- [ ] KPIs em tempo real
- [ ] Filtros avançados
- [ ] Exportação de dados (Excel/PDF)

### 2.2 Componentes a Criar
- `src/components/DashboardCharts.tsx` - Gráficos
- `src/components/StatsCards.tsx` - Cards de estatísticas
- `src/components/ExportButton.tsx` - Botão de exportação

---

## 3. 💬 Chat em Tempo Real

### 3.1 Configuração do Servidor
- Criar `src/app/api/socket/route.ts` para Socket.IO
- Configurar CORS

### 3.2 Integração no Frontend
- Atualizar `src/components/ChatPanel.tsx` para usar Socket.IO
- Adicionar indicadores de "online/offline"
- Mostrar "digitando..."

### 3.3 Salas de Chat
- Uma sala por ocorrência (incident-{id})
- Uma sala geral para a empresa

---

## 4. 🗺️ Rastreamento GPS com Rota

### 4.1 Melhorias no Mapa
- [ ] Adicionar polyline da rota no mapa
- [ ] Calcular ETA (tempo estimado de chegada)
- [ ] Mostrar distância restante
- [ ] Atualizar rota em tempo real
- [ ] Ícones diferentes para equipe e destino

### 4.2 Cálculo de Rota
- Usar API OSRM (Open Source Routing Machine) - gratuito
- API: `http://router.project-osrm.org/route/v1/driving/{lon},{lat};{lon},{lat}`

### 4.3 Arquivos a Modificar
- `src/components/TeamLiveMap.tsx`
- `src/services/locationService.ts`

---

## 5. 🔔 Notificações Push

### 5.1 Web Push
- Usar Service Workers
- Notificações do navegador
- Solicitar permissão do usuário

### 5.2 Eventos para Notificar
- Nova ocorrência atribuída
- Status da ocorrência mudou
- Nova mensagem no chat
- Equipe disponível novamente

### 5.3 Arquivos a Criar
- `src/app/api/notifications/route.ts`
- `src/components/NotificationPermission.tsx`
- `public/sw.js` - Service Worker
- `public/manifest.json` - PWA

---

## 6. 📸 Upload de Fotos

### 6.1 Interface
- Botão de adicionar foto na ocorrência
- Câmera do celular
- Galeria de fotos
- Antes/depois do serviço

### 6.2 Armazenamento
- Supabase Storage (se usar Supabase)
- Ou Cloudinary (alternativa)
- Ou base64 no banco (não recomendado para produção)

### 6.3 Arquivos a Criar
- `src/components/PhotoUploader.tsx`
- `src/app/api/upload/route.ts`
- `src/lib/uploadService.ts`

---

## 7. 📈 Relatórios/Estatísticas

### 7.1 Dashboard de Métricas
- Ocorrências por dia/semana/mês
- Tempo médio de resposta
- Ocorrências por equipe
- Ocorrências por tipo
- Taxa de resolução
- Satisfação do cliente (se implementado)

### 7.2 Relatórios Exportáveis
- PDF com gráficos
- Excel com dados
- CSV para análise

### 7.3 Arquivos a Criar
- `src/app/api/reports/route.ts`
- `src/components/ReportsPage.tsx`
- `src/components/Charts.tsx`

---

## 📋 Ordem de Implementação Sugerida

### Fase 1: Base (Semana 1)
1. ✅ Configurar Supabase
2. ✅ Conectar API ao Supabase
3. ✅ Configurar Realtime

### Fase 2: Funcionalidades Core (Semana 2)
4. ✅ Chat em Tempo Real
5. ✅ Rastreamento GPS com Rota

### Fase 3: Melhorias (Semana 3)
6. ✅ Notificações Push
7. ✅ Upload de Fotos
8. ✅ Relatórios/Estatísticas

---

## 🛠️ Tecnologias a Usar

| Funcionalidade | Biblioteca/API |
|----------------|----------------|
| Banco de Dados | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime / Socket.IO |
| Mapa/Rota | Leaflet + OSRM |
| Gráficos | Recharts |
| Upload | Supabase Storage |
| Notificações | Web Push API |
| PWA | next-pwa |

---

## 📝 Notas Importantes

1. **Supabase**: Já temos o schema Prisma pronto, só precisa conectar
2. **Socket.IO**: Já está instalado, falta integrar corretamente
3. **Leaflet**: Já está funcionando, só falta rota
4. **next-auth**: Já está instalado, pode ser configurado para login

---

## ✅ Checklist de Implementação

```
[ ] 1. Configurar Supabase
[ ] 2. Atualizar variáveis de ambiente
[ ] 3. Conectar API Routes ao banco
[ ] 4. Implementar Realtime
[ ] 5. Melhorar ChatPanel com Socket.IO
[ ] 6. Adicionar rotas no mapa
[ ] 7. Implementar notificações push
[ ] 8. Criar componente de upload de fotos
[ ] 9. Criar página de relatórios
[ ] 10. Testar tudo
```

