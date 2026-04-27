import { NextRequest, NextResponse } from 'next/server';
import { dbGetIncidentById, dbUpdateIncident, dbDeleteIncident } from '@/lib/db';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = params;
  
  try {
    const item = await dbGetIncidentById(id);
    if (!item) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    if (session.cargo === 'EQUIPE' && item.teamId !== session.equipeId) {
      return NextResponse.json({ error: 'Acesso negado a esta ocorrência' }, { status: 403 });
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session || session.cargo !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado. Apenas admins podem editar.' }, { status: 403 });
  }

  const { id } = params;
  
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session || session.cargo !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = params;
  
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

