import type { BuildingSnapshot } from '@elevator/shared';
import type { Building } from './models/Building';

/**
 * Drives time. Each tick it calls `building.step()` and hands the new state
 * out through the `onTick` callback. It knows nothing about the network
 * (socket.io), so the simulation runs and tests fine without a server.
 */
export class Simulator {
  building: Building;
  onTick: (snapshot: BuildingSnapshot) => void;
  intervalMs: number;
  timer: ReturnType<typeof setInterval> | null;

  constructor(
    building: Building,
    onTick: (snapshot: BuildingSnapshot) => void,
    intervalMs = 800,
  ) {
    this.building = building;
    this.onTick = onTick;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start(): void {
    if (this.timer) return; // don't stack a second loop on top
    this.timer = setInterval(() => {
      this.building.step();
      this.onTick(this.building.snapshot());
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
