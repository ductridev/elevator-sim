import { UP, DOWN, IDLE, type UpDown } from '@elevator/shared';
import type { Building } from './Building';
import type { Elevator } from './Elevator';

/**
 * Picks which cabin answers a hall call: the one that reaches it soonest.
 *
 * "Soonest" is estimated as ticks-to-arrive given the route each cabin is
 * already committed to; lowest estimate wins.
 *
 * Deliberate simplification: the choice is made once, at call time, and stays
 * put (no reassignment later). Good enough for 3 cabins / 10 floors. Under
 * heavy load you'd upgrade this to periodic global rebalancing.
 */
export class Dispatcher {
  building: Building;

  constructor(building: Building) {
    this.building = building;
  }

  handleHallCall(floor: number, direction: UpDown): number {
    let best: Elevator | null = null;
    let bestCost = Infinity;
    for (const e of this.building.elevators) {
      const cost = this.#cost(e, floor, direction);
      if (cost < bestCost) {
        bestCost = cost;
        best = e;
      }
    }
    // There's always at least one cabin, so `best` can't be null here.
    best!.assignHallCall(floor, direction);
    return best!.id;
  }

  // Estimate floors (~ticks) for `elevator` to reach the call at (floor, dir).
  #cost(elevator: Elevator, floor: number, dir: UpDown): number {
    const cur = elevator.floor;
    const ed = elevator.direction;
    const targets = elevator.targetFloors;

    // Idle cabin: cost is just the straight-line distance.
    if (ed === IDLE || targets.length === 0) return Math.abs(cur - floor);

    const top = Math.max(cur, ...targets);
    const bottom = Math.min(cur, ...targets);

    if (ed === UP) {
      // Same way (up) and the call is still above: go straight there.
      if (dir === UP && floor >= cur) return floor - cur;
      // Opposite way (a down call): run to the top, then back down to it.
      if (dir === DOWN) return top - cur + (top - floor);
      // Up call we've already passed: top, down to the bottom, back up to it.
      return top - cur + (top - bottom) + (floor - bottom);
    }

    // ed === DOWN: mirror image of the above.
    if (dir === DOWN && floor <= cur) return cur - floor;
    if (dir === UP) return cur - bottom + (floor - bottom);
    return cur - bottom + (top - bottom) + (top - floor);
  }
}
