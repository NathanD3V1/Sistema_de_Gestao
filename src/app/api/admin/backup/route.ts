import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

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

// GET - Listar backups disponíveis
export async function GET(request: NextRequest) {
  try {
    await ensureDir(BACKUP_DIR);
    
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    const backups: BackupMetadata[] = [];
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const metadataPath = path.join(BACKUP_DIR, entry.name, 'metadata.json');
      
      try {
        const metadataData = await fs.readFile(metadataPath, 'utf-8');
        const metadata: BackupMetadata = JSON.parse(metadataData);
        backups.push(metadata);
      } catch {
        // Backup sem metadata, pula
      }
    }
    
    // Ordenar por data (mais recente primeiro)
    backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return NextResponse.json({
      success: true,
      data: backups,
      count: backups.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Criar novo backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type === 'incremental' ? 'incremental' : 'full';
    
    // Executar script de backup
    const scriptPath = path.join(process.cwd(), 'scripts', 'backup.ts');
    
    return new Promise<NextResponse>((resolve) => {
      const args = type === 'incremental' 
        ? ['--incremental'] 
        : [];
      
      const process = spawn('npx', ['ts-node', scriptPath, ...args], {
        stdio: 'pipe',
        shell: true,
      });
      
      let output = '';
      let errorOutput = '';
      
      process.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: `Backup ${type} criado com sucesso`,
            output: output
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'Erro ao criar backup',
            details: errorOutput || output
          }, { status: 500 }));
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Restaurar um backup (especificado no body)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, backupId } = body;
    
    if (action === 'restore') {
      if (!backupId) {
        return NextResponse.json(
          { success: false, error: 'ID do backup é obrigatório' },
          { status: 400 }
        );
      }
      
      // Executar script de restore
      const scriptPath = path.join(process.cwd(), 'scripts', 'restore.ts');
      
      return new Promise<NextResponse>((resolve) => {
        const process = spawn('npx', ['ts-node', scriptPath, backupId, '--force'], {
          stdio: 'pipe',
          shell: true,
        });
        
        let output = '';
        let errorOutput = '';
        
        process.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        process.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve(NextResponse.json({
              success: true,
              message: 'Backup restaurado com sucesso',
              output: output
            }));
          } else {
            resolve(NextResponse.json({
              success: false,
              error: 'Erro ao restaurar backup',
              details: errorOutput || output
            }, { status: 500 }));
          }
        });
      });
    } else if (action === 'delete') {
      if (!backupId) {
        return NextResponse.json(
          { success: false, error: 'ID do backup é obrigatório' },
          { status: 400 }
        );
      }
      
      const backupPath = path.join(BACKUP_DIR, backupId);
      
      try {
        await fs.rm(backupPath, { recursive: true, force: true });
        return NextResponse.json({
          success: true,
          message: `Backup ${backupId} excluído`
        });
      } catch (error: any) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Ação inválida. Use: restore ou delete' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

