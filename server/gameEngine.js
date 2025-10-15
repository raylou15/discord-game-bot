// server/gameEngine.js
export const ROLES = {
    WEREWOLF: "Werewolf",
    VILLAGER: "Villager",
    SEER: "Seer",
    DOCTOR: "Doctor",
    HUNTER: "Hunter",
};

const ROLE_UNLOCKS = {
    seer: 6,
    doctor: 7,
    hunter: 9,
    extraWolf: 10,
};

const DEFAULT_SETTINGS = {
    roles: { seer: true, doctor: true, hunter: false, extraWolf: false },
    tieRule: "no-elim",
    dayTimerSec: 120,
};

export const PHASES = {
    LOBBY: "LOBBY",
    NIGHT: "NIGHT",
    DAY: "DAY",
    ENDED: "ENDED",
};

const MAX_WOLVES = (n) => Math.max(1, Math.floor(n / 4)); // ~25%
const MIN_PLAYERS = 5;
const REQUIRED_ACTIONS = new Set([ROLES.WEREWOLF, ROLES.SEER, ROLES.DOCTOR]);

function cloneSettings(settings = {}) {
    const merged = {
        roles: {
            ...DEFAULT_SETTINGS.roles,
            ...(settings.roles || {}),
        },
        tieRule: settings.tieRule || DEFAULT_SETTINGS.tieRule,
        dayTimerSec: Number.isFinite(Number(settings.dayTimerSec))
            ? Number(settings.dayTimerSec)
            : DEFAULT_SETTINGS.dayTimerSec,
    };

    merged.dayTimerSec = Math.min(600, Math.max(30, Math.round(merged.dayTimerSec)));
    return merged;
}

// In-memory store: roomId -> game state
const rooms = new Map();

function makeRoom() {
    return {
        phase: PHASES.LOBBY,
        hostId: null,
        day: 0,
        players: new Map(), // id -> { id, name, avatar, alive, role, ready }
        actions: {},
        votes: {},
        history: [],
        winner: null,
        settings: cloneSettings(),
        phaseEndsAt: null,
        pendingHunterQueue: [],
        pendingHunter: null,
        nextPhase: null,
        runoff: null,
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
    const settings = room.settings || cloneSettings();

    let wolfCount = MAX_WOLVES(n);
    if (settings.roles.extraWolf && n >= ROLE_UNLOCKS.extraWolf) {
        wolfCount = Math.min(n - 1, wolfCount + 1);
    }

    const specials = [];
    if (settings.roles.seer && n >= ROLE_UNLOCKS.seer) specials.push(ROLES.SEER);
    if (settings.roles.doctor && n >= ROLE_UNLOCKS.doctor) specials.push(ROLES.DOCTOR);
    if (settings.roles.hunter && n >= ROLE_UNLOCKS.hunter) specials.push(ROLES.HUNTER);

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
    avatar: p.avatar || null,
    ready: !!p.ready,
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

function registerHunter(room, player, cause) {
    if (!player || player.role !== ROLES.HUNTER) return;
    room.pendingHunterQueue.push({ id: player.id, cause });
}

function activatePendingHunter(room) {
    if (room.pendingHunter || room.pendingHunterQueue.length === 0) return false;
    const entry = room.pendingHunterQueue.shift();
    room.pendingHunter = entry;
    room.phaseEndsAt = null;
    return true;
}

function maybeStartDayTimer(room) {
    if (room.phase === PHASES.DAY && !room.pendingHunter) {
        const sec = room.settings?.dayTimerSec ?? DEFAULT_SETTINGS.dayTimerSec;
        room.phaseEndsAt = Date.now() + sec * 1000;
    }
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
            registerHunter(room, target, "night");
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
        if (room.runoff && !room.runoff.includes(targetId)) continue;
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

    const dayReport = { type: "day", lynched: null, tie: false, runoff: false };

    if (topTargets.length === 0 || max === 0) {
        dayReport.tie = true;
        room.history.push(dayReport);
        room.votes = {};
        room.runoff = null;
        return { finished: true };
    }

    if (topTargets.length === 1) {
        const lynchTarget = room.players.get(topTargets[0]);
        if (lynchTarget?.alive) {
            lynchTarget.alive = false;
            dayReport.lynched = {
                id: lynchTarget.id,
                name: lynchTarget.name,
                role: lynchTarget.role
            };
            registerHunter(room, lynchTarget, "day");
        }
        room.history.push(dayReport);
        room.votes = {};
        room.runoff = null;
        return { finished: true };
    }

    // Tie cases
    const tieRule = room.settings?.tieRule || DEFAULT_SETTINGS.tieRule;

    if (tieRule === "random") {
        const chosen = topTargets[Math.floor(Math.random() * topTargets.length)];
        const lynchTarget = room.players.get(chosen);
        if (lynchTarget?.alive) {
            lynchTarget.alive = false;
            dayReport.lynched = {
                id: lynchTarget.id,
                name: lynchTarget.name,
                role: lynchTarget.role
            };
            registerHunter(room, lynchTarget, "day");
        }
        dayReport.tie = true;
        room.history.push(dayReport);
        room.votes = {};
        room.runoff = null;
        return { finished: true };
    }

    if (tieRule === "runoff" && !room.runoff) {
        room.runoff = [...topTargets];
        room.votes = {};
        dayReport.tie = true;
        dayReport.runoff = true;
        room.history.push(dayReport);
        return { finished: false };
    }

    dayReport.tie = true;
    room.history.push(dayReport);
    room.votes = {};
    room.runoff = null;
    return { finished: true };
}

export const Engine = {
    ensureRoom(roomId) {
        if (!rooms.has(roomId)) rooms.set(roomId, makeRoom());
        return rooms.get(roomId);
    },

    join(roomId, { id, name, avatar }, asHost = false) {
        const room = this.ensureRoom(roomId);
        if (!room.players.has(id)) {
            room.players.set(id, {
                id,
                name,
                avatar: avatar || null,
                alive: true,
                role: null,
                ready: false,
            });
            if (!room.hostId || asHost) room.hostId = id;
        } else {
            const existing = room.players.get(id);
            existing.name = name;
            if (avatar !== undefined) existing.avatar = avatar;
        }
        return this.getPublicState(roomId, id);
    },

    leave(roomId, playerId) {
        const room = this.ensureRoom(roomId);
        if (room.phase === PHASES.LOBBY) {
            room.players.delete(playerId);
        } else {
            const p = room.players.get(playerId);
            if (p) p.alive = false;
        }
        if (room.hostId === playerId) {
            room.hostId = alivePlayers(room)[0]?.id ?? null;
        }
        if (room.pendingHunter?.id === playerId) {
            this.hunterShoot(roomId, playerId, null);
        }
        return this.getPublicState(roomId, playerId);
    },

    toggleReady(roomId, playerId, ready) {
        const room = this.ensureRoom(roomId);
        if (room.phase !== PHASES.LOBBY) return this.getPublicState(roomId, playerId);
        const p = room.players.get(playerId);
        if (p) p.ready = !!ready;
        return this.getPublicState(roomId, playerId);
    },

    start(roomId, requesterId) {
        const room = this.ensureRoom(roomId);
        if (room.phase !== PHASES.LOBBY || room.hostId !== requesterId) {
            return this.getPublicState(roomId, requesterId);
        }
        const lobbyPlayers = [...room.players.values()];
        if (lobbyPlayers.length < MIN_PLAYERS) {
            throw new Error(`Need at least ${MIN_PLAYERS} players.`);
        }
        const unready = lobbyPlayers.filter(p => !p.ready);
        if (unready.length > 0) {
            throw new Error("All players must be ready.");
        }

        room.settings = cloneSettings(room.settings);
        assignRoles(room);
        room.day = 0;
        room.phase = PHASES.NIGHT;
        room.actions = {};
        room.votes = {};
        room.history = [];
        room.winner = null;
        room.phaseEndsAt = null;
        room.pendingHunterQueue = [];
        room.pendingHunter = null;
        room.nextPhase = null;
        room.runoff = null;

        for (const p of room.players.values()) {
            p.alive = true;
            p.ready = false;
        }

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
            const pending = activatePendingHunter(room);
            const winner = checkWin(room);
            if (winner && !pending) {
                room.phase = PHASES.ENDED;
                room.winner = winner;
                room.phaseEndsAt = null;
                room.nextPhase = null;
            } else {
                room.day++;
                if (pending) {
                    room.nextPhase = PHASES.DAY;
                } else {
                    room.phase = PHASES.DAY;
                    room.nextPhase = null;
                    maybeStartDayTimer(room);
                }
            }
        }
        return this.getPublicState(roomId, playerId);
    },

    vote(roomId, playerId, targetId) {
        const room = this.ensureRoom(roomId);
        if (room.phase !== PHASES.DAY) return this.getPublicState(roomId, playerId);
        if (room.pendingHunter) return this.getPublicState(roomId, playerId);

        const voter = room.players.get(playerId);
        if (!voter?.alive) return this.getPublicState(roomId, playerId);

        if (room.runoff && targetId && !room.runoff.includes(targetId)) {
            return this.getPublicState(roomId, playerId);
        }

        room.votes[playerId] = targetId || null;

        const aliveIds = alivePlayers(room).map(p => p.id);
        if (aliveIds.every(id => id in room.votes)) {
            const outcome = resolveDay(room);
            if (outcome.finished) {
                const pending = activatePendingHunter(room);
                const winner = checkWin(room);
                if (winner && !pending) {
                    room.phase = PHASES.ENDED;
                    room.winner = winner;
                    room.phaseEndsAt = null;
                    room.nextPhase = null;
                } else {
                    if (pending) {
                        room.nextPhase = PHASES.NIGHT;
                    } else {
                        room.phase = PHASES.NIGHT;
                        room.nextPhase = null;
                        room.phaseEndsAt = null;
                    }
                }
            }
        }
        return this.getPublicState(roomId, playerId);
    },

    getPublicState(roomId, viewerId = null) {
        const room = this.ensureRoom(roomId);
        const revealAll = room.phase === PHASES.ENDED;

        const me = viewerId ? room.players.get(viewerId) : null;
        const mySecrets = {};
        if (me?.role === ROLES.SEER) {
            const lastNight = [...room.history].reverse().find(h => h.type === "night");
            if (lastNight?.inspected) mySecrets.lastSeen = lastNight.inspected;
        }
        if (room.pendingHunter?.id === me?.id) {
            mySecrets.hunterShot = {
                targets: alivePlayers(room)
                    .filter(p => p.id !== me.id)
                    .map(p => ({ id: p.id, name: p.name })),
            };
        }

        const secretsOut = Object.keys(mySecrets).length > 0 ? mySecrets : null;

        const pendingHunter = room.pendingHunter
            ? {
                player: (() => {
                    const hunter = room.players.get(room.pendingHunter.id);
                    return hunter
                        ? { id: hunter.id, name: hunter.name }
                        : { id: room.pendingHunter.id, name: "Hunter" };
                })(),
                cause: room.pendingHunter.cause,
              }
            : null;

        return {
            roomId,
            phase: room.phase,
            day: room.day,
            hostId: room.hostId,
            winner: room.winner,
            started: room.phase !== PHASES.LOBBY,
            settings: room.settings,
            players: [...room.players.values()].map(p => publicPlayer(p, revealAll)),
            aliveIds: alivePlayers(room).map(p => p.id),
            me: me
                ? {
                    id: me.id,
                    role: revealAll ? me.role : me.role ?? null,
                    ready: !!me.ready,
                  }
                : null,
            votes: room.phase === PHASES.DAY ? room.votes : null,
            history: room.history,
            mySecrets: secretsOut,
            pendingHunter,
            phaseEndsAt: room.phaseEndsAt,
            runoffCandidates: room.runoff ? [...room.runoff] : null,
        };
    },

    reset(roomId, requesterId) {
        const existing = this.ensureRoom(roomId);
        const hostId = existing.hostId;
        for (const p of existing.players.values()) {
            p.alive = true;
            p.role = null;
            p.ready = false;
        }
        existing.phase = PHASES.LOBBY;
        existing.day = 0;
        existing.actions = {};
        existing.votes = {};
        existing.history = [];
        existing.winner = null;
        existing.phaseEndsAt = null;
        existing.pendingHunterQueue = [];
        existing.pendingHunter = null;
        existing.nextPhase = null;
        existing.runoff = null;
        if (hostId) existing.hostId = hostId;
        return this.getPublicState(roomId, requesterId);
    },

    updateSettings(roomId, playerId, patch) {
        const room = this.ensureRoom(roomId);
        if (room.hostId !== playerId) {
            return this.getPublicState(roomId, playerId);
        }
        if (room.phase !== PHASES.LOBBY) {
            throw new Error("Settings can only be changed in the lobby.");
        }

        const next = cloneSettings({ ...room.settings, ...patch, roles: { ...room.settings.roles, ...(patch?.roles || {}) } });
        const playerCount = room.players.size;
        for (const [key, unlock] of Object.entries(ROLE_UNLOCKS)) {
            if (playerCount < unlock) {
                next.roles[key] = false;
            }
        }
        room.settings = next;
        return this.getPublicState(roomId, playerId);
    },

    hunterShoot(roomId, playerId, targetId) {
        const room = this.ensureRoom(roomId);
        if (!room.pendingHunter || room.pendingHunter.id !== playerId) {
            return this.getPublicState(roomId, playerId);
        }

        const shooter = room.players.get(playerId);
        const report = {
            type: "hunter",
            shooter: shooter
                ? { id: shooter.id, name: shooter.name, role: shooter.role }
                : { id: playerId, name: "Hunter", role: ROLES.HUNTER },
            target: null,
        };

        const target = targetId ? room.players.get(targetId) : null;
        if (target?.alive && target.id !== playerId) {
            target.alive = false;
            report.target = { id: target.id, name: target.name, role: target.role };
            registerHunter(room, target, "hunter");
        }

        room.history.push(report);

        room.pendingHunter = null;

        if (activatePendingHunter(room)) {
            // Another hunter death was queued (chain reaction)
        } else {
            const winner = checkWin(room);
            if (winner) {
                room.phase = PHASES.ENDED;
                room.winner = winner;
                room.phaseEndsAt = null;
                room.nextPhase = null;
            } else if (room.nextPhase) {
                room.phase = room.nextPhase;
                room.nextPhase = null;
                if (room.phase === PHASES.DAY) {
                    maybeStartDayTimer(room);
                } else {
                    room.phaseEndsAt = null;
                }
            } else if (room.phase === PHASES.DAY) {
                maybeStartDayTimer(room);
            }
        }

        return this.getPublicState(roomId, playerId);
    },
};
