# =============================================================================
#  REINSTALAR NODE.JS - Remove o antigo e instala um novo (limpo)
# =============================================================================
#
#  COMO USAR (PowerShell como ADMINISTRADOR, de qualquer pasta):
#
#  & "C:\Users\natha\OneDrive\Desktop\incident-management-system\incident-management-system\reinstalar-nodejs.ps1"
#
#  Copie e cole o comando acima - nao precisa estar na pasta do projeto.
# =============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   REINSTALAR NODE.JS - Removendo o antigo e instalando novo" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se esta rodando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERRO] Execute o PowerShell como Administrador!" -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Feche este PowerShell" -ForegroundColor White
    Write-Host "2. Clique com o botao direito no PowerShell -> 'Executar como administrador'" -ForegroundColor White
    Write-Host "3. Cole e execute este comando:" -ForegroundColor White
    Write-Host ""
    Write-Host '   & "C:\Users\natha\OneDrive\Desktop\incident-management-system\incident-management-system\reinstalar-nodejs.ps1"' -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Verificar winget
try {
    $null = winget --version 2>$null
    if (-not $?) { throw "winget nao encontrado" }
} catch {
    Write-Host "[ERRO] winget nao disponivel. Use Windows 10/11 atualizado ou baixe em https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# --- PASSO 1: Remover versoes antigas do Node.js ---
Write-Host "[1/2] Removendo Node.js antigo (se existir)..." -ForegroundColor Yellow

winget uninstall --id OpenJS.NodeJS.LTS --silent 2>$null
winget uninstall --id OpenJS.NodeJS --silent 2>$null

Write-Host "      Concluido." -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

# --- PASSO 2: Instalar Node.js LTS novo ---
Write-Host "[2/2] Instalando Node.js LTS..." -ForegroundColor Yellow
Write-Host ""

winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements

Write-Host ""
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Node.js foi reinstalado." -ForegroundColor Green
    Write-Host ""
    Write-Host "  IMPORTANTE: Feche e abra um NOVO PowerShell (pode ser normal, nao precisa ser Admin)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Depois, para conferir:" -ForegroundColor Cyan
    Write-Host "    node --version" -ForegroundColor White
    Write-Host "    npm --version" -ForegroundColor White
} else {
    Write-Host "[AVISO] A instalacao pode ter falhado. Tente:" -ForegroundColor Yellow
    Write-Host "  winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  Para rodar este script de novo (de qualquer pasta, como Admin):" -ForegroundColor Gray
Write-Host '  & "C:\Users\natha\OneDrive\Desktop\incident-management-system\incident-management-system\reinstalar-nodejs.ps1"' -ForegroundColor DarkGray
Write-Host ""
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""
