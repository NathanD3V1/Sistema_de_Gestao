import { NextRequest, NextResponse } from 'next/server';
import { dbGetIncidents, dbCreateIncident } from '@/lib/db';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export const runtime = 'nodejs';
export const revalidate = 0;

// Tipos locais para a API
interface IncidentInput {
  id: string;
  teamId: string;
  title: string;
  address: string;
  priority: string;
  status: string;
  departedAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export async function GET(req: NextRequest) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // Se for equipe, obriga a ver só o próprio ID (Prevenção de IDOR)
  let teamId = searchParams.get('teamId') || searchParams.get('equipeId');
  if (session.cargo === 'EQUIPE') {
    teamId = session.equipeId || null; 
  }

  try {
    const list = await dbGetIncidents(teamId || undefined);
    
    // Ordenar: mais recente primeiro (tratando nulos)
    list.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Erro ao buscar ocorrências:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar ocorrências' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session || session.cargo !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado. Apenas admins podem criar ocorrências.' }, { status: 403 });
  }

  try {
    const body = await req.json() as IncidentInput;

    // Validação mínima
    if (!body?.id || !body?.teamId || !body?.title || !body?.address || !body?.priority || !body?.status) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando: id, teamId, title, address, priority, status' },
        { status: 400 }
      );
    }

    const created = await dbCreateIncident({
      id: body.id,
      teamId: body.teamId,
      title: body.title,
      address: body.address,
      priority: body.priority,
      status: body.status,
      departedAt: body.departedAt ?? null,
      arrivedAt: body.arrivedAt ?? null,
      startedAt: body.startedAt ?? null,
      finishedAt: body.finishedAt ?? null,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar ocorrência:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar ocorrência' },
      { status: 400 }
    );
  }
}

