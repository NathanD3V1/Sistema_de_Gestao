import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  cookies().set('sgo_session', '', { expires: new Date(0) });
  return NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
}
