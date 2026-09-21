import { UP, DOWN, type UpDown, type ElevatorSnapshot } from '@elevator/shared';

interface Props {
  floors: number[];
  totalFloors: number;
  elevators: ElevatorSnapshot[];
  isCalling: (floor: number, dir: UpDown) => boolean;
  onHallCall: (floor: number, dir: UpDown) => void;
}

// Hall-call panel: one row per floor with up / down buttons.
export function FloorPanel({ floors, totalFloors, elevators, isCalling, onHallCall }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 14 }}>Floors</h2>
      {floors.map((f) => {
        const callingUp = isCalling(f, UP);
        const callingDown = isCalling(f, DOWN);
        const here = elevators
          .filter((e) => e.floor === f)
          .map((e) => `#${e.id}${e.doorsOpen ? '(open)' : ''}`)
          .join(' ');
        return (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
            <span style={{ width: 28 }}>F{f}</span>
            {/* No up on the top floor; no down on the bottom floor */}
            <button disabled={f === totalFloors} onClick={() => onHallCall(f, UP)}>
              {callingUp ? 'Up •' : 'Up'}
            </button>
            <button disabled={f === 1} onClick={() => onHallCall(f, DOWN)}>
              {callingDown ? 'Down •' : 'Down'}
            </button>
            {here && <span style={{ color: '#555', fontSize: 12 }}>{here}</span>}
          </div>
        );
      })}
    </div>
  );
}
