'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotification {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: { action: string; title: string }[];
}

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (notification: PushNotification) => void;
  error: string | null;
}

/**
 * Hook para gerenciar notificações push
 */
export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar suporte
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);
      return;
    }
    setIsSupported(false);
    setPermission('unsupported');
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      
      if (result === 'granted') {
        setError(null);
        return true;
      } else {
        setError('Permission denied');
        return false;
      }
    } catch (err: any) {
      console.error('Error requesting notification permission:', err);
      setError(err.message || 'Error requesting permission');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((notification: PushNotification) => {
    if (permission !== 'granted') {
      console.warn('Notifications not permitted');
      return;
    }

    try {
      const options: any = {
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: notification.badge || '/badge-72.png',
        tag: notification.tag || 'default',
        data: notification.data,
        vibrate: [100, 50, 100],
        requireInteraction: true,
      };

      if (notification.actions && notification.actions.length > 0) {
        options.actions = notification.actions;
      }

      new Notification(notification.title, options);
    } catch (err: any) {
      console.error('Error showing notification:', err);
      setError(err.message || 'Error showing notification');
    }
  }, [permission]);

  return {
    permission,
    isSupported,
    isEnabled: permission === 'granted',
    requestPermission,
    showNotification,
    error,
  };
}

/**
 * Hook para ouvir eventos de notificação via Service Worker
 */
export function usePushNotifications(callback: (data: any) => void) {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((subscription) => {
        if (subscription) {
          console.log('Already subscribed to push:', subscription.endpoint);
        } else {
          console.log('Not subscribed to push yet');
        }
      });
    });

    // Ouvir mensagens do Service Worker
    const handleMessage = (event: MessageEvent) => {
      console.log('Message from SW:', event.data);
      if (event.data && event.data.type) {
        callback(event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [callback]);
}

/**
 * Função para gerar subscription de push
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      ),
    });
    
    console.log('Push subscription successful:', subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

/**
 * Função para cancelar subscription de push
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Push unsubscribed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Helper para converter VAPID key
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Notificações pré-definidas para o sistema de ocorrências
 */
export const NotificationTemplates = {
  newIncident: (incident: { id: string; title: string; teamName: string }): PushNotification => ({
    title: '🎯 Nova Ocorrência Atribuída',
    body: `${incident.title} - Equipe ${incident.teamName}`,
    tag: `incident-${incident.id}`,
    data: { type: 'new-incident', incidentId: incident.id },
  }),

  statusChanged: (incident: { id: string; title: string; status: string }): PushNotification => ({
    title: '📋 Status Atualizado',
    body: `${incident.title} - ${incident.status}`,
    tag: `status-${incident.id}`,
    data: { type: 'status-changed', incidentId: incident.id },
  }),

  newMessage: (message: { incidentId: string; senderName: string; content: string }): PushNotification => ({
    title: `💬 Nova mensagem de ${message.senderName}`,
    body: message.content.substring(0, 100),
    tag: `message-${message.incidentId}`,
    data: { type: 'new-message', incidentId: message.incidentId },
  }),

  teamAvailable: (team: { id: string; name: string }): PushNotification => ({
    title: '✅ Equipe Disponível',
    body: `${team.name} está disponível para novas ocorrências`,
    tag: `team-${team.id}`,
    data: { type: 'team-available', teamId: team.id },
  }),

  incidentCompleted: (incident: { id: string; title: string }): PushNotification => ({
    title: '✅ Ocorrência Concluída',
    body: `${incident.title} foi finalizada`,
    tag: `incident-${incident.id}`,
    data: { type: 'incident-completed', incidentId: incident.id },
  }),
};

