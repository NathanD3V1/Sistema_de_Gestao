# Script para verificar e ajudar na instalacao do Node.js
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "          VERIFICANDO INSTALACAO DO NODE.JS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "[OK] Node.js esta instalado: $nodeVersion" -ForegroundColor Green
        $nodeInstalled = $true
    } else {
        throw "Node.js nao encontrado"
    }
} catch {
    Write-Host "[ERRO] Node.js NAO esta instalado" -ForegroundColor Red
    $nodeInstalled = $false
}

# Verificar npm
Write-Host ""
Write-Host "Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "[OK] npm esta instalado: v$npmVersion" -ForegroundColor Green
        $npmInstalled = $true
    } else {
        throw "npm nao encontrado"
    }
} catch {
    Write-Host "[ERRO] npm NAO esta instalado" -ForegroundColor Red
    $npmInstalled = $false
}

# Resultado
Write-Host ""
Write-Host "================================================================" -ForegroundColor Gray

if ($nodeInstalled -and $npmInstalled) {
    Write-Host ""
    Write-Host "TUDO PRONTO! Voce pode usar npm install agora!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Cyan
    Write-Host "  1. npm install" -ForegroundColor White
    Write-Host "  2. Configure o arquivo .env.local" -ForegroundColor White
    Write-Host "  3. npm run dev" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "NODE.JS PRECISA SER INSTALADO" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPCOES DE INSTALACAO:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opcao 1 - Download Manual (RECOMENDADO):" -ForegroundColor White
    Write-Host "  1. Abra: https://nodejs.org/" -ForegroundColor Gray
    Write-Host "  2. Baixe a versao LTS (botaoverde)" -ForegroundColor Gray
    Write-Host "  3. Execute o instalador .msi" -ForegroundColor Gray
    Write-Host "  4. Feche e abra um NOVO PowerShell" -ForegroundColor Gray
    Write-Host "  5. Execute este script novamente" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Opcao 2 - Via winget (requer PowerShell como Administrador):" -ForegroundColor White
    Write-Host "  winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Opcao 3 - Via Chocolatey (se tiver instalado):" -ForegroundColor White
    Write-Host "  choco install nodejs-lts" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Para mais detalhes, leia: INSTALAR-AGORA.txt" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Gray
Write-Host ""
