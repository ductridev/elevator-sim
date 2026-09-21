import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UP, DOWN, IDLE, type Direction } from '@elevator/shared';
import { Building } from '../src/models/Building';

interface Stop {
  floor: number;
  dir: Direction;
}

// Run the sim for `ticks` steps, recording each time the doors open (rising
// edge) with the floor and direction. Lets us assert the order of stops.
function recordStops(b: Building, ticks: number, elevatorIndex = 0): Stop[] {
  const e = b.elevators[elevatorIndex];
  const stops: Stop[] = [];
  let wasOpen = false;
  for (let i = 0; i < ticks; i += 1) {
    b.step();
    if (e.doorsOpen && !wasOpen) stops.push({ floor: e.floor, dir: e.direction });
    wasOpen = e.doorsOpen;
  }
  return stops;
}

describe('LOOK directional rule', () => {
  // Example from the brief: cabin going 1->10, an up-call at 5 must be served on the way up.
  it('serves an up-call while travelling up', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    b.callCar(1, 10);
    b.callHall(5, UP);
    const stops = recordStops(b, 30);
    assert.ok(stops.some((s) => s.floor === 5 && s.dir === UP));
  });

  // A down-call at 5 must not stop an up-going cabin; serve it on the way back.
  it('skips a down-call going up, serves it going down', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    b.callCar(1, 10);
    b.callHall(5, DOWN);
    const stops = recordStops(b, 40);
    assert.ok(!stops.some((s) => s.floor === 5 && s.dir === UP), 'must not stop at 5 going up');
    assert.ok(stops.some((s) => s.floor === 5 && s.dir === DOWN), 'must serve at 5 going down');
  });

  // Multiple car calls are served in sweep order (ascending while going up).
  it('serves multiple car calls in sweep order (ascending)', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    b.callCar(1, 7);
    b.callCar(1, 3);
    const floors = recordStops(b, 30).map((s) => s.floor);
    assert.deepStrictEqual(floors, [3, 7]);
  });

  // Both up and down called at one floor: serve up first, down on the way back.
  it('serves both directions at the same floor (up then down)', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    b.callHall(5, UP);
    b.callHall(5, DOWN);
    const stops = recordStops(b, 40);
    assert.ok(stops.some((s) => s.floor === 5 && s.dir === UP));
    assert.ok(stops.some((s) => s.floor === 5 && s.dir === DOWN));
  });

  // A down-call right on the turnaround floor must be served before leaving it.
  it('serves a down-call at the turnaround floor before leaving it', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    b.callCar(1, 9);
    b.callHall(9, DOWN);
    b.callHall(5, DOWN);
    const stops = recordStops(b, 50);
    const down9 = stops.findIndex((s) => s.floor === 9 && s.dir === DOWN);
    const down5 = stops.findIndex((s) => s.floor === 5 && s.dir === DOWN);
    assert.ok(down9 !== -1, 'serves the down-call at turnaround floor 9');
    assert.ok(down5 !== -1 && down5 > down9, 'then reaches 5');
  });

  it('returns to idle after all requests served', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    const e = b.elevators[0];
    b.callCar(1, 4);
    let sawIdle = false;
    for (let i = 0; i < 30; i += 1) {
      b.step();
      if (e.floor === 4 && e.direction === IDLE && !e.hasTargets()) sawIdle = true;
    }
    assert.ok(sawIdle);
  });
});

describe('doors', () => {
  it('stays open for the dwell duration then closes', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 3 });
    const e = b.elevators[0];
    b.callCar(1, 2);
    let openTicks = 0;
    let everOpened = false;
    for (let i = 0; i < 12; i += 1) {
      b.step();
      if (e.doorsOpen) {
        openTicks += 1;
        everOpened = true;
      } else if (everOpened) break;
    }
    assert.strictEqual(openTicks, 3);
  });

  it('openDoor holds the door open past the dwell', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 2 });
    const e = b.elevators[0];
    b.callCar(1, 2);
    for (let i = 0; i < 5 && !e.doorsOpen; i += 1) b.step();
    assert.ok(e.doorsOpen);
    for (let i = 0; i < 10; i += 1) {
      e.openDoor();
      b.step();
      assert.ok(e.doorsOpen, `door held open on iteration ${i}`);
    }
  });

  it('closeDoor shuts the door on the next tick', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 9 });
    const e = b.elevators[0];
    b.callCar(1, 2);
    for (let i = 0; i < 5 && !e.doorsOpen; i += 1) b.step();
    assert.ok(e.doorsOpen);
    e.closeDoor();
    b.step();
    assert.ok(!e.doorsOpen, 'closes right away even with 9 dwell ticks left');
  });
});

describe('car calls', () => {
  it('ignores a car call for the current floor', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    const e = b.elevators[0];
    b.callCar(1, 1);
    assert.ok(!e.hasTargets());
  });

  it('ignores out-of-range car calls', () => {
    const b = new Building({ floors: 10, elevatorCount: 1, dwellTicks: 1 });
    const e = b.elevators[0];
    b.callCar(1, 0);
    b.callCar(1, 11);
    assert.ok(!e.hasTargets());
  });
});

describe('dispatcher cost', () => {
  // Build a fixed state to test cost, independent of the running simulation.
  function scene(): Building {
    const b = new Building({ floors: 10, elevatorCount: 3, dwellTicks: 3 });
    b.elevators[0].setFloor(1); // #1 idle @1
    b.elevators[1].setFloor(3);
    b.elevators[1].setDirection(UP);
    b.elevators[1].addCarCall(8); // #2 going up, heading for 8
    b.elevators[2].setFloor(9);
    b.elevators[2].setDirection(DOWN);
    b.elevators[2].addCarCall(2); // #3 going down, heading for 2
    return b;
  }

  it('an up-call is taken by the on-the-way cabin, not the idle-but-farther one', () => {
    assert.strictEqual(scene().callHall(6, UP), 2);
  });

  it('a down-call is taken by the descending cabin', () => {
    assert.strictEqual(scene().callHall(6, DOWN), 3);
  });

  it('nearest idle cabin wins when all are idle', () => {
    const b = new Building({ floors: 10, elevatorCount: 3, dwellTicks: 3 });
    b.elevators[1].setFloor(5);
    assert.strictEqual(b.callHall(6, UP), 2);
  });

  // A down-call above a cabin's committed sweep: it must climb to the call
  // first, so the cost must not go negative and steal the call.
  it('does not underprice a down-call above the up-sweep top', () => {
    const b = new Building({ floors: 10, elevatorCount: 3, dwellTicks: 3 });
    b.elevators[0].setFloor(6); // #1 heading up, only a down-call at 6 pending
    b.elevators[0].setDirection(UP);
    b.elevators[0].assignHallCall(6, DOWN);
    b.elevators[1].setFloor(10); // #2 idle at the top
    b.elevators[2].setFloor(1); // #3 idle at the bottom
    // #1 cost = climb 6->8 then back = 2; #2 idle = 2. Tie -> idle #2 wins.
    assert.strictEqual(b.callHall(8, DOWN), 2);
  });

  // On equal cost, the idle cabin is preferred over an already-committed one.
  it('prefers an idle cabin over a committed one on a tie', () => {
    const b = new Building({ floors: 10, elevatorCount: 2, dwellTicks: 3 });
    b.elevators[0].setFloor(3); // #1 committed, 2 floors from the call
    b.elevators[0].setDirection(UP);
    b.elevators[0].addCarCall(9);
    b.elevators[1].setFloor(7); // #2 idle, also 2 floors from the call
    assert.strictEqual(b.callHall(5, UP), 2);
  });
});
