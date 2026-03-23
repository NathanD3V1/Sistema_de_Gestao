import { NextRequest, NextResponse } from 'next/server';
import { decrypt, SessionPayload } from '@/lib/session';

// Rotas que não precisam de autenticação
const publicRoutes = ['/', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  
  // Pegar cookie da requisição
  const cookie = req.cookies.get('sgo_session')?.value;
  let session: SessionPayload | null = null;
  
  if (cookie) {
    session = await decrypt(cookie);
  }

  // 1. Redirecionar usuário não logado tentando acessar página protegida
  if (!isPublicRoute && !path.startsWith('/api') && !session) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // 2. Proteger APIs fechadas (se tentar bater na API sem sessão válida)
  if (path.startsWith('/api') && !isPublicRoute && !session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // 3. Controle de Navegação de Cargos (Admin não vai pro app da Equipe, e Equipe não entra no Admin)
  if (session) {
    // Bloqueia acessar o login se já tiver logado
    if (path === '/') {
      return NextResponse.redirect(new URL(session.cargo === 'ADMIN' ? '/admin' : '/team', req.nextUrl));
    }
    
    // Bloqueia equipe de acessar painel de admin
    if (path.startsWith('/admin') && session.cargo !== 'ADMIN') {
      return NextResponse.redirect(new URL('/team', req.nextUrl));
    }
    
    // Bloqueia admin de acessar tela exclusiva de equipe
    if (path.startsWith('/team') && session.cargo === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.nextUrl));
    }
  }

  return NextResponse.next();
}

// Configura quais rotas o Middleware irá observar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
