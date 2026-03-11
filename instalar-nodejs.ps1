# Script para instalar Node.js LTS no Windows via winget
# IMPORTANTE: Execute o PowerShell como Administrador (clique direito -> Executar como administrador)

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "          INSTALANDO NODE.JS LTS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se esta rodando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[AVISO] Este script precisa ser executado como Administrador!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Como fazer:" -ForegroundColor White
    Write-Host "  1. Feche este PowerShell" -ForegroundColor Gray
    Write-Host "  2. Clique com o botao direito no icone do PowerShell" -ForegroundColor Gray
    Write-Host "  3. Selecione 'Executar como administrador'" -ForegroundColor Gray
    Write-Host "  4. Navegue ate a pasta do projeto e execute novamente:" -ForegroundColor Gray
    Write-Host "     .\instalar-nodejs.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OU execute manualmente este comando no PowerShell (como Admin):" -ForegroundColor White
    Write-Host "  winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Verificar se winget esta disponivel
try {
    $wingetCheck = winget --version 2>$null
    if (-not $wingetCheck) { throw "winget nao encontrado" }
} catch {
    Write-Host "[ERRO] winget nao esta disponivel. Voce precisa do Windows 10/11 atualizado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativa: Baixe o Node.js em https://nodejs.org/ (versao LTS)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Instalando Node.js LTS via winget..." -ForegroundColor Yellow
Write-Host ""

winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements

Write-Host ""
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Instalacao concluida!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE: Feche e abra um NOVO PowerShell para o 'node' e 'npm' funcionarem." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Depois, execute para verificar:" -ForegroundColor Cyan
    Write-Host "  node --version" -ForegroundColor White
    Write-Host "  npm --version" -ForegroundColor White
} else {
    Write-Host "[AVISO] A instalacao pode ter falhado. Tente executar manualmente:" -ForegroundColor Yellow
    Write-Host "  winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou baixe em: https://nodejs.org/" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""
