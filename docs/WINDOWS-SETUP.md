# Instalação do Node.js e npm

Como detectamos que você está usando **Windows**, aqui está um guia específico.

## 📥 Instalar Node.js no Windows

### Opção 1: Instalador Oficial (Recomendado para iniciantes)

1. **Visite** https://nodejs.org/
2. **Download LTS** (versão estável recomendada)
3. **Execute o instalador**:
   - Clique no arquivo `.msi` baixado
   - Siga as instruções (deixe as opções padrão)
   - **Marque**: "Automatically install the necessary tools..."
4. **Reinicie o computador**

### Opção 2: Chocolatey (Para desenvolvedores)

1. **Abra PowerShell como Administrador**
2. **Execute**:
   ```powershell
   choco install nodejs
   ```

### Opção 3: Windows Package Manager

```powershell
winget install OpenJS.NodeJS
```

---

## ✅ Verificar Instalação

Abra o **PowerShell** ou **Prompt de Comando** e execute:

```powershell
node --version
npm --version
```

Você deverá ver algo como:
```
v20.10.0
9.2.0
```

---

## 🗂️ Navegar até a Pasta do Projeto

```powershell
# Vá até a pasta do projeto
cd C:\Users\B624288\Desktop\Projetos\system

# Verifique se está no lugar correto
ls
```

---

## 📦 Instalar Dependências do Projeto

```powershell
# Instale todas as dependências
npm install

# Isso criará uma pasta node_modules
# (pode levar 2-5 minutos)
```

---

## 🗄️ Instalar PostgreSQL

### Opção 1: Instalador (Recomendado)

1. **Visite** https://www.postgresql.org/download/windows/
2. **Download do PostgreSQL 14+**
3. **Execute e siga o instalador**:
   - Defina uma senha para o usuário `postgres`
   - **IMPORTANTE**: Anote essa senha!
   - Mantenha a porta padrão: `5432`

### Opção 2: Chocolatey

```powershell
choco install postgresql
```

### Opção 3: Docker (Avançado)

```powershell
# Se você tiver Docker instalado
docker run --name postgres -e POSTGRES_PASSWORD=senha -p 5432:5432 -d postgres
```

---

## 🔧 Verificar Instalação do PostgreSQL

### No PowerShell:

```powershell
# Conectar ao PostgreSQL
psql -U postgres

# Digite a senha quando solicitado
# Você verá: postgres=#
```

### Criar banco de dados:

```sql
CREATE DATABASE incident_management;
```

Saia digitando:
```sql
\q
```

---

## 🚀 Configurar o Projeto

### 1. Copie o arquivo de ambiente

```powershell
# Copie o arquivo de exemplo
Copy-Item .env.example .env.local
```

### 2. Edite o arquivo `.env.local`

```powershell
# Abra com seu editor
notepad .env.local
```

Configure:
```env
DATABASE_URL="postgresql://postgres:sua_senha@localhost:5432/incident_management"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="copie-a-saida-do-comando-abaixo"
```

### 3. Gere uma chave secreta

```powershell
# Execute isto no PowerShell
$bytes = [System.Text.Encoding]::UTF8.GetBytes((Get-Random).ToString())
$base64 = [Convert]::ToBase64String($bytes)
$base64
```

Copie a saída e use em `NEXTAUTH_SECRET`

---

## 🗄️ Executar Migrações

```powershell
# Execute as migrações do Prisma
npx prisma migrate dev --name init

# Pressione enter para criar a migração
# Isso criará todas as tabelas no banco
```

---

## ▶️ Inicie o Servidor

```powershell
# Inicie o servidor de desenvolvimento
npm run dev
```

Você verá:
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## 🌐 Acesse a Aplicação

Abra seu navegador e vá para:

- **Home**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **Equipe**: http://localhost:3000/team

---

## 🛑 Para o Servidor

Pressione `Ctrl + C` no PowerShell

---

## 📝 Próximas Vezes

Para iniciar o projeto depois:

```powershell
# 1. Navegue até a pasta
cd C:\Users\B624288\Desktop\Projetos\system

# 2. Inicie o servidor
npm run dev

# 3. Abra http://localhost:3000
```

---

## 🔗 Ferramentas Recomendadas

- **Visual Studio Code**: https://code.visualstudio.com
- **DBeaver** (GUI PostgreSQL): https://dbeaver.io
- **Postman** (Testar API): https://www.postman.com
- **Git**: https://git-scm.com

---

## ❓ Problemas Comuns

### Node.js não encontrado
- Reinicie o PowerShell/Prompt de Comando
- Verifique a instalação com `node --version`

### PostgreSQL não conecta
- Verifique se está rodando (Services)
- Confirme a senha e porta
- Use `pgAdmin` (vem com PostgreSQL) para verificar

### Porta 3000 já em uso
```powershell
npm run dev -- -p 3001
```

---

## 📚 Documentação

Após instalar, leia:
1. [QUICKSTART.md](QUICKSTART.md) - Guia rápido
2. [DEVELOPMENT.md](DEVELOPMENT.md) - Desenvolvimento
3. [docs/API.md](docs/API.md) - API endpoints

---

**Pronto! 🎉 Agora você pode começar a desenvolver!**
