# TODO - Melhorar visibilidade dos horários no painel das equipes

## Plano de Implementação

### 1. Atualizar src/app/team/page.tsx
- [x] Criar card dedicado e destacado para horários (Saída, Chegada, Início, Fim)
- [x] Usar texto maior e cores mais vibrantes
- [x] Adicionar ícones visuais para cada etapa
- [x] Destacar a etapa atual baseada no status da ocorrência
- [x] Adicionar fundo colorizado para campos importantes

### 2. Testar a implementação
- [x] Verificar se as alterações ficam corretas visualmente

---

## Detalhes das Alterações

Os campos de horário devem ficar assim:
- Card com borda colorida e fundo mais destacado
- Texto grande e legível
- Ícones indicando cada fase (🚀 Saída, 🎯 Chegada, 🔧 Início, ✅ Fim)
- A etapa atual deve ter destaque visual (borda mais grossa, fundo diferente)
- Quando não preenchido, mostrar indicador visual de "pendente"

