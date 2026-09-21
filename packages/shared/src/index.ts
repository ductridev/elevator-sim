// Shared contract for both ends: direction constants, snapshot types, and the
// socket event maps. One source of truth - change it here and both the backend
// and the frontend get type-checked against it, so `UP = 1` never drifts apart.

// +1 / -1 / 0 so `floor + direction` moves the cabin and `-direction` reverses
// it. `as const` keeps them as literal types instead of widening to number.
export const UP = 1 as const;
export const DOWN = -1 as const;
export const IDLE = 0 as const;

// Hall calls are only ever UP/DOWN; a cabin's heading can also be IDLE.
export type UpDown = typeof UP | typeof DOWN;
export type Direction = UpDown | typeof IDLE;

// Flip UP <-> DOWN.
export const opposite = (d: UpDown): UpDown => (d === UP ? DOWN : UP);

// Cabin state names, mirroring the backend state machine.
export type ElevatorStateName = 'IDLE' | 'MOVING' | 'DOORS_OPEN';

// What the backend pushes to every client each tick.
export interface ElevatorSnapshot {
  id: number;
  floor: number;
  direction: Direction;
  state: ElevatorStateName;
  doorsOpen: boolean;
  carCalls: number[];
  hallUp: number[];
  hallDown: number[];
}

export interface BuildingSnapshot {
  floors: number;
  elevators: ElevatorSnapshot[];
}

// Commands the client sends up.
export interface HallCallPayload {
  floor: number;
  direction: UpDown;
}
export interface CarCallPayload {
  elevatorId: number;
  floor: number;
}
export interface DoorPayload {
  elevatorId: number;
}

// Typed on both ends, so a wrong event name or payload fails to compile.
export interface ServerToClientEvents {
  state: (snapshot: BuildingSnapshot) => void;
}
export interface ClientToServerEvents {
  hallCall: (p: HallCallPayload) => void;
  carCall: (p: CarCallPayload) => void;
  doorOpen: (p: DoorPayload) => void;
  doorClose: (p: DoorPayload) => void;
}
