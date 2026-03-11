import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Verificar variáveis de ambiente
    const envCheck = {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NÃO CONFIGURADO',
      SUPABASE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      USE_SUPABASE: process.env.USE_SUPABASE || 'NÃO CONFIGURADO',
    };

    // Testar conexão direta com fetch
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        success: false,
        error: 'Variáveis de ambiente não configuradas',
        env: envCheck,
      }, { status: 500 });
    }

    // Testar requisição direta ao Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/team?select=*&limit=5`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });

    const teamsData = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      env: envCheck,
      teams: teamsData,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

