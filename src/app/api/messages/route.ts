import { NextRequest, NextResponse } from 'next/server';

// Armazenamento em memória (para desenvolvimento; use Prisma em produção)
type StoredMessage = { id: string; content: string; senderName: string; createdAt: string };
const channels = new Map<string, StoredMessage[]>();

function getMessages(channel: string): StoredMessage[] {
  const list = channels.get(channel) ?? [];
  return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || searchParams.get('incidentId');

    if (!channel) {
      return NextResponse.json({ success: true, data: [] });
    }

    const messages = getMessages(channel);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar mensagens' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const channel = body.channel || body.incidentId;
    const content = (body.content || '').trim();
    const senderName = body.senderName || 'Anônimo';

    if (!channel || !content) {
      return NextResponse.json(
        { success: false, error: 'Canal e conteúdo são obrigatórios' },
        { status: 400 }
      );
    }

    const list = channels.get(channel) ?? [];
    const msg: StoredMessage = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      content,
      senderName,
      createdAt: new Date().toISOString(),
    };
    list.push(msg);
    channels.set(channel, list);

    return NextResponse.json({ success: true, data: msg }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}
