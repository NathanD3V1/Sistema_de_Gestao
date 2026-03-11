// Exemplo de arquivo de configuração de Socket.IO
// Este arquivo será usado para comunicação em tempo real

import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

export const initializeSocket = (res: NextApiResponse) => {
  if ((res.socket as any).server.io) {
    console.log('Socket.io já está inicializado');
    return (res.socket as any).server.io;
  }

  console.log('Inicializando Socket.io...');

  const io = new SocketIOServer((res.socket as any).server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Event handlers
  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('join-incident', (incidentId) => {
      socket.join(`incident-${incidentId}`);
      console.log(`Cliente ${socket.id} entrou na sala incident-${incidentId}`);
    });

    socket.on('send-message', (data) => {
      io.to(`incident-${data.incidentId}`).emit('new-message', data);
    });

    socket.on('update-status', (data) => {
      io.to(`incident-${data.incidentId}`).emit('status-updated', data);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });

  (res.socket as any).server.io = io;
  return io;
};
