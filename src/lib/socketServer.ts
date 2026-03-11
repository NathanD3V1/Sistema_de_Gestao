/**
 * Servidor Socket.IO para tempo real
 * Este arquivo deve ser importado no servidor Next.js
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

/**
 * Inicializa o servidor Socket.IO
 * Deve ser chamado uma vez na inicialização do servidor
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    console.log('Socket.io já está inicializado');
    return io;
  }

  console.log('Inicializando Socket.io server...');

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Em produção, limitar aos domínios permitidos
      methods: ['GET', 'POST'],
    },
    path: '/api/socket.io',
  });

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Entrar em uma sala de ocorrência
    socket.on('join-incident', (incidentId: string) => {
      socket.join(`incident-${incidentId}`);
      console.log(`Cliente ${socket.id} entrou na sala: incident-${incidentId}`);
    });

    // Sair de uma sala
    socket.on('leave-incident', (incidentId: string) => {
      socket.leave(`incident-${incidentId}`);
      console.log(`Cliente ${socket.id} saiu da sala: incident-${incidentId}`);
    });

    // Entrar na sala geral da equipe
    socket.on('join-team', (teamId: string) => {
      socket.join(`team-${teamId}`);
      console.log(`Cliente ${socket.id} entrou na sala: team-${teamId}`);
    });

    // Enviar mensagem para uma ocorrência
    socket.on('send-message', (data: {
      incidentId: string;
      content: string;
      senderName: string;
    }) => {
      const message = {
        id: `msg-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      };
      
      // Envia para todos na sala da ocorrência
      io?.to(`incident-${data.incidentId}`).emit('new-message', message);
      console.log(`Mensagem enviada para incident-${data.incidentId}:`, message.content);
    });

    // Atualizar status de uma ocorrência
    socket.on('update-status', (data: {
      incidentId: string;
      status: string;
      teamId?: string;
    }) => {
      // Enviar para todos na sala da ocorrência
      io?.to(`incident-${data.incidentId}`).emit('status-updated', data);
      console.log(`Status atualizado para incident-${data.incidentId}:`, data.status);
    });

    // Atualizar localização da equipe
    socket.on('update-location', (data: {
      teamId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    }) => {
      // Enviar para todos que estão assistindo esta equipe
      io?.to(`team-${data.teamId}`).emit('location-updated', data);
    });

    // Notificação de nova ocorrência
    socket.on('new-incident', (data: {
      incidentId: string;
      title: string;
      teamId: string;
    }) => {
      // Enviar para a equipe específica
      io?.to(`team-${data.teamId}`).emit('incident-assigned', data);
      console.log(`Nova ocorrência para equipe ${data.teamId}:`, data.title);
    });

    // Cliente desconectado
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });

    // Erro na conexão
    socket.on('error', (error) => {
      console.error(`Erro no socket ${socket.id}:`, error);
    });
  });

  console.log('Socket.io server inicializado com sucesso');
  return io;
}

/**
 * Obtém a instância do servidor Socket.IO
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Envia uma mensagem para uma sala específica
 */
export function emitToIncident(incidentId: string, event: string, data: any) {
  if (io) {
    io.to(`incident-${incidentId}`).emit(event, data);
  }
}

/**
 * Envia uma mensagem para uma equipe específica
 */
export function emitToTeam(teamId: string, event: string, data: any) {
  if (io) {
    io.to(`team-${teamId}`).emit(event, data);
  }
}

