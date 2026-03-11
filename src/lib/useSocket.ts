'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Hook para gerenciar conexão Socket.IO
 * Retorna o socket e funções auxiliares
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Se já temos um socket, reutiliza
    if (socket) {
      setSocketInstance(socket);
      setIsConnected(socket.connected);
      return;
    }

    // Criar nova conexão
    console.log('Conectando ao servidor Socket.IO...');
    
    socket = io({
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('Socket.IO conectado:', socket?.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO desconectado:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Erro na conexão Socket.IO:', error);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Máximo de tentativas de reconexão atingido');
      }
    });

    setSocketInstance(socket);

    // Cleanup
    return () => {
      // Não desconecta automaticamente para permitir reconexão
    };
  }, []);

  return {
    socket: socketInstance,
    isConnected,
  };
}

/**
 * Hook para participar de uma sala de ocorrência
 */
export function useIncidentRoom(incidentId: string | null, socket: Socket | null) {
  useEffect(() => {
    if (!socket || !incidentId) return;

    console.log('Entrando na sala:', `incident-${incidentId}`);
    socket.emit('join-incident', incidentId);

    return () => {
      console.log('Saindo da sala:', `incident-${incidentId}`);
      socket.emit('leave-incident', incidentId);
    };
  }, [socket, incidentId]);
}

/**
 * Hook para enviar e receber mensagens
 */
export function useChat(incidentId: string | null, senderName: string) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Participar da sala
  useIncidentRoom(incidentId, socket);

  // Buscar mensagens iniciais
  useEffect(() => {
    if (!incidentId) return;

    const fetchMessages = async () => {
      try {
        const r = await fetch(`/api/messages?channel=${encodeURIComponent(incidentId)}`);
        const json = await r.json();
        if (json.success && Array.isArray(json.data)) {
          setMessages(json.data);
        }
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
      }
    };

    fetchMessages();
  }, [incidentId]);

  // Ouvir novas mensagens
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      console.log('Nova mensagem recebida:', message);
      setMessages((prev) => [...prev, message]);
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket]);

  // Enviar mensagem
  const sendMessage = useCallback((content: string) => {
    if (!socket || !incidentId || !content.trim()) return;

    socket.emit('send-message', {
      incidentId,
      content: content.trim(),
      senderName,
    });
  }, [socket, incidentId, senderName]);

  // Indicador de "digitando"
  const handleTyping = useCallback((text: string) => {
    if (!socket || !incidentId) return;

    setIsTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, [socket, incidentId]);

  return {
    socket,
    isConnected,
    messages,
    sendMessage,
    typingUsers,
    isTyping,
    handleTyping,
  };
}

/**
 * Hook para rastrear localização em tempo real
 */
export function useTeamLocation(teamId: string | null) {
  const { socket, isConnected } = useSocket();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (!socket || !teamId) return;

    // Participar da sala da equipe
    socket.emit('join-team', teamId);

    // Ouvir atualizações de localização
    const handleLocationUpdate = (data: any) => {
      console.log('Localização atualizada:', data);
      setLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    };

    socket.on('location-updated', handleLocationUpdate);

    return () => {
      socket.off('location-updated', handleLocationUpdate);
      socket.emit('leave-incident', teamId);
    };
  }, [socket, teamId]);

  // Enviar localização
  const updateLocation = useCallback((lat: number, lng: number, extra?: {
    accuracy?: number;
    speed?: number;
    heading?: number;
  }) => {
    if (!socket || !teamId) return;

    socket.emit('update-location', {
      teamId,
      latitude: lat,
      longitude: lng,
      ...extra,
    });
  }, [socket, teamId]);

  return {
    socket,
    isConnected,
    location,
    updateLocation,
  };
}

/**
 * Hook para ouvir mudanças de status
 */
export function useIncidentStatus(incidentId: string | null) {
  const { socket, isConnected } = useSocket();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !incidentId) return;

    const handleStatusUpdate = (data: any) => {
      console.log('Status atualizado:', data);
      setStatus(data.status);
    };

    socket.on('status-updated', handleStatusUpdate);

    return () => {
      socket.off('status-updated', handleStatusUpdate);
    };
  }, [socket, incidentId]);

  return {
    socket,
    isConnected,
    status,
  };
}

