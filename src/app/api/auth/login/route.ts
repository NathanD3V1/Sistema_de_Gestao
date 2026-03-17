import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    // 3. Retorna os dados no formato esperado pelo frontend
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
