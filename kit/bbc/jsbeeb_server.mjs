// The kit's BBC Micro: jsbeeb, the emulator, running in this Node process and driven over a
// local socket. kit/bbc/jsbeeb.py is its client; kit/bbc/tools.py starts and stops it.
//
//   node kit/bbc/jsbeeb_server.mjs [--port 6845] [--model B-DFS1.2] [--jsbeeb <package dir>]
//
// jsbeeb is installed under tools/bbc/node_modules (kit/bbc/INSTALL.md) and is imported from
// there at run time, so none of its code is in this repository. jsbeeb drives a machine from
// a script only through calls made inside the process that holds it; this server holds the
// machine so that the agent's one-off calls and a script's loop reach the same one.
//
// The protocol is one JSON object a line, both ways, on 127.0.0.1 only. A request is
// {"id": 7, "cmd": "read", ...arguments}; its reply carries the same id and "ok": true with the
// result, or "ok": false with "error". "id", "cmd" and "ok" are the protocol's own: no argument or
// result uses them (a checkpoint's number is "checkpoint"). The commands are listed in
// kit/skills/bbc/tool-jsbeeb.
//
// The machine runs only inside `run`, `step`, `boot`, `autoboot` and `type`, in slices, and
// between two slices it answers every other call: a call made while it runs is served between
// two instructions, and `stop` ends the run there. A command that replaces the machine's state
// (`load`, `back`, `reset`) stops a run first.
//
// Checkpoints are the server's, not the machine's, so a load never touches them. One hook per
// kind of access sees every checkpoint, so a counting checkpoint still counts on the instruction
// where a stopping one stops. The first instruction of a run or a step is counted but never
// stopped on: a machine stopped at a checkpoint goes on past it, as VICE's does.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(path.dirname(HERE));
const PROTOCOL = 1;
const SLICE = 100000;            // cycles a slice: 50 ms of the machine's time between two looks at the socket
const FRAME_BACKSTOP = 200000;   // cycles a frame may take before a frame advance gives up (a frame is 40,000)
const RUN_BACKSTOP = 60 * 2000000;   // a run with no limit of its own stops after a minute of the machine's time

function option(name, fallback) {
    const i = process.argv.indexOf(name);
    return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const PORT = Number(option("--port", process.env.KIT_JSBEEB_PORT || 6845));
const MODEL = option("--model", "B-DFS1.2");
const JSBEEB = path.resolve(option("--jsbeeb", path.join(ROOT, "tools", "bbc", "node_modules", "jsbeeb")));

async function jsbeebModule(file) {
    return import(pathToFileURL(path.join(JSBEEB, "src", file)).href);
}

let jsbeebVersion = "unknown";
try {
    jsbeebVersion = JSON.parse(fs.readFileSync(path.join(JSBEEB, "package.json"), "utf8")).version;
} catch {
    console.error(`no jsbeeb at ${JSBEEB}: run \`python3 kit/scripts/tools.py get-jsbeeb\` (kit/bbc/INSTALL.md)`);
    process.exit(2);
}
const { MachineSession } = await jsbeebModule("machine-session.js");
const { createSnapshot, restoreSnapshot, snapshotToJSON, snapshotFromJSON } = await jsbeebModule("snapshot.js");
const { discFor } = await jsbeebModule("fdc.js");
const { DiscLayout } = await jsbeebModule("disc.js");
const { loadTapeFromData } = await jsbeebModule("tapes.js");
const { BBC } = await jsbeebModule("keymap.js");
const { isBemSnapshot, parseBemSnapshot } = await jsbeebModule("bem-snapshot.js");
const { isUefSnapshot, parseUefSnapshot } = await jsbeebModule("uef-snapshot.js");

const session = new MachineSession(MODEL);
await session.initialise();
await session.boot(30);
session.drainOutput();
const cpu = session._machine.processor;
const typist = session._machine.typist;
// The bytes sent through WRCHV, as they were sent: `output`'s text leaves out what has no
// printable form (a control code, a teletext code), so it returns these as well. Kept to the
// last million, so that a long run nobody reads does not fill the server's memory.
const vduCodes = [];
session._machine.onVduChar((c) => {
    vduCodes.push(c);
    if (vduCodes.length > 2000000) vduCodes.splice(0, vduCodes.length - 1000000);
});
const elapsed = () => session.elapsedCycles;

// ---- the run: slices, the reason it stopped ----------------------------------------------

const S = {
    running: false,
    stopRequested: false,
    run: null, // the promise of the run in progress
    hit: null, // the checkpoint that stopped the run, as the reply gives it
    stepDone: false,
    stepLeft: 0, // hook calls left before a step stops: see step()
    until: -1, // an address the run stops on, or -1
    untilHit: false,
    firstCall: false, // the first hook call of a run, which never stops
    noStopPc: -1,
    checkpoints: new Map(),
    nextId: 1,
    exec: [],
    reads: [],
    writes: [],
    codemap: null,
    media: { drives: [null, null], tape: null },
    sound: null,
    kept: new Map(),
};

let chain = Promise.resolve();
// One command at a time changes the machine: `run`, `load` and the rest queue here.
function exclusive(fn) {
    const p = chain.then(fn);
    chain = p.catch(() => {});
    return p;
}

// A command that replaces the machine's state ends a run in progress first.
function replacing(fn) {
    if (S.running) S.stopRequested = true;
    return exclusive(fn);
}

const yieldToSocket = () => new Promise((resolve) => setImmediate(resolve));

async function runCore({ cycles, frames, until, maxCycles }) {
    S.running = true;
    S.stopRequested = false;
    S.hit = null;
    S.stepDone = false;
    S.untilHit = false;
    S.firstCall = true;
    // after a stop that a hook made, jsbeeb skips the hooks for the next instruction: it
    // was counted when the machine stopped on it, so there is no first call to protect
    S.noStopPc = cpu.breakpointResume ? -1 : cpu.pc;
    S.until = until ?? -1;
    const c0 = elapsed();
    const f0 = session.frameCount;
    let budget = cycles ?? maxCycles ?? RUN_BACKSTOP;
    if (frames) {
        session._stopAtFrame = f0 + frames;
        budget = maxCycles ?? frames * FRAME_BACKSTOP;
    }
    let left = budget;
    let halted = false;
    let asked = false;
    try {
        while (left > 0) {
            const todo = Math.min(left, SLICE);
            const before = elapsed();
            halted = !cpu.execute(todo);
            left -= todo;
            if (halted) {
                // execute() adds each request to a running target, so a slice cut short would
                // otherwise lengthen the next one
                cpu.targetCycles = cpu.currentCycles;
                break;
            }
            if (elapsed() === before && todo > 0) break; // nothing ran: never spin
            await yieldToSocket();
            if (S.stopRequested) {
                asked = true;
                break;
            }
        }
    } finally {
        session._stopAtFrame = Infinity;
        S.until = -1;
        S.stepLeft = 0;
        S.running = false;
        S.stopRequested = false;
        if (S.rearmNeeded) {
            S.rearmNeeded = false;
            rearm();
        }
    }
    let reason;
    if (S.stepDone) reason = "step";
    else if (S.hit) reason = "checkpoint";
    else if (S.untilHit) reason = "until";
    else if (frames && session.frameCount >= f0 + frames) reason = "frames";
    else if (asked) reason = "stopped";
    else if (halted) reason = "stopped";
    else if (cycles != null) reason = "cycles";
    else reason = "timeout";
    return {
        reason,
        pc: cpu.pc,
        ran: elapsed() - c0,
        frames: session.frameCount - f0,
        cycles: elapsed(),
        hit: S.hit,
        registers: registers(),
    };
}

function run(args) {
    if (S.running) throw new Error("the machine is already running: `stop` it first");
    const p = exclusive(() =>
        runCore({
            cycles: args.cycles ?? (args.seconds != null ? Math.round(args.seconds * cpu.model.cyclesPerSecond) : undefined),
            frames: args.frames,
            until: args.until,
            maxCycles: args.max_cycles,
        }),
    );
    S.run = p;
    return p;
}

// One hook call comes before each instruction. A machine stopped by a hook skips the call for
// the instruction it stopped on, so n instructions take n calls from there and n + 1 from any
// other stop (a frame, a slice, a load, a pause).
function step(args) {
    if (S.running) throw new Error("the machine is running: `stop` it first");
    const n = Math.max(1, args.count ?? 1);
    return exclusive(async () => {
        S.stepLeft = n + (cpu.breakpointResume ? 0 : 1);
        const r = await runCore({ cycles: undefined, maxCycles: args.max_cycles ?? 2000000 });
        r.next = disassemble(cpu.pc);
        return r;
    });
}

// ---- checkpoints ---------------------------------------------------------------------------

function matches(when, value) {
    if (!when) return true;
    for (const [k, v] of Object.entries(when)) {
        const have = k === "value" ? value : k === "p" ? cpu.p.asByte() : cpu[k];
        if (have !== v) return false;
    }
    return true;
}

function onExec(pc) {
    if (S.codemap) {
        const m = S.codemap;
        if (m.count[pc]++ === 0) m.len[pc] = instructionLength(pc);
    }
    const first = S.firstCall;
    S.firstCall = false;
    if (!S.exec.length && S.stepLeft === 0 && S.until < 0) return false;
    const mayStop = !(first && pc === S.noStopPc);
    let stop = false;
    for (const cp of S.exec) {
        if (pc < cp.start || pc > cp.end || !matches(cp.when)) continue;
        cp.hits++;
        cp.last = { pc };
        if (!cp.stop || !mayStop) continue;
        if (cp.skip > 0) {
            cp.skip--;
            continue;
        }
        if (!S.hit) S.hit = { checkpoint: cp.id, kind: "exec", address: pc, pc };
        stop = true;
    }
    if (S.until === pc && mayStop) {
        S.untilHit = true;
        stop = true;
    }
    if (S.stepLeft > 0 && --S.stepLeft === 0) {
        S.stepDone = true;
        stop = true;
    }
    if (stop) dropTemporary();
    return stop;
}

// The instruction being carried out while a read or write happens: jsbeeb notes each
// instruction's address before it fetches the opcode, on the path it takes while any hook is set.
const currentInstruction = () => cpu.oldPcArray[cpu.oldPcIndex];

function access(list, kind, addr, value) {
    let stop = false;
    for (const cp of list) {
        if (addr < cp.start || addr > cp.end) continue;
        const pc = currentInstruction();
        if (kind === "read" && !cp.fetch && isFetch(addr, pc)) continue;
        if (!matches(cp.when, value)) continue;
        cp.hits++;
        cp.last = { pc, address: addr, value };
        if (!cp.stop) continue;
        if (cp.skip > 0) {
            cp.skip--;
            continue;
        }
        if (!S.hit) S.hit = { checkpoint: cp.id, kind, address: addr, pc, value };
        stop = true;
    }
    if (stop) dropTemporary();
    return stop;
}

// A read of the instruction's own opcode or operand bytes is a fetch, not a load.
function isFetch(addr, pc) {
    const d = (addr - pc) & 0xffff;
    return d < 3 && d < instructionLength(pc);
}

function instructionLength(pc) {
    return ((cpu.disassembler.disassemble(pc, true)[1] - pc) & 0xffff) || 1;
}

let readHook = null;
let writeHook = null;

function rearm() {
    const all = [...S.checkpoints.values()];
    S.exec = all.filter((c) => c.kind === "exec");
    S.reads = all.filter((c) => c.kind === "read");
    S.writes = all.filter((c) => c.kind === "write");
    // a read or write hook slows every access, so each is there only while it has a checkpoint
    if (S.reads.length && !readHook) readHook = cpu.debugRead.add((addr, value) => access(S.reads, "read", addr, value));
    if (!S.reads.length && readHook) {
        readHook.remove();
        readHook = null;
    }
    if (S.writes.length && !writeHook) writeHook = cpu.debugWrite.add((addr, value) => access(S.writes, "write", addr, value));
    if (!S.writes.length && writeHook) {
        writeHook.remove();
        writeHook = null;
    }
}

// A temporary checkpoint goes once it has stopped the machine. The hooks are rebuilt when the
// run ends, never from inside the hook that is being called.
function dropTemporary() {
    const cp = S.hit && S.checkpoints.get(S.hit.checkpoint);
    if (cp && cp.temporary) {
        S.checkpoints.delete(cp.id);
        S.rearmNeeded = true;
    }
}

function addCheckpoint(args) {
    const kind = args.kind ?? "exec";
    if (!["exec", "read", "write"].includes(kind)) throw new Error(`kind ${kind}: exec, read or write`);
    const start = address(args.address);
    const end = args.end != null ? address(args.end) : start;
    if (end < start) throw new Error("end is before address");
    const cp = {
        id: S.nextId++,
        kind,
        start,
        end,
        stop: args.stop ?? true,
        skip: args.ignore ?? 0,
        temporary: !!args.temporary,
        fetch: !!args.fetch,
        when: args.when ?? null,
        hits: 0,
        last: null,
    };
    S.checkpoints.set(cp.id, cp);
    rearm();
    return { checkpoint: cp.id };
}

function listCheckpoints() {
    return {
        checkpoints: [...S.checkpoints.values()].map((c) => ({
            checkpoint: c.id,
            kind: c.kind,
            address: c.start,
            end: c.end,
            stop: c.stop,
            ignore: c.skip,
            temporary: c.temporary,
            fetch: c.fetch,
            when: c.when,
            hits: c.hits,
            last: c.last,
        })),
    };
}

function deleteCheckpoints(args) {
    if (args.all) S.checkpoints.clear();
    else if (!S.checkpoints.delete(args.checkpoint)) throw new Error(`no checkpoint ${args.checkpoint}: give "checkpoint": n, or "all": true`);
    rearm();
    return { left: S.checkpoints.size };
}

function zeroCheckpoints(args) {
    for (const cp of S.checkpoints.values()) if (args.checkpoint == null || cp.id === args.checkpoint) {
        cp.hits = 0;
        cp.last = null;
    }
    return {};
}

// ---- memory, registers, chips ------------------------------------------------------------

function address(a) {
    const n = typeof a === "string" ? parseInt(a.replace(/^[$&]|^0x/i, ""), 16) : a;
    if (!Number.isInteger(n) || n < 0 || n > 0xffff) throw new Error(`address ${a}: 0 to &FFFF`);
    return n;
}

// Pages in the bank (or, on a Master, the shadow RAM) asked for, for the length of fn, then
// puts the map back as the machine had it: nothing the program sees changes.
function withPaging({ bank, shadow }, fn) {
    const { romsel, acccon } = cpu;
    if (bank != null && !(Number.isInteger(bank) && bank >= 0 && bank <= 15)) throw new Error(`bank ${bank}: 0 to 15`);
    if (shadow != null && !cpu.model.isMaster) throw new Error("only a Master has shadow RAM");
    try {
        if (bank != null) cpu.romSelect(bank);
        if (shadow != null) cpu.writeAcccon(shadow ? acccon | 4 : acccon & ~4);
        return fn();
    } finally {
        if (bank != null) cpu.romSelect(romsel);
        if (shadow != null) cpu.writeAcccon(acccon);
    }
}

// Memory as the CPU sees it, without touching a device: reading a VIA's registers through the
// bus would clear its interrupt flags. The I/O pages read as &FF here; `chips` has them.
function readMemory(args) {
    const start = address(args.address);
    const length = args.length ?? 256;
    if (!(Number.isInteger(length) && length >= 0 && length <= 0x10000)) throw new Error("length: 0 to 65536");
    let io = false;
    const out = withPaging(args, () => {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            const a = (start + i) & 0xffff;
            const page = a >>> 8;
            if (cpu.memStat[page]) bytes[i] = cpu.ramRomOs[cpu.memLook[page] + a];
            else {
                bytes[i] = 0xff;
                io = true;
            }
        }
        return bytes;
    });
    return { address: start, data: Buffer.from(out).toString("base64"), io };
}

function writeMemory(args) {
    const start = address(args.address);
    const bytes = args.data != null ? Buffer.from(args.data, "base64") : Uint8Array.from(args.bytes ?? []);
    withPaging(args, () => {
        for (let i = 0; i < bytes.length; i++) {
            const a = (start + i) & 0xffff;
            const page = a >>> 8;
            const stat = cpu.memStat[page];
            if (stat === 1) cpu.ramRomOs[cpu.memLook[page] + a] = bytes[i];
            else if (stat === 0 && args.io) cpu.writeDevice(a, bytes[i]);
            else if (stat === 0) throw new Error(`&${hex(a)} is I/O: pass "io": true to write to the device`);
            else throw new Error(`&${hex(a)} is ROM in the map as it is paged`);
        }
    });
    return { written: bytes.length };
}

const hex = (n, w = 4) => n.toString(16).toUpperCase().padStart(w, "0");

function registers() {
    const p = cpu.p.asByte();
    const flags = "NV-BDIZC"
        .split("")
        .map((f, i) => (p & (0x80 >> i) ? f : f.toLowerCase()))
        .join("");
    return { pc: cpu.pc, a: cpu.a, x: cpu.x, y: cpu.y, s: cpu.s, p, flags, cycles: elapsed() };
}

function setRegisters(args) {
    for (const k of ["a", "x", "y", "s"]) if (args[k] != null) cpu[k] = args[k] & 0xff;
    if (args.p != null) cpu.p.setFromByte(args.p & 0xff);
    if (args.pc != null) {
        cpu.pc = address(args.pc);
        cpu.breakpointResume = false; // the instruction at the new PC has not been seen yet
    }
    return registers();
}

// A VIA's registers as the program would read them, from the chip's own fields: no read goes
// through the bus. The timer counters are as of the chip's last update, `stale` cycles ago.
function via(v) {
    return {
        ora: v.ora,
        orb: v.orb,
        ira: v.ira,
        irb: v.irb,
        ddra: v.ddra,
        ddrb: v.ddrb,
        t1c: ((v.t1c + 1) >>> 1) & 0xffff,
        t1l: (v.t1l >>> 1) & 0xffff,
        t2c: ((v.t2c + 1) >>> 1) & 0xffff,
        sr: v.sr,
        acr: v.acr,
        pcr: v.pcr,
        ifr: v.ifr,
        ier: v.ier | 0x80,
        porta_pins: v.portapins,
        portb_pins: v.portbpins,
        stale: cpu.scheduler.epoch - v.lastPolltime,
    };
}

function chips() {
    const video = cpu.video;
    const sound = cpu.soundChip;
    const out = {
        model: cpu.model.name,
        romsel: cpu.romsel,
        system_via: { ...via(cpu.sysvia), latch: cpu.sysvia.IC32 },
        user_via: via(cpu.uservia),
        crtc: Array.from(video.regs.slice(0, 18)),
        ula: { control: video.ulactrl, palette: Array.from(video.actualPal) },
        sound: {
            tone: Array.from(sound.registers.slice(0, 3)),
            noise: sound.registers[3],
            volume: Array.from(sound.volume).map((x) => Math.round(x * 1000) / 1000),
        },
        frames: session.frameCount,
    };
    if (cpu.model.isMaster) out.acccon = cpu.acccon;
    return out;
}

function disassemble(pc) {
    const [text, next] = cpu.disassembler.disassemble(pc, true);
    return { address: pc, text, length: (next - pc) & 0xffff };
}

// ---- keys ----------------------------------------------------------------------------------

// A key by jsbeeb's name for it (Z, SHIFT, RETURN, K1, F0), by the character on it, by its
// place in the matrix [column, row], or by the MOS's internal key number (&61 is Z).
function matrixKey(k) {
    if (Array.isArray(k)) return k;
    if (typeof k === "number") return [k & 15, (k >> 4) & 7];
    const name = String(k);
    const byName = BBC[name.toUpperCase()] ?? (/^[0-9]$/.test(name) ? BBC["K" + name] : null) ?? (name === " " ? BBC.SPACE : null);
    if (!byName) throw new Error(`no key ${JSON.stringify(k)}: a name from jsbeeb's BBC key table, [column, row], or an internal key number`);
    return byName;
}

function key(args) {
    if (typist.isTyping) throw new Error("text from `type` is still being typed: run on, or `release-keys`");
    const k = matrixKey(args.key);
    if (args.down === false) session.keyUpRaw(k);
    else session.keyDownRaw(k);
    return { held: session.heldKeys() };
}

// The analogue joystick: what each of the ADC's four channels converts to (0 to 65535, or null
// for jsbeeb's own, the centre, &8000), and the two fire buttons, which pull System VIA port B
// bits 4 and 5 low. Which way a channel runs is the machine's (kit/skills/bbc/bbc-reference).
// Held until changed; a snapshot does not hold them.
function joystick(args) {
    const adc = cpu.adconverter;
    const channels = args.channels ?? [];
    if (!Array.isArray(channels) || channels.length > 4) throw new Error("channels: a list of up to four values");
    channels.forEach((v, ch) => {
        if (v === undefined) return;
        if (v === null) adc.clearChannelSource(ch);
        else if (Number.isInteger(v) && v >= 0 && v <= 0xffff) adc.setChannelSource(ch, { getValue: () => v, dispose() {} });
        else throw new Error(`channel ${ch}: 0 to 65535, or null`);
    });
    if (args.fire1 != null) cpu.sysvia.setJoystickButton(0, !!args.fire1);
    if (args.fire2 != null) cpu.sysvia.setJoystickButton(1, !!args.fire2);
    return {
        channels: [0, 1, 2, 3].map((ch) => adc.getChannelSource(ch)?.getValue(ch) ?? null),
        fire1: cpu.sysvia.mouseButton1,
        fire2: cpu.sysvia.mouseButton2,
    };
}

function type(args) {
    return replacing(async () => {
        typist.type(cpu.model.stringToKeys(String(args.text ?? "")), true);
        let ran = 0;
        const limit = args.max_cycles ?? 60 * cpu.model.cyclesPerSecond;
        let last = null;
        while (typist.isTyping && ran < limit) {
            last = await runCore({ cycles: SLICE });
            ran += last.ran;
            if (last.reason !== "cycles") break;
        }
        return { typed: !typist.isTyping, stopped: last && last.reason !== "cycles" ? last : null, pc: cpu.pc };
    });
}

// ---- media ---------------------------------------------------------------------------------

function layoutOf(disc) {
    return disc.is40Track ? DiscLayout.expanded40 : DiscLayout.contiguous;
}

function loadDiscFile(drive, file, layout) {
    const p = path.resolve(file);
    const disc = discFor(p, new Uint8Array(fs.readFileSync(p)), undefined, layout ?? DiscLayout.auto);
    cpu.fdc.loadDisc(drive, disc);
    S.media.drives[drive] = { path: p, layout: layoutOf(disc) };
    return { drive, name: path.basename(p), tracks40: disc.is40Track };
}

async function loadDiscRef(drive, ref, layout) {
    const { name, data, ignored } = await session.mediaResolver().resolve("disc", ref);
    const disc = discFor(name, data, undefined, layout ?? DiscLayout.auto);
    cpu.fdc.loadDisc(drive, disc);
    S.media.drives[drive] = { ref, layout: layoutOf(disc) };
    return { drive, name, ignored, tracks40: disc.is40Track };
}

async function loadTapeFile(file) {
    const p = path.resolve(file);
    const tape = await loadTapeFromData(path.basename(p), new Uint8Array(fs.readFileSync(p)), cpu.model);
    cpu.tapeInterface.setTape(tape);
    S.media.tape = { path: p };
    return { name: path.basename(p) };
}

function disc(args) {
    const drive = args.drive ?? 0;
    if (drive !== 0 && drive !== 1) throw new Error("drive: 0 or 1");
    if (args.path) return loadDiscFile(drive, args.path);
    if (args.ref) return loadDiscRef(drive, args.ref);
    throw new Error('give "path" (an image on this computer) or "ref" (sth:, hfe:, bitshifters: or a URL)');
}

// ---- state ---------------------------------------------------------------------------------

function insideRepository(file) {
    const p = path.resolve(file);
    let dir = path.dirname(p);
    while (!fs.existsSync(dir)) dir = path.dirname(dir);
    const real = path.join(fs.realpathSync(dir), path.relative(dir, p));
    const root = fs.realpathSync(ROOT);
    if (!real.startsWith(root + path.sep))
        throw new Error(`${file}: the kit writes only inside this repository (kit/INSTALL.md, the footprint principle)`);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    return p;
}

function writeFileAtomic(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
}

function sidewaysRam() {
    const banks = {};
    for (let b = 0; b < 16; b++) {
        if (!cpu.model.swram[b]) continue;
        const at = cpu.romOffset + b * 16384;
        banks[b] = cpu.ramRomOs.slice(at, at + 16384);
    }
    return banks;
}

// jsbeeb's own format, gzipped, so jsbeeb's page can load it too. Two additions: the sideways
// RAM banks, which jsbeeb's restore reads and its save leaves out, and where each disc and tape
// came from. The discs are named, not embedded: of a disc, jsbeeb keeps only the tracks the
// game has written since it went in, and lays them back over the disc on a load.
function save(args) {
    const file = insideRepository(args.path);
    const snap = createSnapshot(cpu, cpu.model);
    snap.state.swRamBanks = sidewaysRam();
    snap.kit = {
        saved_by: "kit/bbc/jsbeeb_server.mjs",
        protocol: PROTOCOL,
        jsbeeb: jsbeebVersion,
        media: S.media,
        held_keys: session.heldKeys(),
    };
    writeFileAtomic(file, zlib.gzipSync(Buffer.from(snapshotToJSON(snap))));
    return { path: file, bytes: fs.statSync(file).size, pc: cpu.pc, cycles: elapsed() };
}

async function readSnapshotFile(file) {
    const raw = fs.readFileSync(file);
    const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
    if (isBemSnapshot(buffer)) return { snap: await parseBemSnapshot(buffer), kind: "B-em or beebjit state" };
    if (isUefSnapshot(buffer)) return { snap: parseUefSnapshot(buffer), kind: "BeebEm state" };
    const text = raw[0] === 0x1f && raw[1] === 0x8b ? zlib.gunzipSync(raw).toString("utf8") : raw.toString("utf8");
    return { snap: snapshotFromJSON(text), kind: "jsbeeb snapshot" };
}

// The discs first, so that the tracks the game had written land on the disc they belong to.
async function reloadMedia(snap) {
    const kit = snap.kit && snap.kit.media;
    const done = [];
    if (kit) {
        for (const [drive, m] of (kit.drives ?? []).entries()) {
            if (!m) continue;
            if (m.path) {
                if (!fs.existsSync(m.path)) throw new Error(`the snapshot's drive ${drive} disc, ${m.path}, is not there`);
                done.push(loadDiscFile(drive, m.path, m.layout));
            } else if (m.ref) done.push(await loadDiscRef(drive, m.ref, m.layout));
        }
        if (kit.tape && kit.tape.path) done.push(await loadTapeFile(kit.tape.path));
        return done;
    }
    const media = snap.media; // saved by jsbeeb's own page
    for (const [drive, key] of [
        [0, "disc1"],
        [1, "disc2"],
    ]) {
        if (!media) break;
        const layout = media[key + "Layout"] ?? DiscLayout.contiguous;
        if (media[key]) done.push(await loadDiscRef(drive, media[key], layout));
        else if (media[key + "ImageData"]) {
            const d = discFor(media[key + "Name"] || "snapshot.ssd", media[key + "ImageData"], undefined, layout);
            cpu.fdc.loadDisc(drive, d);
            S.media.drives[drive] = { embedded: media[key + "Name"] || "snapshot.ssd", layout };
            done.push({ drive, name: media[key + "Name"], embedded: true });
        }
    }
    return done;
}

function load(args) {
    return replacing(async () => {
        const file = path.resolve(args.path);
        const { snap, kind } = await readSnapshotFile(file);
        if (snap.model && !sameModel(snap.model))
            throw new Error(`${path.basename(file)} is a ${snap.model} and this machine is a ${cpu.model.name}: ` +
                `start the server with --model "${snap.model}" (tools.py jsbeeb --model ...)`);
        const media = await reloadMedia(snap);
        restoreSnapshot(cpu, cpu.model, snap);
        cpu.breakpointResume = false; // the loaded PC's instruction has not run in the loaded state
        return { kind, media, registers: registers(), held_keys: session.heldKeys() };
    });
}

function sameModel(name) {
    const names = [cpu.model.name, ...(cpu.model.synonyms || [])];
    return names.includes(name);
}

// Rollback in memory: a whole state, discs included, kept under a name.
function keep(args) {
    const name = args.name ?? "default";
    S.kept.set(name, { state: cpu.snapshotState(), swram: sidewaysRam() });
    return { name, kept: [...S.kept.keys()] };
}

function back(args) {
    const name = args.name ?? "default";
    const k = S.kept.get(name);
    if (!k) throw new Error(`nothing kept as ${name}`);
    return replacing(async () => {
        cpu.restoreState(k.state);
        for (const [b, data] of Object.entries(k.swram)) cpu.ramRomOs.set(data, cpu.romOffset + Number(b) * 16384);
        cpu.breakpointResume = false;
        return { name, registers: registers() };
    });
}

// ---- outputs: the screen, the VDU's text, the sound chip, what ran -------------------------

function crc32(buf) {
    let crc = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
        let c = (crc ^ buf[n]) & 0xff;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
    const len = Buffer.alloc(4);
    const crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

// The last whole frame, as a PNG: the picture without the border, or with "full" all 1024 x
// 625 of jsbeeb's frame. Written here rather than through jsbeeb's screenshot(), which needs
// sharp, a native package the install leaves out.
function screenshot(args) {
    const file = insideRepository(args.path);
    const v = session._video;
    const W = 1024;
    const H = 625;
    const [x0, y0, w, h] = args.full
        ? [0, 0, W, H]
        : [v.leftBorder, v.topBorder, W - v.leftBorder - v.rightBorder, H - v.topBorder - v.bottomBorder];
    const fb = session._completeFb8;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = ((y0 + y) * W + x0 + x) * 4;
            const o = y * (w * 3 + 1) + 1 + x * 3;
            raw[o] = fb[i];
            raw[o + 1] = fb[i + 1];
            raw[o + 2] = fb[i + 2];
        }
    }
    const head = Buffer.alloc(13);
    head.writeUInt32BE(w, 0);
    head.writeUInt32BE(h, 4);
    head[8] = 8;
    head[9] = 2;
    const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk("IHDR", head),
        pngChunk("IDAT", zlib.deflateSync(raw)),
        pngChunk("IEND", Buffer.alloc(0)),
    ]);
    writeFileAtomic(file, png);
    return { path: file, width: w, height: h, frames: session.frameCount };
}

// What the machine printed through the MOS since the last call, and where on the screen.
function output() {
    const o = session.drainOutput();
    return { text: o.elements.map((e) => e.text).join(""), screen: o.screenText, codes: vduCodes.splice(0) };
}

// Every write to the SN76489, with the CPU cycle it reached the chip on.
const soundPoke = Object.getPrototypeOf(cpu.soundChip).poke;
cpu.soundChip.poke = function (value) {
    if (S.sound) S.sound.writes.push([elapsed(), value]);
    return soundPoke.call(this, value);
};

function sound(args) {
    if (args.action === "start") {
        S.sound = { start: elapsed(), writes: [] };
        return { start: S.sound.start };
    }
    if (args.action !== "stop") throw new Error('action: "start" or "stop"');
    if (!S.sound) throw new Error("no capture running: `sound` start first");
    const cap = S.sound;
    S.sound = null;
    const out = {
        format: "kit-sn76489-writes",
        clock: cpu.model.cyclesPerSecond,
        start: cap.start,
        end: elapsed(),
        writes: cap.writes,
    };
    if (!args.path) return { ...out, count: cap.writes.length };
    writeFileAtomic(insideRepository(args.path), JSON.stringify(out));
    return { path: path.resolve(args.path), count: cap.writes.length, start: out.start, end: out.end };
}

// Every address an instruction started at, with its length and how often it ran.
function codemap(args) {
    const action = args.action ?? "read";
    if (action === "start") {
        if (!S.codemap) S.codemap = { count: new Uint32Array(0x10000), len: new Uint8Array(0x10000) };
        return { recording: true };
    }
    if (action === "zap") {
        if (S.codemap) {
            S.codemap.count.fill(0);
            S.codemap.len.fill(0);
        }
        return { recording: !!S.codemap };
    }
    if (action === "stop" || action === "read") {
        const m = S.codemap;
        const ran = [];
        if (m) for (let a = 0; a < 0x10000; a++) if (m.count[a]) ran.push([a, m.len[a], m.count[a]]);
        if (action === "stop") S.codemap = null;
        return { recording: !!S.codemap, instructions: ran };
    }
    throw new Error('action: "start", "read", "zap" or "stop"');
}

// ---- the socket ----------------------------------------------------------------------------

function status() {
    return {
        running: S.running,
        typing: typist.isTyping,
        model: cpu.model.name,
        pc: cpu.pc,
        cycles: elapsed(),
        frames: session.frameCount,
        checkpoints: S.checkpoints.size,
        codemap: !!S.codemap,
        sound: !!S.sound,
        media: S.media,
        held_keys: session.heldKeys(),
    };
}

const COMMANDS = {
    hello: () => ({
        server: "kit jsbeeb server",
        protocol: PROTOCOL,
        jsbeeb: jsbeebVersion,
        model: cpu.model.name,
        node: process.version,
        root: ROOT,
        commands: Object.keys(COMMANDS),
    }),
    status,
    reset: (a) => replacing(async () => {
        session.reset(a.hard ?? true);
        return registers();
    }),
    boot: (a) => replacing(async () => {
        session.reset(true);
        const r = await runCore({ until: cpu.model.idleAddress, maxCycles: (a.seconds ?? 30) * cpu.model.cyclesPerSecond });
        return { ...r, output: output() };
    }),
    autoboot: (a) => replacing(async () => {
        session.releaseAllKeys();
        session.keyDownRaw(BBC.SHIFT);
        session.reset(true);
        try {
            return await runCore({ frames: a.frames ?? 100 });
        } finally {
            session.keyUpRaw(BBC.SHIFT);
        }
    }),
    // a disc or a tape changes between two slices of a run, as a person swaps one mid-game
    disc,
    tape: (a) => loadTapeFile(a.path),
    type,
    key,
    keys: () => ({ held: session.heldKeys() }),
    "release-keys": () => {
        session.releaseAllKeys();
        return { held: session.heldKeys() };
    },
    joystick,
    run,
    step,
    stop: () => {
        const was = S.running;
        if (was) S.stopRequested = true;
        return { was_running: was };
    },
    read: readMemory,
    write: writeMemory,
    registers,
    "set-registers": setRegisters,
    disassemble: (a) => {
        let at = address(a.address ?? cpu.pc);
        const out = [];
        for (let i = 0; i < (a.count ?? 1); i++) {
            const d = disassemble(at);
            out.push(d);
            at = (at + d.length) & 0xffff;
        }
        return { instructions: out };
    },
    chips,
    checkpoint: addCheckpoint,
    checkpoints: listCheckpoints,
    delete: deleteCheckpoints,
    zero: zeroCheckpoints,
    // a save is taken between two slices of a run, so a running machine is saved as it runs
    save,
    load,
    keep,
    back,
    screenshot,
    output,
    sound,
    codemap,
    quit: () => {
        setImmediate(() => process.exit(0));
        return { bye: true };
    },
};

cpu.debugInstruction.add(onExec);

async function answer(socket, line) {
    let req;
    try {
        req = JSON.parse(line);
    } catch {
        socket.write(JSON.stringify({ ok: false, error: "not JSON" }) + "\n");
        return;
    }
    const { id, cmd, ...args } = req;
    const fn = COMMANDS[cmd];
    let reply;
    try {
        if (!fn) throw new Error(`no command ${JSON.stringify(cmd)}; the commands: ${Object.keys(COMMANDS).join(", ")}`);
        reply = { ...(await fn(args)), id, ok: true };
    } catch (e) {
        reply = { id, ok: false, error: String(e && e.message ? e.message : e) };
    }
    if (!socket.destroyed) socket.write(JSON.stringify(reply) + "\n");
}

const server = net.createServer((socket) => {
    let buffered = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
        buffered += chunk;
        let nl;
        while ((nl = buffered.indexOf("\n")) >= 0) {
            const line = buffered.slice(0, nl).trim();
            buffered = buffered.slice(nl + 1);
            if (line) answer(socket, line);
        }
    });
    socket.on("error", () => {});
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`kit jsbeeb server: jsbeeb ${jsbeebVersion}, ${cpu.model.name}, on 127.0.0.1:${PORT}`);
});
