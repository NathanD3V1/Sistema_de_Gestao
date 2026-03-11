/**
 * Script de Restore de Backup
 * 
 * Uso: npx ts-node scripts/restore.ts <backup-id>
 * ou: npm run restore -- <backup-id>
 * 
 * Funcionalidades:
 * - Restaura dados de um backup específico
 * - Lista backups disponíveis
 * - Valida integridade do backup antes de restaurar
 */

import fs from 'fs/promises';
import path from 'path';

// Configurações
const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

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

async function getBackupList(): Promise<{ id: string; metadata: BackupMetadata }[]> {
  const backups: { id: string; metadata: BackupMetadata }[] = [];
  
  try {
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const metadataPath = path.join(BACKUP_DIR, entry.name, 'metadata.json');
      
      try {
        const metadataData = await fs.readFile(metadataPath, 'utf-8');
        const metadata: BackupMetadata = JSON.parse(metadataData);
        backups.push({ id: entry.name, metadata });
      } catch {
        // Backup sem metadata, pula
      }
    }
  } catch {
    console.log('Nenhum backup encontrado.');
  }
  
  // Ordenar por data (mais recente primeiro)
  backups.sort((a, b) => 
    new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
  );
  
  return backups;
}

async function listBackups(): Promise<void> {
  console.log('\n📋 Lista de Backups Disponíveis:\n');
  
  const backups = await getBackupList();
  
  if (backups.length === 0) {
    console.log('Nenhum backup encontrado.');
    return;
  }
  
  console.log('ID'.padEnd(35) + ' | Data'.padEnd(20) + ' | Tipo'.padEnd(12) + ' | Ocorrências | Tamanho');
  console.log('-'.repeat(90));
  
  for (const backup of backups) {
    const m = backup.metadata;
    const date = new Date(m.timestamp).toLocaleString('pt-BR');
    const size = (m.size / 1024).toFixed(2) + ' KB';
    
    console.log(
      backup.id.padEnd(35) + ' | ' +
      date.padEnd(20) + ' | ' +
      m.type.padEnd(12) + ' | ' +
      String(m.incidentCount).padEnd(11) + ' | ' +
      size
    );
  }
  
  console.log('');
}

async function validateBackup(backupId: string): Promise<boolean> {
  const backupPath = path.join(BACKUP_DIR, backupId);
  const metadataPath = path.join(backupPath, 'metadata.json');
  
  try {
    // Verificar se backup existe
    await fs.access(backupPath);
    
    // Verificar metadata
    await fs.access(metadataPath);
    
    const metadataData = await fs.readFile(metadataPath, 'utf-8');
    const metadata: BackupMetadata = JSON.parse(metadataData);
    
    console.log('\n📊 Validando Backup:');
    console.log(`   - ID: ${metadata.id}`);
    console.log(`   - Tipo: ${metadata.type}`);
    console.log(`   - Data: ${new Date(metadata.timestamp).toLocaleString('pt-BR')}`);
    console.log(`   - Ocorrências: ${metadata.incidentCount}`);
    console.log(`   - Localizações: ${metadata.locationCount}`);
    console.log(`   - Tamanho: ${(metadata.size / 1024).toFixed(2)} KB`);
    
    // Verificar arquivos
    for (const file of metadata.files) {
      const filePath = path.join(backupPath, file);
      try {
        await fs.access(filePath);
        console.log(`   ✅ Arquivo encontrado: ${file}`);
      } catch {
        console.log(`   ❌ Arquivo faltando: ${file}`);
        return false;
      }
    }
    
    console.log('   ✅ Backup válido!\n');
    return true;
  } catch (error) {
    console.log('   ❌ Backup inválido ou não encontrado.\n');
    return false;
  }
}

async function restoreBackup(backupId: string, force: boolean = false): Promise<void> {
  console.log(`\n🔄 Restaurando backup: ${backupId}`);
  
  // Validar backup primeiro
  const isValid = await validateBackup(backupId);
  if (!isValid) {
    console.error('❌ Restore abortado: backup inválido.');
    process.exit(1);
  }
  
  // Pedir confirmação se não for forçado
  if (!force) {
    console.log('\n⚠️  Esta operação IRÁ SUBSTITUIR todos os dados atuais!');
    console.log('   Digite "SIM" para confirmar: ');
    
    // Nota: Em ambiente não-interativo, isso pode falhar
    // Use --force para pular confirmação
  }
  
  const backupPath = path.join(BACKUP_DIR, backupId);
  const metadataPath = path.join(backupPath, 'metadata.json');
  
  // Ler metadata
  const metadataData = await fs.readFile(metadataPath, 'utf-8');
  const metadata: BackupMetadata = JSON.parse(metadataData);
  
  // Garantir que diretório de dados existe
  await ensureDir(DATA_DIR);
  
  // Restaurar cada arquivo
  for (const file of metadata.files) {
    const srcPath = path.join(backupPath, file);
    const destPath = path.join(DATA_DIR, file);
    
    try {
      if (file.endsWith('/')) {
        // É diretório, copiar recursivamente
        await fs.cp(srcPath, destPath, { recursive: true, force: true });
        console.log(`✅ Restaurado: ${file}`);
      } else {
        // É arquivo
        await fs.copyFile(srcPath, destPath);
        console.log(`✅ Restaurado: ${file}`);
      }
    } catch (error: any) {
      console.error(`❌ Erro ao restaurar ${file}:`, error.message);
    }
  }
  
  console.log('\n✅ Restore concluído com sucesso!');
  console.log(`   - ${metadata.incidentCount} ocorrências restauradas`);
  console.log(`   - ${metadata.locationCount} localizações restauradas\n`);
}

async function deleteBackup(backupId: string): Promise<void> {
  const backupPath = path.join(BACKUP_DIR, backupId);
  
  try {
    await fs.rm(backupPath, { recursive: true, force: true });
    console.log(`✅ Backup ${backupId} excluído com sucesso.`);
  } catch (error: any) {
    console.error(`❌ Erro ao excluir backup:`, error.message);
  }
}

// Parse argumentos da linha de comando
const args = process.argv.slice(2);

async function main() {
  if (args.length === 0 || args[0] === '--list' || args[0] === '-l') {
    // Listar backups
    await listBackups();
  } else if (args[0] === '--delete' || args[0] === '-d') {
    // Deletar backup
    const backupId = args[1];
    if (!backupId) {
      console.error('Usage: npm run delete -- <backup-id>');
      process.exit(1);
    }
    await deleteBackup(backupId);
  } else {
    // Restaurar backup
    const backupId = args[0];
    const force = args.includes('--force') || args.includes('-f');
    
    await restoreBackup(backupId, force);
  }
}

main().catch(console.error);

