import {
  UP,
  DOWN,
  IDLE,
  type Direction,
  type UpDown,
  type ElevatorSnapshot,
} from '@elevator/shared';
import { IdleState, DoorsOpenState } from './states';
import type { ElevatorState } from './states';

export interface ElevatorConfig {
  floors: number;
  dwellTicks: number;
}

// A single cabin. Everything mutable is private (#fields); the outside world
// reads it through snapshot() and changes it through the methods below, so the
// internal rules can't be broken from outside.
export class Elevator {
  #id: number;
  #floor: number;
  #direction: Direction;
  #state: ElevatorState;
  // Requests are three floor sets:
  //   carCalls - floors picked from inside the cabin (served either direction)
  //   hallUp   - "going up" calls   (only served while heading up)
  //   hallDown - "going down" calls (only served while heading down)
  // That split is the whole directional rule: an up-bound cabin skips a down
  // call on the way past and grabs it on the way back.
  #carCalls: Set<number>;
  #hallUp: Set<number>;
  #hallDown: Set<number>;
  // Floor count + how long the doors stay open, in ticks.
  #config: ElevatorConfig;

  constructor(id: number, config: ElevatorConfig) {
    this.#id = id;
    this.#config = config;
    this.#floor = 1; // start at the ground floor
    this.#direction = IDLE;
    this.#carCalls = new Set();
    this.#hallUp = new Set();
    this.#hallDown = new Set();
    this.#state = new IdleState(); // parked
  }

  get id(): number {
    return this.#id;
  }
  get floor(): number {
    return this.#floor;
  }
  get direction(): Direction {
    return this.#direction;
  }
  get config(): ElevatorConfig {
    return this.#config;
  }
  get doorsOpen(): boolean {
    return this.#state.name === 'DOORS_OPEN';
  }

  // Mutators below are driven by the state machine and the dispatcher.
  setFloor(f: number): void {
    this.#floor = f;
  }
  setDirection(d: Direction): void {
    this.#direction = d;
  }
  setState(s: ElevatorState): void {
    this.#state = s;
  }
  becomeIdle(): void {
    this.#direction = IDLE;
    this.#state = new IdleState();
  }

  // Passenger picks a floor from inside the cabin.
  addCarCall(floor: number): void {
    // Ignore junk floors and the one we're already parked on.
    if (floor >= 1 && floor <= this.#config.floors && floor !== this.#floor) {
      this.#carCalls.add(floor);
    }
  }

  // Dispatcher hands this cabin a hall call.
  assignHallCall(floor: number, direction: UpDown): void {
    (direction === UP ? this.#hallUp : this.#hallDown).add(floor);
  }

  // Served this stop, so drop it from the queues.
  clearStop(floor: number, direction: Direction): void {
    this.#carCalls.delete(floor);
    if (direction === UP) this.#hallUp.delete(floor);
    else this.#hallDown.delete(floor);
  }

  // Read-only queries the state machine leans on.

  // Is `floor` a stop while heading `direction`? Yes if someone inside wants it,
  // or there's a matching hall call.
  isStop(floor: number, direction: Direction): boolean {
    if (this.#carCalls.has(floor)) return true;
    return direction === UP ? this.#hallUp.has(floor) : this.#hallDown.has(floor);
  }

  // Every floor we still need to reach, de-duped.
  get targetFloors(): number[] {
    return [...new Set([...this.#carCalls, ...this.#hallUp, ...this.#hallDown])];
  }

  hasTargets(): boolean {
    return this.#carCalls.size > 0 || this.#hallUp.size > 0 || this.#hallDown.size > 0;
  }

  // Any target further along in `dir`? Tells us whether to keep going or turn.
  targetsAhead(dir: Direction): boolean {
    return this.targetFloors.some((f) => (dir === UP ? f > this.#floor : f < this.#floor));
  }

  // Coming out of idle with a new request: which way to head first.
  chooseStartDirection(): UpDown {
    // If the current floor is already a stop, pick the matching way so we open right away.
    if (this.#carCalls.has(this.#floor) || this.#hallUp.has(this.#floor)) return UP;
    if (this.#hallDown.has(this.#floor)) return DOWN;
    // Otherwise head toward the nearest target.
    let bestDist = Infinity;
    let dir: UpDown = UP;
    for (const f of this.targetFloors) {
      const dist = Math.abs(f - this.#floor);
      if (dist < bestDist) {
        bestDist = dist;
        dir = f > this.#floor ? UP : DOWN;
      }
    }
    return dir;
  }

  // Arrived: clear the stop we just served and open the doors.
  arriveAndOpen(direction: Direction): void {
    this.clearStop(this.#floor, direction);
    this.#state = new DoorsOpenState(this.#config.dwellTicks);
  }

  // Door buttons forward to the current state, so they only bite while open.
  openDoor(): void {
    this.#state.openDoor();
  }
  closeDoor(): void {
    this.#state.closeDoor();
  }

  // One tick: hand off to the current state. The cabin holds no logic itself.
  step(): void {
    this.#state.step(this);
  }

  // Plain object for the client; the private fields never leak.
  snapshot(): ElevatorSnapshot {
    return {
      id: this.#id,
      floor: this.#floor,
      direction: this.#direction,
      state: this.#state.name,
      doorsOpen: this.doorsOpen,
      carCalls: [...this.#carCalls].sort((a, b) => a - b),
      hallUp: [...this.#hallUp].sort((a, b) => a - b),
      hallDown: [...this.#hallDown].sort((a, b) => a - b),
    };
  }
}
