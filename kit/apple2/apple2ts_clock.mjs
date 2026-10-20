// The emulated machine's clock, for Apple2TS's timers, and the hooks the kit's server listens on.
//
// Apple2TS runs its timers on the host's clock: the Disk II's one-second motor spin-down, the
// boot-time hard-drive check. The build (kit/apple2/apple2ts_build.mjs) puts these functions in
// place of setTimeout and setInterval in every Apple2TS module, so that each timer runs on the
// machine's cycle count instead, and a run is the same however fast the host is. Bundled into
// tools/apple2/apple2ts-server.cjs with kit/apple2/apple2ts_server.mjs; never run on its own.

const CYCLES_PER_MS = 1020.484;     // the NTSC Apple II's clock, 14.31818 MHz * 65 / 912
let nextId = 1;
let timers = [];
let now = () => 0;
export const clock = { nextDue: Infinity };

// What the server listens to inside Apple2TS: the speaker's clicks, the Mockingboard's sound
// chips, and every read and write the CPU makes through memory (Apple2TS's own debugger calls
// it with the address and the value; the build adds the call).
export const hooks = {
    speaker: (_cycle) => {},
    mockingboard: (_sound) => {},
    access: null, // (address, value, isWrite) while the server has a read or write checkpoint
};

function recompute() {
    let d = Infinity;
    for (const t of timers) if (t.due < d) d = t.due;
    clock.nextDue = d;
}

export function vclockInit(cycles) {
    now = cycles;
}

export function vSetTimeout(fn, ms = 0, ...args) {
    const id = nextId++;
    timers.push({ id, due: now() + Math.max(0, ms) * CYCLES_PER_MS, every: 0, fn: () => fn(...args) });
    recompute();
    return id;
}

export function vSetInterval(fn, ms = 0, ...args) {
    const id = nextId++;
    const every = Math.max(1, ms) * CYCLES_PER_MS;
    timers.push({ id, due: now() + every, every, fn: () => fn(...args) });
    recompute();
    return id;
}

// A timer due at a given cycle, for state put back from a snapshot.
export function vSetTimeoutAt(fn, due) {
    const id = nextId++;
    timers.push({ id, due, every: 0, fn });
    recompute();
    return id;
}

export function vTimerDue(id) {
    const t = timers.find((x) => x.id === id);
    return t ? t.due : -1;
}

export function vClearTimeout(id) {
    timers = timers.filter((t) => t.id !== id);
    recompute();
}

// Every timer that is due, oldest first.
export function vFire() {
    const t = now();
    const due = timers.filter((x) => x.due <= t).sort((a, b) => a.due - b.due || a.id - b.id);
    for (const x of due) {
        if (x.every) x.due += x.every;
        else timers = timers.filter((y) => y !== x);
        x.fn();
    }
    recompute();
}

export function vClearAll() {
    timers = [];
    recompute();
}

export const vPending = () => timers.map((t) => ({ id: t.id, due: t.due, every: t.every }));
