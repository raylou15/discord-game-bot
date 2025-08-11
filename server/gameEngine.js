// server/gameEngine.js
export const ROLES = {
    WEREWOLF: "Werewolf",
    VILLAGER: "Villager",
    SEER: "Seer",
    DOCTOR: "Doctor",
    HUNTER: "Hunter",
};

export const PHASES = {
    LOBBY: "LOBBY",
    NIGHT: "NIGHT",
    DAY: "DAY",
    ENDED: "ENDED",
};

const MAX_WOLVES = (n) => Math.max(1, Math.floor(n / 4)); // ~25%
const REQUIRED_ACTIONS = new Set([ROLES.WEREWOLF, ROLES.SEER, ROLES.DOCTOR]);

// In-memory store: roomId -> game state
const rooms = new Map();

function makeRoom() {
    return {
        phase: PHASES.LOBBY,
        hostId: null,
        day: 0,
        players: new Map(), // id -> { id, name, alive, role, ready }
        actions: {},
        votes: {},
        history: [],
        winner: null,
    };
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function alivePlayers(room) {
    return [...room.players.values()].filter(p => p.alive);
}

function assignRoles(room) {
    const ids = alivePlayers(room).map(p => p.id);
    shuffle(ids);

    const n = ids.length;
    const wolfCount = MAX_WOLVES(n);

    const specials = [];
    if (n >= 6) specials.push(ROLES.SEER);
    if (n >= 7) specials.push(ROLES.DOCTOR);
    if (n >= 9) specials.push(ROLES.HUNTER);

    const roleBag = [
        ...Array(wolfCount).fill(ROLES.WEREWOLF),
        ...specials
    ];
    while (roleBag.length < n) roleBag.push(ROLES.VILLAGER);

    shuffle(roleBag);

    ids.forEach((id, i) => {
        const p = room.players.get(id);
        p.role = roleBag[i];
    });
}

function publicPlayer(p, revealRole = false) {
    return {
        id: p.id,
        name: p.name,
        alive: p.alive,
        role: revealRole ? p.role : null,
    };
}

function checkWin(room) {
    const wolves = alivePlayers(room).filter(p => p.role === ROLES.WEREWOLF).length;
    const towns = alivePlayers(room).length - wolves;

    if (wolves <= 0) return "Town";
    if (wolves >= towns) return "Wolves";
    return null;
}

function resolveNight(room) {
    const { wolvesTargetId, doctorSaveId, seerInspectId } = room.actions;
    const nightReport = { type: "night", deaths: [], inspected: null };

    // Wolves kill
    if (wolvesTargetId && wolvesTargetId !== doctorSaveId) {
        const target = room.players.get(wolvesTargetId);
        if (target && target.alive) {
            target.alive = false;
            nightReport.deaths.push({
                id: target.id,
                name: target.name,
                role: target.role
            });
        }
    }

    // Seer inspection (kept secret for that Seer)
    if (seerInspectId) {
        const t = room.players.get(seerInspectId);
        if (t) nightReport.inspected = { id: t.id, isWolf: t.role === ROLES.WEREWOLF };
    }

    room.history.push(nightReport);
    room.actions = {};
}

function resolveDay(room) {
    const tally = new Map();
    for (const [voterId, targetId] of Object.entries(room.votes)) {
        const voter = room.players.get(voterId);
        if (!voter?.alive || !targetId) continue;
        tally.set(targetId, (tally.get(targetId) || 0) + 1);
    }

    let max = 0;
    let topTargets = [];
    for (const [targetId, count] of tally.entries()) {
        if (count > max) {
            max = count;
            topTargets = [targetId];
        } else if (count === max) {
            topTargets.push(targetId);
        }
    }

    const dayReport = { type: "day", lynched: null, tie: false };
    if (topTargets.length === 1 && max > 0) {
        const lynchTarget = room.players.get(topTargets[0]);
        if (lynchTarget?.alive) {
            lynchTarget.alive = false;
            dayReport.lynched = {
                id: lynchTarget.id,
                name: lynchTarget.name,
                role: lynchTarget.role
            };
        }
    } else {
        dayReport.tie = true;
    }

    room.history.push(dayReport);
    room.votes = {};
}

export const Engine = {
    ensureRoom(roomId) {
        if (!rooms.has(roomId)) rooms.set(roomId, makeRoom());
        return rooms.get(roomId);
    },

    join(roomId, { id, name }, asHost = false) {
        const room = this.ensureRoom(roomId);
        if (!room.players.has(id)) {
            room.players.set(id, { id, name, alive: true, role: null, ready: false });
            if (!room.hostId || asHost) room.hostId = id;
        } else {
            room.players.get(id).name = name;
        }
        return this.getPublicState(roomId, id);
    },

    leave(roomId, playerId) {
        const room = this.ensureRoom(roomId);
        if (room.phase === PHASES.LOBBY) {
            room.players.delete(playerId);
            if (room.hostId === playerId) {
                room.hostId = alivePlayers(room)[0]?.id ?? null;
            }
        } else {
            const p = room.players.get(playerId);
            if (p) p.alive = false;
        }
        return this.getPublicState(roomId, playerId);
    },

    toggleReady(roomId, playerId, ready) {
        const p = this.ensureRoom(roomId).players.get(playerId);
        if (p) p.ready = !!ready;
        return this.getPublicState(roomId, playerId);
    },

    start(roomId, requesterId) {
        const room = this.ensureRoom(roomId);
        if (room.phase !== PHASES.LOBBY || room.hostId !== requesterId) {
            return this.getPublicState(roomId, requesterId);
        }
        if (alivePlayers(room).length < 5) throw new Error("Need at least 5 players.");

        assignRoles(room);
        room.day = 0;
        room.phase = PHASES.NIGHT;
        room.actions = {};
        room.votes = {};
        room.history = [];
        room.winner = null;

        return this.getPublicState(roomId, requesterId);
    },

    submitNightAction(roomId, playerId, payload) {
        const room = this.ensureRoom(roomId);
        if (room.phase !== PHASES.NIGHT) return this.getPublicState(roomId, playerId);

        const actor = room.players.get(playerId);
        if (!actor?.alive) return this.getPublicState(roomId, playerId);

        room.actions ||= {};
        const { targetId } = payload || {};
        if (actor.role === ROLES.WEREWOLF) room.actions.wolvesTargetId = targetId || null;
        if (actor.role === ROLES.SEER) room.actions.seerInspectId = targetId || null;
        if (actor.role === ROLES.DOCTOR) room.actions.doctorSaveId = targetId || null;

        const actionableAlive = alivePlayers(room).filter(p => REQUIRED_ACTIONS.has(p.role));
        const allDone = actionableAlive.every(p => {
            if (p.role === ROLES.WEREWOLF) return "wolvesTargetId" in room.actions;
            if (p.role === ROLES.SEER) return "seerInspectId" in room.actions;
            if (p.role === ROLES.DOCTOR) return "doctorSaveId" in room.actions;
            return true;
        });

        if (allDone) {
            resolveNight(room);
            const winner = checkWin(room);
            if (winner) {
                room.phase = PHASES.ENDED;
                room.winner = winner;
            } else {
                room.phase = PHASES.DAY;
                room.day++;
            }
        }
        return this.getPublicState(roomId, playerId);
    },

    vote(roomId, playerId, targetId) {
        const room = this.ensureRoom(roomId);
        if (room.phase !== PHASES.DAY) return this.getPublicState(roomId, playerId);

        const voter = room.players.get(playerId);
        if (!voter?.alive) return this.getPublicState(roomId, playerId);

        room.votes[playerId] = targetId || null;

        const aliveIds = alivePlayers(room).map(p => p.id);
        if (aliveIds.every(id => id in room.votes)) {
            resolveDay(room);
            const winner = checkWin(room);
            if (winner) {
                room.phase = PHASES.ENDED;
                room.winner = winner;
            } else {
                room.phase = PHASES.NIGHT;
            }
        }
        return this.getPublicState(roomId, playerId);
    },

    getPublicState(roomId, viewerId = null) {
        const room = this.ensureRoom(roomId);
        const revealAll = room.phase === PHASES.ENDED;

        const me = viewerId ? room.players.get(viewerId) : null;
        let mySecrets = null;
        if (me?.role === ROLES.SEER) {
            const lastNight = [...room.history].reverse().find(h => h.type === "night");
            if (lastNight?.inspected) mySecrets = { lastSeen: lastNight.inspected };
        }

        return {
            phase: room.phase,
            day: room.day,
            hostId: room.hostId,
            winner: room.winner,
            players: [...room.players.values()].map(p => publicPlayer(p, revealAll)),
            aliveIds: alivePlayers(room).map(p => p.id),
            me: me ? { id: me.id, role: revealAll ? me.role : me.role ?? null } : null,
            votes: room.phase === PHASES.DAY ? room.votes : null,
            history: room.history,
            mySecrets,
        };
    },

    reset(roomId, requesterId) {
        rooms.set(roomId, makeRoom());
        return this.getPublicState(roomId, requesterId);
    },
};
