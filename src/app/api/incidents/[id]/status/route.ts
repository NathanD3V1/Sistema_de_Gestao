import { NextResponse } from 'next/server';
import { dbUpdateIncidentStatus } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 0;

type Body = { status: string };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const body = await req.json() as Body;
    
    if (!body?.status) {
      return NextResponse.json({ error: 'status é obrigatório' }, { status: 400 });
    }

    const updated = await dbUpdateIncidentStatus(id, body.status);
    
    if (!updated) {
      return NextResponse.json({ error: 'Incidente não encontrado' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar status' },
      { status: 400 }
    );
  }
}

