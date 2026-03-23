import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encrypt } from '@/lib/session';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// Matrícula fixa do administrador
const ADMIN_MATRICULA = '0001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matricula } = body;

    if (!matricula || typeof matricula !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Matrícula é obrigatória' },
        { status: 400 }
      );
    }

    const trimmed = matricula.trim();

    // 1. Verifica se é o administrador
    if (trimmed === ADMIN_MATRICULA) {
      // Gera cookie seguro
      const session = await encrypt({
        matricula: ADMIN_MATRICULA,
        cargo: 'ADMIN',
        name: 'Administrador Central'
      });
      
      cookies().set('sgo_session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      return NextResponse.json({
        success: true,
        data: {
          matricula: ADMIN_MATRICULA,
          name: 'Administrador Central',
          nome: 'Administrador Central',
          cargo: 'ADMIN',
        },
      });
    }

    // 2. Busca no Supabase pela matrícula da equipe
    const { data: team, error } = await supabaseAdmin
      .from('team')
      .select('*')
      .eq('matricula', trimmed)
      .single();

    if (error || !team) {
      console.log('Matrícula não encontrada:', trimmed, error?.message);
      return NextResponse.json(
        { success: false, error: 'Matrícula não encontrada no sistema.' },
        { status: 404 }
      );
    }

    // Gera cookie seguro para equipe
    const session = await encrypt({
      matricula: trimmed,
      cargo: 'EQUIPE',
      equipeId: team.id,
      name: team.name
    });

    cookies().set('sgo_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    // 3. Retorna os dados no formato esperado pelo frontend (para fallback do frontend state)
    return NextResponse.json({
      success: true,
      data: {
        matricula: trimmed,
        name: team.name,
        nome: team.name,
        cargo: 'EQUIPE',
        equipeId: team.id,
        vehicle: team.vehicle,
        phone: team.phone,
      },
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
