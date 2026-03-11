import { NextResponse } from 'next/server';
import { dbGetIncidentById, dbUpdateIncident, dbDeleteIncident } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const item = await dbGetIncidentById(id);
    if (!item) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Erro ao buscar ocorrência:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar ocorrência' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const partial = await req.json();
    const updated = await dbUpdateIncident(id, partial);
    
    if (!updated) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar ocorrência:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar ocorrência' },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const deleted = await dbDeleteIncident(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir ocorrência:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao excluir ocorrência' },
      { status: 400 }
    );
  }
}

