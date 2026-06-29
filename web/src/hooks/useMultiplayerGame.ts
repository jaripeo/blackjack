import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MPGameState } from '../types';
import { SERVER_URL } from '../config';

export type ConnStatus = 'idle' | 'connecting' | 'in-room' | 'error' | 'disconnected';

export function useMultiplayerGame() {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<MPGameState | null>(null);
  const [myId, setMyId]           = useState<string | null>(null);
  const [status, setStatus]       = useState<ConnStatus>('idle');
  const [error, setError]         = useState<string | null>(null);

  const openSocket = useCallback((): Socket => {
    if (socketRef.current) return socketRef.current;

    setStatus('connecting');
    setError(null);

    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 10_000,
      reconnection: false,
    });
    socketRef.current = socket;

    socket.on('connect',       () => setMyId(socket.id ?? null));
    socket.on('connect_error', (err) => {
      setError(`Cannot reach server: ${err.message}`);
      setStatus('error');
    });
    socket.on('roomCreated',      () => setStatus('in-room'));
    socket.on('roomJoined',       () => setStatus('in-room'));
    socket.on('joinError', ({ message }: { message: string }) => {
      setError(message);
      setStatus('error');
      socket.disconnect();
      socketRef.current = null;
    });
    socket.on('gameStateUpdate', (state: MPGameState) => setGameState(state));
    socket.on('disconnect',      () => setStatus('disconnected'));

    return socket;
  }, []);

  const emitWhenReady = useCallback((event: string, data?: unknown) => {
    const socket = openSocket();
    if (socket.connected) {
      socket.emit(event, data);
    } else {
      socket.once('connect', () => socket.emit(event, data));
    }
  }, [openSocket]);

  const createRoom   = useCallback((name: string) =>
    emitWhenReady('createRoom', { playerName: name }), [emitWhenReady]);
  const joinRoom     = useCallback((code: string, name: string) =>
    emitWhenReady('joinRoom', { roomCode: code, playerName: name }), [emitWhenReady]);
  const startGame    = useCallback(() => socketRef.current?.emit('startGame'),                    []);
  const placeBet     = useCallback((a: number) => socketRef.current?.emit('placeBet', { amount: a }), []);
  const clearBet     = useCallback(() => socketRef.current?.emit('clearBet'),                     []);
  const lockBet      = useCallback(() => socketRef.current?.emit('lockBet'),                      []);
  const playerAction = useCallback((a: string) => socketRef.current?.emit('playerAction', { action: a }), []);
  const nextRound    = useCallback(() => socketRef.current?.emit('nextRound'),                    []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setGameState(null);
    setMyId(null);
    setError(null);
    setStatus('idle');
  }, []);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  return {
    gameState, myId, status, error,
    createRoom, joinRoom, startGame,
    placeBet, clearBet, lockBet, playerAction,
    nextRound, leaveRoom,
  };
}
