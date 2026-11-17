'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReconnectingWebSocket from 'partysocket/ws';

import { DETECTION_SOCKET_PATH } from '@/lib/routes';

import { startDetection } from '../actions/start-detection';
import { DETECTION_CLOSE, detectionMessageSchema } from '../types/detection';

import type { DetectionResult, DetectionStatus } from '../types/detection';

// A frame whose reply never came (socket dropped mid-inference) stops blocking the next one after this
const IN_FLIGHT_TIMEOUT_MS = 3000;

const SOCKET_OPTIONS = {
  maxRetries: 10,
  minReconnectionDelay: 1000,
  maxReconnectionDelay: 30_000,
  // Frames are only worth sending live; never replay stale ones after a reconnect
  maxEnqueuedMessages: 0,
};

const toSocketUrl = () =>
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${DETECTION_SOCKET_PATH}`;

const parseMessage = (data: unknown) => {
  if (typeof data !== 'string') return null;
  try {
    const parsed = detectionMessageSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const useDetectionSocket = (isEnabled: boolean) => {
  const [status, setStatus] = useState<Exclude<DetectionStatus, 'off'>>('connecting');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  const isLiveRef = useRef(false);
  const sentAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled) return;

    const socket = new ReconnectingWebSocket(toSocketUrl, [], SOCKET_OPTIONS);
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

    // Every (re)connect needs a fresh ticket; a 401 here sends the page to /pin through the action
    const handleOpen = async () => {
      setStatus('connecting');
      const ticket = await startDetection();
      if (!ticket.ok) {
        setStatus('unavailable');
        socket.close();
        return;
      }
      socket.send(JSON.stringify({ type: 'auth', ticket: ticket.data.ticket }));
    };

    const handleMessage = (event: MessageEvent) => {
      const message = parseMessage(event.data);
      if (!message) return;
      sentAtRef.current = null;
      if (message.type === 'ready') {
        isLiveRef.current = true;
        setStatus('live');
      }
      if (message.type === 'result') setResult(message);
    };

    const handleClose = (event: CloseEvent) => {
      isLiveRef.current = false;
      sentAtRef.current = null;
      setResult(null);
      if (event.code === DETECTION_CLOSE.originNotAllowed) {
        setStatus('unavailable');
        socket.close();
        return;
      }
      setStatus('connecting');
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.close();
      socketRef.current = null;
      isLiveRef.current = false;
    };
  }, [isEnabled]);

  // One frame in flight: the next is sent only after the reply to the last one
  const canSend = useCallback(() => {
    const sentAt = sentAtRef.current;
    const isWaiting = sentAt !== null && performance.now() - sentAt < IN_FLIGHT_TIMEOUT_MS;
    return isLiveRef.current && socketRef.current?.readyState === WebSocket.OPEN && !isWaiting;
  }, []);

  const sendFrame = useCallback(
    (frame: ArrayBuffer) => {
      if (!canSend()) return false;
      socketRef.current?.send(frame);
      sentAtRef.current = performance.now();
      return true;
    },
    [canSend],
  );

  const visibleStatus: DetectionStatus = isEnabled ? status : 'off';

  return {
    status: visibleStatus,
    result: isEnabled ? result : null,
    canSend,
    sendFrame,
  };
};
