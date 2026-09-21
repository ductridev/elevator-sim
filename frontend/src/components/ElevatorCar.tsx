import { UP, DOWN, type ElevatorSnapshot } from '@elevator/shared';

interface Props {
  elevator: ElevatorSnapshot;
  floors: number[];
  totalFloors: number;
  onCarCall: (floor: number) => void;
  onDoorOpen: () => void;
  onDoorClose: () => void;
}

const dirText = (d: number): string => (d === UP ? 'up' : d === DOWN ? 'down' : 'idle');

// One column: a cabin's shaft, its floor-picker panel, and its door buttons.
export function ElevatorCar({
  elevator: e,
  floors,
  totalFloors,
  onCarCall,
  onDoorOpen,
  onDoorClose,
}: Props) {
  return (
    <div style={{ border: '1px solid #ccc', padding: 8, minWidth: 160 }}>
      <h3 style={{ fontSize: 14, margin: '0 0 6px' }}>
        Elevator #{e.id} - {e.state.toLowerCase()}, {dirText(e.direction)}
      </h3>

      {/* Shaft: mark the floor the cabin is on */}
      <div style={{ border: '1px solid #ccc', marginBottom: 6 }}>
        {floors.map((f) => {
          const here = e.floor === f;
          return (
            <div
              key={f}
              style={{
                textAlign: 'center',
                fontSize: 12,
                padding: '1px 0',
                background: here ? '#333' : undefined,
                color: here ? '#fff' : '#999',
                fontWeight: here ? 'bold' : undefined,
              }}
            >
              {here ? (e.doorsOpen ? '[ open ]' : `[ ${f} ]`) : f}
            </div>
          );
        })}
      </div>

      {/* Destination buttons; a bold button means it's selected */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 6 }}
      >
        {Array.from({ length: totalFloors }, (_, i) => i + 1).map((f) => (
          <button
            key={f}
            onClick={() => onCarCall(f)}
            style={{ fontWeight: e.carCalls.includes(f) ? 'bold' : undefined }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Door open/close buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ flex: 1 }} onClick={onDoorOpen}>
          Open
        </button>
        <button style={{ flex: 1 }} onClick={onDoorClose}>
          Close
        </button>
      </div>
    </div>
  );
}
