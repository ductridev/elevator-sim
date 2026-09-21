import type { ConnectionStatus } from '../hooks/useElevatorSocket';

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'reconnecting…',
  connected: 'connected',
  disconnected: 'disconnected',
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  return <p style={{ color: '#555', fontSize: 12, margin: '0 0 8px' }}>{LABEL[status]}</p>;
}
