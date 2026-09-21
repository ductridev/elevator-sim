import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  UP,
  DOWN,
  type UpDown,
  type BuildingSnapshot,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@elevator/shared';

// Socket typed both ways: a wrong event name or payload fails to compile.
type ElevatorSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const hallKey = (floor: number, dir: UpDown): string => `${floor}:${dir}`;

// Wraps all socket talk: backend state, connection status, optimistic UI, and
// the command functions. Components just render and call these.
export function useElevatorSocket(url: string) {
  const socketRef = useRef<ElevatorSocket | null>(null);
  // `state` is the snapshot the backend pushes down - the source of truth.
  const [state, setState] = useState<BuildingSnapshot | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  // Optimistic UI: a just-clicked button lights up now, without waiting for the
  // next backend tick (~0.8s). Cleared whenever 'state' arrives, since the
  // backend is the source of truth from then on.
  const [pendingClicks, setPendingClicks] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const s: ElevatorSocket = io(url);
    socketRef.current = s;
    s.on('connect', () => setStatus('connected'));
    s.on('disconnect', () => setStatus('disconnected'));
    // socket.io retries on its own; show the "reconnecting" state meanwhile.
    s.io.on('reconnect_attempt', () => setStatus('connecting'));
    s.on('state', (st) => {
      setState(st);
      setPendingClicks(new Set());
    });
    return () => {
      s.close();
      socketRef.current = null;
    };
  }, [url]);

  // Collect hall calls the backend has already assigned (across all cabins)
  // into two floor sets.
  const { pendingUp, pendingDown } = useMemo(() => {
    const up = new Set<number>();
    const down = new Set<number>();
    if (state) {
      for (const e of state.elevators) {
        e.hallUp.forEach((f) => up.add(f));
        e.hallDown.forEach((f) => down.add(f));
      }
    }
    return { pendingUp: up, pendingDown: down };
  }, [state]);

  // Hall call: light the button now (optimistic), then send it to the backend.
  const callHall = useCallback((floor: number, direction: UpDown) => {
    setPendingClicks((prev) => new Set(prev).add(hallKey(floor, direction)));
    socketRef.current?.emit('hallCall', { floor, direction });
  }, []);

  const carCall = useCallback((elevatorId: number, floor: number) => {
    socketRef.current?.emit('carCall', { elevatorId, floor });
  }, []);
  const openDoor = useCallback((elevatorId: number) => {
    socketRef.current?.emit('doorOpen', { elevatorId });
  }, []);
  const closeDoor = useCallback((elevatorId: number) => {
    socketRef.current?.emit('doorClose', { elevatorId });
  }, []);

  // "Waiting for pickup" if the backend has assigned it, OR we just clicked
  // (before the next state arrives).
  const isCalling = useCallback(
    (floor: number, dir: UpDown): boolean =>
      (dir === UP ? pendingUp : pendingDown).has(floor) || pendingClicks.has(hallKey(floor, dir)),
    [pendingUp, pendingDown, pendingClicks],
  );

  return { state, status, isCalling, callHall, carCall, openDoor, closeDoor };
}
