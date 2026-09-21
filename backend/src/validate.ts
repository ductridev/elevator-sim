import { UP, DOWN, type UpDown } from '@elevator/shared';

/**
 * Validates data coming from the client (untrusted). This is the trust
 * boundary: the socket's types only hold at compile time, a real client can
 * send anything at runtime, so we check for real. Kept out of server.ts so it
 * unit-tests without opening a socket.
 */
export const isValidFloor = (f: unknown, floors: number): f is number =>
  typeof f === 'number' && Number.isInteger(f) && f >= 1 && f <= floors;

export const isValidDirection = (d: unknown): d is UpDown => d === UP || d === DOWN;

// A valid hall call: real floor, real direction, and no calling up from the
// top floor or down from the bottom.
export const isValidHallCall = (
  floor: unknown,
  direction: unknown,
  floors: number,
): boolean =>
  isValidFloor(floor, floors) &&
  isValidDirection(direction) &&
  !(direction === UP && floor === floors) &&
  !(direction === DOWN && floor === 1);
