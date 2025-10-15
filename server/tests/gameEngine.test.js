import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, ROLES, PHASES } from '../gameEngine.js';

function joinPlayers(roomId, players) {
  players.forEach((player, index) => {
    Engine.join(roomId, { id: player.id, name: player.name }, index === 0);
  });
}

function readyAll(roomId, players) {
  players.forEach((player) => {
    Engine.toggleReady(roomId, player.id, true);
  });
}

function startWithRoles(roomId, hostId, roleMap) {
  Engine.start(roomId, hostId);
  const room = Engine.ensureRoom(roomId);
  for (const [id, role] of Object.entries(roleMap)) {
    const p = room.players.get(id);
    if (p) {
      p.role = role;
    }
  }
  return room;
}

test('all players must be ready before the host can start the game', () => {
  const roomId = 'test-ready';
  const players = [
    { id: 'host', name: 'Host' },
    { id: 'p2', name: 'Player 2' },
    { id: 'p3', name: 'Player 3' },
    { id: 'p4', name: 'Player 4' },
    { id: 'p5', name: 'Player 5' },
  ];
  joinPlayers(roomId, players);
  Engine.toggleReady(roomId, 'host', true);
  Engine.toggleReady(roomId, 'p2', true);
  Engine.toggleReady(roomId, 'p3', true);
  Engine.toggleReady(roomId, 'p4', true);

  assert.throws(() => Engine.start(roomId, 'host'), /All players must be ready/);
});

test('werewolves receive pack information in their secrets payload', () => {
  const roomId = 'test-pack';
  const players = [
    { id: 'alpha', name: 'Alpha' },
    { id: 'beta', name: 'Beta' },
    { id: 'gamma', name: 'Gamma' },
    { id: 'delta', name: 'Delta' },
    { id: 'epsilon', name: 'Epsilon' },
  ];
  joinPlayers(roomId, players);
  readyAll(roomId, players);
  startWithRoles(roomId, 'alpha', {
    alpha: ROLES.WEREWOLF,
    beta: ROLES.WEREWOLF,
    gamma: ROLES.SEER,
    delta: ROLES.DOCTOR,
    epsilon: ROLES.VILLAGER,
  });

  const wolfState = Engine.getPublicState(roomId, 'alpha');
  assert.equal(wolfState.phase, PHASES.NIGHT);
  assert.ok(wolfState.mySecrets?.pack);
  const packMembers = wolfState.mySecrets.pack.members.map((m) => m.id);
  assert.deepEqual(new Set(packMembers), new Set(['alpha', 'beta']));
});

test('night actions resolve with a visible history summary and advance to day', () => {
  const roomId = 'test-night-day';
  const players = [
    { id: 'wolf', name: 'Wolf' },
    { id: 'victim', name: 'Victim' },
    { id: 'seer', name: 'Seer' },
    { id: 'doctor', name: 'Doctor' },
    { id: 'hunter', name: 'Hunter' },
  ];
  joinPlayers(roomId, players);
  readyAll(roomId, players);
  startWithRoles(roomId, 'wolf', {
    wolf: ROLES.WEREWOLF,
    victim: ROLES.VILLAGER,
    seer: ROLES.SEER,
    doctor: ROLES.DOCTOR,
    hunter: ROLES.HUNTER,
  });

  Engine.submitNightAction(roomId, 'wolf', { targetId: 'victim' });
  Engine.submitNightAction(roomId, 'seer', { targetId: 'wolf' });
  const stateAfterDoc = Engine.submitNightAction(roomId, 'doctor', { targetId: 'hunter' });

  assert.equal(stateAfterDoc.phase, PHASES.DAY);
  const lastEvent = stateAfterDoc.history.at(-1);
  assert.equal(lastEvent.type, 'night');
  assert.ok(lastEvent.summary.includes('Night'));
  assert.ok(lastEvent.summary.includes('Victim'));
});

test('day voting resolves with summaries and transitions back to night', () => {
  const roomId = 'test-day';
  const players = [
    { id: 'wolf', name: 'Wolf' },
    { id: 'villager', name: 'Villager' },
    { id: 'seer', name: 'Seer' },
    { id: 'doctor', name: 'Doctor' },
    { id: 'hunter', name: 'Hunter' },
  ];
  joinPlayers(roomId, players);
  readyAll(roomId, players);
  const room = startWithRoles(roomId, 'wolf', {
    wolf: ROLES.WEREWOLF,
    villager: ROLES.VILLAGER,
    seer: ROLES.SEER,
    doctor: ROLES.DOCTOR,
    hunter: ROLES.HUNTER,
  });

  // Resolve a night where no one dies so the day can proceed cleanly.
  Engine.submitNightAction(roomId, 'wolf', { targetId: 'villager' });
  Engine.submitNightAction(roomId, 'seer', { targetId: 'wolf' });
  Engine.submitNightAction(roomId, 'doctor', { targetId: 'villager' });

  // Doctor saved the target, so everyone is alive for the day vote.
  const alive = [...room.players.values()].filter((p) => p.alive).map((p) => p.id);
  alive.forEach((id) => {
    const target = id === 'wolf' ? 'villager' : 'wolf';
    Engine.vote(roomId, id, target);
  });

  const state = Engine.getPublicState(roomId, 'villager');
  const lastEvent = state.history.at(-1);
  assert.equal(lastEvent.type, 'day');
  assert.ok(lastEvent.summary.includes('Day'));
  assert.ok(state.phase === PHASES.NIGHT || state.phase === PHASES.ENDED);
  if (state.phase === PHASES.ENDED) {
    assert.equal(state.winner, 'Town');
  }
});

test('hunter death triggers revenge shot and summaries', () => {
  const roomId = 'test-hunter';
  const players = [
    { id: 'wolf', name: 'Wolf' },
    { id: 'hunter', name: 'Hunter' },
    { id: 'seer', name: 'Seer' },
    { id: 'doctor', name: 'Doctor' },
    { id: 'villager', name: 'Villager' },
  ];
  joinPlayers(roomId, players);
  readyAll(roomId, players);
  startWithRoles(roomId, 'wolf', {
    wolf: ROLES.WEREWOLF,
    hunter: ROLES.HUNTER,
    seer: ROLES.SEER,
    doctor: ROLES.DOCTOR,
    villager: ROLES.VILLAGER,
  });

  Engine.submitNightAction(roomId, 'wolf', { targetId: 'hunter' });
  Engine.submitNightAction(roomId, 'seer', { targetId: 'wolf' });
  const stateBeforeShot = Engine.submitNightAction(roomId, 'doctor', { targetId: 'villager' });

  assert.ok(stateBeforeShot.pendingHunter);
  assert.equal(stateBeforeShot.pendingHunter.player.id, 'hunter');
  const hunterView = Engine.getPublicState(roomId, 'hunter');
  assert.ok(hunterView.mySecrets?.hunterShot);
  assert.ok(hunterView.mySecrets.hunterShot.targets.some((t) => t.id === 'wolf'));

  const afterShot = Engine.hunterShoot(roomId, 'hunter', 'wolf');
  const lastEvent = afterShot.history.at(-1);
  assert.equal(lastEvent.type, 'hunter');
  assert.ok(lastEvent.summary?.includes('Hunter'));
  assert.ok(afterShot.phase === PHASES.DAY || afterShot.phase === PHASES.ENDED);
  if (afterShot.phase === PHASES.ENDED) {
    assert.equal(afterShot.winner, 'Town');
  }
  const roomState = Engine.ensureRoom(roomId);
  assert.equal(roomState.players.get('wolf').alive, false);
});
