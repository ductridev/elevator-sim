import { useMemo } from 'react';
import { useElevatorSocket } from './hooks/useElevatorSocket';
import { ConnectionBadge } from './components/ConnectionBadge';
import { FloorPanel } from './components/FloorPanel';
import { ElevatorCar } from './components/ElevatorCar';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function App() {
  const { state, status, isCalling, callHall, carCall, openDoor, closeDoor } =
    useElevatorSocket(BACKEND_URL);

  // Floors drawn top to bottom (10 -> 1), like a real elevator display.
  const floors = useMemo(
    () => (state ? Array.from({ length: state.floors }, (_, i) => state.floors - i) : []),
    [state],
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Elevator Simulator</h1>
      <ConnectionBadge status={status} />

      {!state ? (
        <p>Connecting to backend…</p>
      ) : (
        <>
          <p style={{ color: '#555', fontSize: 14 }}>
            {state.elevators.length} elevators, {state.floors} floors. Call a cabin at a floor,
            then pick a destination inside it.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            <FloorPanel
              floors={floors}
              totalFloors={state.floors}
              elevators={state.elevators}
              isCalling={isCalling}
              onHallCall={callHall}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {state.elevators.map((e) => (
                <ElevatorCar
                  key={e.id}
                  elevator={e}
                  floors={floors}
                  totalFloors={state.floors}
                  onCarCall={(f) => carCall(e.id, f)}
                  onDoorOpen={() => openDoor(e.id)}
                  onDoorClose={() => closeDoor(e.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
