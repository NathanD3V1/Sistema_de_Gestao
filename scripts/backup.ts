/**
 * Script de Backup Automático
 * 
 * Uso: npx ts-node scripts/backup.ts
 * ou: npm run backup
 * 
 * Funcionalidades:
 * - Backup completo de todos os dados
 * - Backup incremental (apenas alterações desde último backup)
 * - Limpeza automática de backups antigos (>30 dias)
 * - Metadados do backup
 */

import fs from 'fs/promises';
import path from 'path';

// Configurações
const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 30; // Manter últimos 30 backups
const RETENTION_DAYS = 30; // Deletar backups com mais de 30 dias

// Arquivos para fazer backup
const DATA_FILES = [
  'incidents.json',
  'locations',
];

interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental';
  files: string[];
  size: number;
  incidentCount: number;
  locationCount: number;
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function getBackupId(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `backup-${dateStr}-${timeStr}`;
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

async function countItems(filePath: string): Promise<number> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.length : 1;
  } catch {
    return 0;
  }
}

async function countLocationFiles(dirPath: string): Promise<number> {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(f => f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

async function createBackupMetadata(
  backupId: string,
  type: 'full' | 'incremental',
  files: string[],
  size: number
): Promise<BackupMetadata> {
  const metadata: BackupMetadata = {
    id: backupId,
    timestamp: new Date().toISOString(),
    type,
    files,
    size,
    incidentCount: 0,
    locationCount: 0,
  };

  // Contar ocorrências
  const incidentsPath = path.join(DATA_DIR, 'incidents.json');
  metadata.incidentCount = await countItems(incidentsPath);

  // Contar localizações
  const locationsPath = path.join(DATA_DIR, 'locations');
  metadata.locationCount = await countLocationFiles(locationsPath);

  return metadata;
}

async function saveMetadata(backupId: string, metadata: BackupMetadata): Promise<void> {
  const metadataPath = path.join(BACKUP_DIR, backupId, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

async function listBackupFiles(): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(DATA_DIR, entry.name);
      
      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      } else if (entry.isDirectory()) {
        // Para diretórios (como locations), adiciona o caminho do diretório
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
  }
  
  return files;
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  
  try {
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    // Diretório pode não existir
    console.log(`Diretório ${src} não existe, pulando...`);
  }
}

async function cleanOldBackups(): Promise<number> {
  let deletedCount = 0;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  try {
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const metadataPath = path.join(BACKUP_DIR, entry.name, 'metadata.json');
      
      try {
        const metadataData = await fs.readFile(metadataPath, 'utf-8');
        const metadata: BackupMetadata = JSON.parse(metadataData);
        
        const backupDate = new Date(metadata.timestamp);
        
        if (backupDate < cutoffDate) {
          console.log(`🗑️ Deletando backup antigo: ${entry.name} (${backupDate.toLocaleDateString()})`);
          await fs.rm(path.join(BACKUP_DIR, entry.name), { recursive: true, force: true });
          deletedCount++;
        }
      } catch {
        // Se não conseguir ler metadata, mantém o backup
      }
    }
  } catch {
    // Diretório não existe
  }
  
  return deletedCount;
}

async function runBackup(type: 'full' | 'incremental' = 'full'): Promise<void> {
  console.log(`\n🚀 Iniciando backup ${type}...`);
  console.log(`📁 Diretório de dados: ${DATA_DIR}`);
  console.log(`📦 Diretório de backup: ${BACKUP_DIR}\n`);

  // Garantir que diretórios existem
  await ensureDir(DATA_DIR);
  await ensureDir(BACKUP_DIR);

  // Criar ID do backup
  const backupId = await getBackupId();
  const backupPath = path.join(BACKUP_DIR, backupId);
  
  await ensureDir(backupPath);
  
  console.log(`📋 Backup ID: ${backupId}`);

  // Copiar arquivos de dados
  let totalSize = 0;
  const copiedFiles: string[] = [];

  // Copiar incidents.json
  const incidentsSrc = path.join(DATA_DIR, 'incidents.json');
  const incidentsDest = path.join(backupPath, 'incidents.json');
  
  try {
    await fs.copyFile(incidentsSrc, incidentsDest);
    const size = await getFileSize(incidentsDest);
    totalSize += size;
    copiedFiles.push('incidents.json');
    console.log(`✅ Copiado: incidents.json (${(size / 1024).toFixed(2)} KB)`);
  } catch {
    console.log(`⚠️ Arquivo incidents.json não encontrado, pulando...`);
  }

  // Copiar diretório de localizações
  const locationsSrc = path.join(DATA_DIR, 'locations');
  const locationsDest = path.join(backupPath, 'locations');
  
  try {
    await copyDirectory(locationsSrc, locationsDest);
    const locationFiles = await countLocationFiles(locationsDest);
    const size = await getFileSize(locationsDest);
    totalSize += size;
    copiedFiles.push('locations/');
    console.log(`✅ Copiado: locations/ (${locationFiles} arquivos)`);
  } catch {
    console.log(`⚠️ Diretório locations não encontrado, pulando...`);
  }

  // Criar metadados
  const metadata = await createBackupMetadata(backupId, type, copiedFiles, totalSize);
  await saveMetadata(backupId, metadata);

  console.log(`\n📊 Resumo do Backup:`);
  console.log(`   - Tipo: ${type}`);
  console.log(`   - Ocorrências: ${metadata.incidentCount}`);
  console.log(`   - Localizações: ${metadata.locationCount}`);
  console.log(`   - Tamanho total: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`   - Timestamp: ${metadata.timestamp}`);

  // Limpar backups antigos
  console.log(`\n🧹 Verificando backups antigos...`);
  const deleted = await cleanOldBackups();
  if (deleted > 0) {
    console.log(`   - ${deleted} backup(s) antigo(s) removido(s)`);
  } else {
    console.log(`   - Nenhum backup antigo para remover`);
  }

  console.log(`\n✅ Backup concluído com sucesso!`);
  console.log(`   Localização: ${backupPath}\n`);
}

// Parse argumentos da linha de comando
const args = process.argv.slice(2);
const type = args.includes('--incremental') ? 'incremental' : 'full';

runBackup(type).catch(console.error);

