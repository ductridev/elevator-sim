import express, { type Request, type Response } from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@elevator/shared';
import { Building } from './models/Building';
import { Simulator } from './Simulator';
import { isValidFloor, isValidHallCall } from './validate';

const PORT = process.env.PORT || 3001;
const TICK_MS = Number(process.env.TICK_MS) || 800;

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' },
});

// Build the tower and run the sim; each tick pushes fresh state to every client.
const building = new Building({ floors: 10, elevatorCount: 3, dwellTicks: 3 });
const sim = new Simulator(building, (state) => io.emit('state', state), TICK_MS);
sim.start();

// Valid cabin ids, computed once for a quick check of client input.
const elevatorIds = new Set(building.elevators.map((e) => e.id));
const isElevator = (id: unknown): boolean => typeof id === 'number' && elevatorIds.has(id);

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

io.on('connection', (socket) => {
  socket.emit('state', building.snapshot());

  // Take commands from the frontend and pass them straight to Building.
  // Client data is untrusted, so validate first; drop anything malformed.
  socket.on('hallCall', (p) => {
    if (p && isValidHallCall(p.floor, p.direction, building.floors)) {
      building.callHall(p.floor, p.direction);
    }
  });

  socket.on('carCall', (p) => {
    if (p && isElevator(p.elevatorId) && isValidFloor(p.floor, building.floors)) {
      building.callCar(p.elevatorId, p.floor);
    }
  });

  socket.on('doorOpen', (p) => {
    if (p && isElevator(p.elevatorId)) building.openDoor(p.elevatorId);
  });

  socket.on('doorClose', (p) => {
    if (p && isElevator(p.elevatorId)) building.closeDoor(p.elevatorId);
  });
});

server.listen(PORT, () => console.log(`Elevator backend listening on :${PORT} (tick ${TICK_MS}ms)`));
