import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UP, DOWN } from '@elevator/shared';
import { isValidFloor, isValidDirection, isValidHallCall } from '../src/validate';

describe('validate (trust boundary)', () => {
  it('accepts in-range integer floors', () => {
    assert.ok(isValidFloor(1, 10));
    assert.ok(isValidFloor(10, 10));
  });

  it('rejects out-of-range, non-integer and non-number floors', () => {
    for (const bad of [0, 11, 3.5, -2, Number.NaN, '3', null, undefined, {}]) {
      assert.ok(!isValidFloor(bad, 10), `floor ${String(bad)} must be rejected`);
    }
  });

  it('accepts only UP/DOWN as direction', () => {
    assert.ok(isValidDirection(UP));
    assert.ok(isValidDirection(DOWN));
    for (const bad of [0, 2, 'up', null, undefined]) {
      assert.ok(!isValidDirection(bad), `direction ${String(bad)} must be rejected`);
    }
  });

  it('rejects up-at-top and down-at-bottom hall calls', () => {
    assert.ok(isValidHallCall(5, UP, 10));
    assert.ok(!isValidHallCall(10, UP, 10));
    assert.ok(!isValidHallCall(1, DOWN, 10));
    assert.ok(!isValidHallCall(99, UP, 10));
  });
});
