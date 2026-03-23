import { NextRequest, NextResponse } from 'next/server';
import { dbGetTeams, dbCreateTeam, dbUpdateTeam, dbDeleteTeam } from '@/lib/db';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    // Mantenha apenas o ID restrito para EQUIPE (para não visualizarem outras equipes se não precisarem)
    // Se precisarem ver todas para o mapa, não há problema em manter GET aberto.
    // Mas vamos simplificar e permitir que equipes vejam as outras para fins de relatório ou chat
    
    const teams = await dbGetTeams(status || undefined);

    // Filtrar por ID se fornecido
    if (id) {
      const team = teams.find(t => t.id === id);
      if (!team) {
        return NextResponse.json(
          { success: false, error: 'Equipe não encontrada' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: team });
    }

    return NextResponse.json({
      success: true,
      data: teams,
    });
  } catch (error: any) {
    console.error('Erro ao buscar equipes:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro ao buscar equipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session || session.cargo !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validar dados obrigatórios
    if (!body.name || !body.id) {
      return NextResponse.json(
        { success: false, error: 'Nome e ID são obrigatórios' },
        { status: 400 }
      );
    }

    const newTeam = await dbCreateTeam({
      id: body.id,
      name: body.name,
      matricula: body.matricula || '',
      status: body.status || 'AVAILABLE',
      location: body.location || '',
      members: body.members || 1,
      vehicle: body.vehicle || '',
      phone: body.phone || '',
    });

    return NextResponse.json(
      { success: true, data: newTeam },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar equipe:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro ao criar equipe' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session || session.cargo !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    const updated = await dbUpdateTeam(body.id, {
      name: body.name,
      matricula: body.matricula,
      status: body.status,
      location: body.location,
      members: body.members,
      vehicle: body.vehicle,
      phone: body.phone,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Equipe não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar equipe:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro ao atualizar equipe' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const cookie = cookies().get('sgo_session')?.value;
  const session = cookie ? await decrypt(cookie) : null;
  
  if (!session || session.cargo !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    const deleted = await dbDeleteTeam(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Equipe não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Equipe excluída com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao excluir equipe:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro ao excluir equipe' },
      { status: 400 }
    );
  }
}

