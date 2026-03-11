import { NextRequest, NextResponse } from 'next/server';
import { dbGetIncidents, dbCreateIncident } from '@/lib/db';

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
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId') || searchParams.get('equipeId');

  try {
    const list = await dbGetIncidents(teamId || undefined);
    
    // Ordenar: mais recente primeiro
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

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

