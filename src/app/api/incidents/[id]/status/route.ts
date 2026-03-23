import { NextRequest, NextResponse } from 'next/server';
import { dbGetIncidentById, dbUpdateIncidentStatus } from '@/lib/db';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export const runtime = 'nodejs';
export const revalidate = 0;

type Body = { status: string };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  
  try {
    const item = await dbGetIncidentById(id);
    if (!item) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    if (session.cargo === 'EQUIPE' && item.teamId !== session.equipeId) {
      return NextResponse.json({ error: 'Acesso negado a esta ocorrência' }, { status: 403 });
    }

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

