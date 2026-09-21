import { UP, IDLE, type Direction, type UpDown, type ElevatorStateName } from '@elevator/shared';
import type { Elevator } from './Elevator';

// LOOK algorithm: a cabin keeps going one way until nothing is left ahead, then
// turns around. Lifecycle: idle -> moving -> reach a stop -> doors open ->
// timeout -> moving again if there's more, otherwise idle.

// One object per behaviour. The cabin holds a single ElevatorState and forwards
// each tick to it, so swapping the object changes behaviour (the State pattern)
// instead of a big switch on some mode flag.
export abstract class ElevatorState {
  abstract get name(): ElevatorStateName;

  // Overridden by every concrete state.
  step(_elevator: Elevator): void {}

  // No-op unless the doors are actually open.
  openDoor(): void {}
  closeDoor(): void {}
}

// Parked until there's something to do.
export class IdleState extends ElevatorState {
  get name(): ElevatorStateName {
    return 'IDLE';
  }

  step(elevator: Elevator): void {
    if (elevator.hasTargets()) {
      elevator.setState(new MovingState());
      elevator.step(); // act now rather than burn a tick sitting still
    }
  }
}

// On the move. Only stops for calls that match the way it's going, and reverses
// once there's nothing left ahead.
export class MovingState extends ElevatorState {
  get name(): ElevatorStateName {
    return 'MOVING';
  }

  step(elevator: Elevator): void {
    if (!elevator.hasTargets()) {
      elevator.becomeIdle();
      return;
    }

    let dir: Direction =
      elevator.direction === IDLE ? elevator.chooseStartDirection() : elevator.direction;
    elevator.setDirection(dir);

    // Already at a stop for the way we're heading? Open here.
    if (elevator.isStop(elevator.floor, dir)) {
      elevator.arriveAndOpen(dir);
      return;
    }

    // Nothing left ahead this way, so turn around.
    if (!elevator.targetsAhead(dir)) {
      const opp: UpDown = dir === UP ? -1 : 1;
      if (elevator.targetsAhead(opp)) {
        dir = opp;
        elevator.setDirection(dir);
      }
      // A call sitting on the turnaround floor itself (e.g. a down call at the
      // top): serve it before leaving.
      if (elevator.isStop(elevator.floor, dir)) {
        elevator.arriveAndOpen(dir);
        return;
      }
      if (!elevator.targetsAhead(dir)) {
        elevator.becomeIdle();
        return;
      }
    }

    // Move a floor, and open if we've landed on a matching stop.
    elevator.setFloor(elevator.floor + dir);
    if (elevator.isStop(elevator.floor, dir)) {
      elevator.arriveAndOpen(dir);
    }
  }
}

// Doors open on a countdown. openDoor re-arms it (hold the door), closeDoor
// zeroes it (shut on the next tick).
export class DoorsOpenState extends ElevatorState {
  #timer: number;
  #dwell: number;

  constructor(dwellTicks: number) {
    super();
    this.#dwell = dwellTicks;
    this.#timer = dwellTicks;
  }

  get name(): ElevatorStateName {
    return 'DOORS_OPEN';
  }

  openDoor(): void {
    this.#timer = this.#dwell; // hold
  }

  closeDoor(): void {
    this.#timer = 0; // close next tick
  }

  step(elevator: Elevator): void {
    this.#timer -= 1;
    if (this.#timer <= 0) {
      if (elevator.hasTargets()) elevator.setState(new MovingState());
      else elevator.becomeIdle();
    }
  }
}
