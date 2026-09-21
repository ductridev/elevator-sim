import { Elevator } from './Elevator';
import { Dispatcher } from './Dispatcher';
import type { BuildingSnapshot, UpDown } from '@elevator/shared';

export interface BuildingConfig {
  floors?: number;
  elevatorCount?: number;
  dwellTicks?: number;
}

/**
 * Owns the cabins and the dispatcher, and is the single door the
 * server/simulator calls through. Pure routing - no elevator logic lives here.
 */
export class Building {
  floors: number;
  elevators: Elevator[];
  dispatcher: Dispatcher;

  constructor({ floors = 10, elevatorCount = 3, dwellTicks = 3 }: BuildingConfig = {}) {
    this.floors = floors;
    this.elevators = Array.from(
      { length: elevatorCount },
      (_, i) => new Elevator(i + 1, { floors, dwellTicks }),
    );
    this.dispatcher = new Dispatcher(this);
  }

  // Someone presses up/down at a floor. Returns the id of the assigned cabin.
  callHall(floor: number, direction: UpDown): number {
    return this.dispatcher.handleHallCall(floor, direction);
  }

  // Someone inside a cabin picks a destination floor.
  callCar(elevatorId: number, floor: number): void {
    this.#find(elevatorId)?.addCarCall(floor);
  }

  openDoor(elevatorId: number): void {
    this.#find(elevatorId)?.openDoor();
  }

  closeDoor(elevatorId: number): void {
    this.#find(elevatorId)?.closeDoor();
  }

  step(): void {
    for (const e of this.elevators) e.step();
  }

  snapshot(): BuildingSnapshot {
    return { floors: this.floors, elevators: this.elevators.map((e) => e.snapshot()) };
  }

  #find(id: number): Elevator | undefined {
    return this.elevators.find((e) => e.id === id);
  }
}
