// The kit's Apple II: Apple2TS's machine (its 65C02, memory, soft switches, Disk II and
// Mockingboard) running in this Node process and driven over a local socket.
// kit/apple2/apple2ts.py is its client; kit/apple2/tools.py builds, starts and stops it.
//
//   node tools/apple2/apple2ts-server.cjs [--port 6502] [--root <this repository>] [--model iie|iiplus]
//
// The machine is the enhanced IIe unless --model (or KIT_APPLE2TS_MODEL) says the II Plus, for a
// game whose disk needs one; `reset` and `boot` take a "model" too, and a `load` takes the
// snapshot's (MODELS, below).
//
// This file is not run as it is. `tools.py get-apple2ts` bundles it, with
// kit/apple2/apple2ts_clock.mjs and the worker sources of the Apple2TS release
// kit/apple2/INSTALL.md names (cloned into tools/apple2), into one script:
// tools/apple2/apple2ts-server.cjs (kit/apple2/apple2ts_build.mjs). Apple2TS keeps the Apple
// IIe's ROMs in its source, so the bundle holds them: it is built on the contributor's own
// computer and never committed. An import from "A2TS/..." is a file under Apple2TS's src/.
//
// The protocol is the one the kit's BBC server speaks (kit/bbc/jsbeeb_server.mjs): one JSON
// object a line, both ways, on 127.0.0.1 only. A request is {"id": 7, "cmd": "read", ...}; its
// reply carries the same id and "ok": true with the result, or "ok": false with "error". The
// commands are listed in kit/skills/apple2/tool-apple2ts.
//
// The machine runs only inside `run`, `step`, `boot` and `type`, in slices, and between two
// slices it answers every other call: a call made while it runs is served between two
// instructions, and `stop` ends the run there. A command that replaces the machine's state
// (`load`, `back`, `reset`, `boot`) stops a run first.
//
// Checkpoints are the server's, not the machine's, so a load never touches them. An exec
// checkpoint is looked at before its instruction runs, a read or write checkpoint after the
// instruction that made the access. The first instruction of a run or a step is counted but
// never stopped on, so a machine stopped at a checkpoint goes on past it; the instruction a
// checkpoint stopped on is not counted a second time when the next run starts there.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { setIsTesting } from "A2TS/worker/worker2main";
import { s6502, setCycleCount, pcodes } from "A2TS/worker/instructions";
import { processInstruction } from "A2TS/worker/cpu6502";
import {
    memory, memoryReset, doSetRom, memSet, memSetC000, memGetC000, addressGetTable, memGetSlotROM,
    kitAddressSetTable, kitAddressGuard,
} from "A2TS/worker/memory";
import { SWITCHES } from "A2TS/worker/softswitches";
import { configureMachine, doReset, doSetSlotConfig, doSetMachineName, doSetAppMode } from "A2TS/worker/motherboard";
import { doGetSaveState, doRestoreSaveState } from "A2TS/worker/save_restore";
import { doSetEmuDriveNewData, getCurrentDriveState, setCurrentDrive } from "A2TS/worker/devices/drivestate";
import { kitDiskSave, kitDiskRestore } from "A2TS/worker/devices/diskdata";
import { apple2KeyRelease } from "A2TS/worker/devices/keyboard";
import { pressAppleCommandKey, setGamepadValue, kitJoySave, kitJoyRestore } from "A2TS/worker/devices/joystick";
import { onMouseVBL } from "A2TS/worker/devices/mouse";
import { getInstructionString } from "A2TS/common/util_disassemble";
import { RamWorksMemoryStart, ROMmemoryStart } from "A2TS/common/utility";
import { clock, hooks, vclockInit, vFire, vClearAll, vPending } from "./apple2ts_clock.mjs";

const PROTOCOL = 1;
const APPLE2TS = "3.7.0";        // the release kit/apple2/tools.py clones; the bundle is built from it
const CLOCK = 1020484;            // cycles a second (kit/skills/apple2/apple2-reference)
const FRAME = 17030;              // 65 cycles a line, 262 lines
const VBL = 4550;                 // the vertical blank: the first 70 lines of Apple2TS's frame
const SLICE = 50000;              // cycles a slice: about 50 ms of the machine's time between two looks at the socket
const RUN_BACKSTOP = 60 * CLOCK;  // a run with no limit of its own stops after a minute of the machine's time
const AUX = RamWorksMemoryStart;  // where Apple2TS keeps the 80-column card's 64K
const SEED = 0x2545f491;

function option(name, fallback) {
    const i = process.argv.indexOf(name);
    return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const PORT = Number(option("--port", process.env.KIT_APPLE2TS_PORT || 6502));

// The machines the server can be. The enhanced IIe is the one the kit's checks measure
// (kit/apple2/check_emulator.py); the II Plus is Apple2TS's own, for a game whose copy protection
// stops it on a IIe: Apple's II Plus ROM, the II Plus's keyboard and bus noise at $C000-$C01F in
// place of the IIe's memory switches, nothing in slot 3, and the NMOS 6502's flags after a decimal
// add or subtract. Its processor still runs the 65C02's 27 extra opcodes (kit/skills/apple2/
// apple2-reference, "The II Plus in the kit"). A language card is in slot 0 of both.
const SLOTS = { 1: "none", 2: "none", 3: "aux", 4: "mockingboard", 5: "none", 6: "disk2", 7: "none" };
const MODELS = {
    iie: { name: "APPLE2EE", title: "Apple IIe enhanced, 128K", slots: SLOTS },
    iiplus: { name: "APPLE2P", title: "Apple II Plus, 64K (48K and a language card)", slots: { ...SLOTS, 3: "none" } },
};
const modelKey = (k) => {
    if (!Object.hasOwn(MODELS, k)) throw new Error(`model ${JSON.stringify(k)}: ${Object.keys(MODELS).join(" or ")}`);
    return k;
};
const keyOfName = (name) => Object.keys(MODELS).find((k) => MODELS[k].name === name);
let model = modelKey(option("--model", process.env.KIT_APPLE2TS_MODEL || "iie"));
const isIIe = () => model === "iie";

// Puts Apple2TS's machine in a model's configuration: its slots first, so that Apple2TS's own rule
// for slot 3 (a II Plus gets an 80-column Videoterm unless slot 3 is empty) finds them set.
function configureModel(k) {
    model = modelKey(k);
    doSetSlotConfig(MODELS[model].slots);
    doSetMachineName(MODELS[model].name, false, false);
}
// tools/apple2/apple2ts-server.cjs is two folders below the repository
const ROOT = path.resolve(option("--root", path.join(path.dirname(path.resolve(process.argv[1])), "..", "..")));

// What the server changes in Apple2TS, as `hello` reports it (kit/skills/apple2/tool-apple2ts).
const WORKAROUNDS = [
    "the server's own run loop: Apple2TS's is paced by the browser's frame timer. After each instruction it applies Apple2TS's vertical-blank rule ($C019 low for the first 4,550 cycles of each 17,030)",
    "Apple2TS's timers (the disk motor's spin-down) run on the machine's cycle count instead of the host's clock",
    "Math.random, which Apple2TS draws the floating bus and empty slots from, is a seeded generator whose state is in the snapshot",
    "the game patches are off: Apple2TS changes some twenty games when it recognises them (Robotron's lives, Lode Runner's and Snoggle's screens, keys)",
    "slots: 3 the extended 80-column card (64K) on the IIe and nothing on the II Plus, 4 a Mockingboard, 6 a Disk II; no hard disk and no clock card, though Apple2TS's No-Slot Clock answers at $C300-$C3FF, with the computer's date and time, to a program that unlocks it",
    "a key goes into the keyboard latch directly: no auto-repeat and no remapping",
    "read and write checkpoints count through the call Apple2TS's debugger makes on each data access; exec checkpoints, frames, the speaker and the code map are the server's",
    "a snapshot is Apple2TS's own save state (JSON) with the generator's state, the inputs held and the disk controller's private state",
    "a hard reset is a power-on: the generator from its seed, the disk controller as at start-up and each disk put in again from its file, so that every cold boot is the same",
];

// ---- the machine -----------------------------------------------------------------------------

// A seeded generator in place of Math.random (mulberry32). A kit run must give the same machine
// every time; Apple2TS draws the floating bus and empty slots from Math.random.
let rngState = SEED;
Math.random = () => {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

setIsTesting();                   // Apple2TS's messages to its page go nowhere
doSetAppMode("game");             // no checks for Apple2TS's own breakpoints on each instruction
vclockInit(() => s6502.cycleCount);
configureModel(model);

const input = { key: null, buttons: [false, false], paddles: [128, 128, 128, 128] };

// Apple2TS holds a paddle's bit 7 high for a time it works out from a gamepad's -1 to 1; this is
// the value that gives p from the Monitor's PREAD, whose loop takes 11 cycles a count.
function paddleToGamepad(p) {
    const most = Math.trunc(0.00278 * CLOCK);
    return (2 * (11 * p + 4.5)) / most - 1;
}

function applyInputs() {
    pressAppleCommandKey(input.buttons[0], true);
    pressAppleCommandKey(input.buttons[1], false);
    for (let n = 0; n < 4; n++) setGamepadValue(n, paddleToGamepad(input.paddles[n]));
}

// The disk in each drive, by path, so that a power-on can put it in again from its file.
const mounted = { 1: null, 2: null };

// The floppy drives 1 and 2 are Apple2TS's drives 2 and 3 (0 and 1 are a hard disk's).
const indexOf = (drive) => (drive === 1 ? 2 : 3);

// A drive's state in Apple2TS, by its index there, leaving the selected drive as it was.
function driveAt(index) {
    const selected = getCurrentDriveState().index;
    setCurrentDrive(index);
    const ds = getCurrentDriveState();
    setCurrentDrive(selected);
    return ds;
}

// Puts a disk in a drive, or takes it out (file null). Apple2TS starts the drive afresh, as at
// power-on (its head, its motor, the disk's bit position), and selects it.
function mount(drive, file) {
    const data = file ? new Uint8Array(fs.readFileSync(file)) : new Uint8Array(0);
    const props = {
        index: indexOf(drive), hardDrive: false, drive, filename: file ? path.basename(file) : "", status: "",
        motorRunning: false, diskHasChanges: false, isWriteProtected: false, diskData: data, lastAppleWriteTime: 0,
        cloudData: null, writableFileHandle: null, lastLocalFileWriteTime: 0,
    };
    if (!doSetEmuDriveNewData(props, true))
        throw new Error(`Apple2TS could not read ${file}: it takes a .woz, or a 16-sector .dsk, .do or .po of 143,360 bytes`);
    mounted[drive] = file;
}

// A disk changed as a person changes one: the drive keeps its head where it was (as far as the new
// disk has tracks: Apple2TS stops the head at a disk's last track) and its motor as it was, and the
// controller keeps the drive it had selected.
function swap(drive, file) {
    const index = indexOf(drive);
    const old = driveAt(index);
    const keep = { quarterTrack: old.quarterTrack, prevQuarterTrack: old.prevQuarterTrack, currentPhase: old.currentPhase, motorRunning: old.motorRunning };
    const selected = getCurrentDriveState().index;
    mount(drive, file);
    setCurrentDrive(selected);
    const ds = driveAt(index);
    Object.assign(ds, keep);
    ds.quarterTrack = Math.min(ds.quarterTrack, ds.maxQuarterTrack);
    ds.prevQuarterTrack = Math.min(ds.prevQuarterTrack, ds.maxQuarterTrack);
}

// A hard reset is a power-on: the generator from its seed, the disk controller's private state as
// at start-up, and each drive's disk put in again (Apple2TS's insert starts a drive afresh: its
// head, its bit position, its motor). Drive 1 last, so that it is the drive selected. Given a model,
// the machine becomes that one first.
let powerOn = null;
const missing = [];
function coldStart(newModel) {
    vClearAll();
    if (newModel != null && modelKey(newModel) !== model) configureModel(newModel);
    setCycleCount(0);
    rngState = SEED;
    memoryReset();
    doSetRom(MODELS[model].name);
    configureMachine();
    missing.length = 0;
    if (powerOn) {
        kitDiskRestore(powerOn.disk);
        kitJoyRestore(powerOn.joy);
        for (const d of [2, 1]) {
            const f = mounted[d];
            if (f && !fs.existsSync(f)) {
                missing.push(f);
                mounted[d] = null;
            }
            mount(d, mounted[d]);
        }
    }
    doReset();
    input.key = null;
    apple2KeyRelease();
    applyInputs();
}
coldStart();
powerOn = { disk: kitDiskSave(), joy: kitJoySave() };

const cycles = () => s6502.cycleCount;
const frames = () => Math.floor(s6502.cycleCount / FRAME);

// ---- memory, by space ------------------------------------------------------------------------

const SPACES = ["cpu", "main", "aux", "mainlc1", "mainlc2", "auxlc1", "auxlc2", "rom"];
const IIE_SPACES = ["aux", "auxlc1", "auxlc2"];   // the 80-column card's 64K, which a II Plus has none of

// Where Apple2TS keeps an address of a space, or -1 where the space has none, -2 for the I/O page.
// Apple2TS keeps the language card's bank 1 of $D000-$DFFF at $C000-$CFFF of each 64K.
function physical(space, a) {
    if (!isIIe() && IIE_SPACES.includes(space)) return -1;
    switch (space) {
        case "main": return a < 0xc000 ? a : -1;
        case "aux": return a < 0xc000 ? AUX + a : -1;
        case "mainlc1": case "mainlc2": case "auxlc1": case "auxlc2": {
            if (a < 0xd000) return -1;
            const base = space.startsWith("aux") ? AUX : 0;
            return a < 0xe000 && space.endsWith("1") ? base + a - 0x1000 : base + a;
        }
        case "rom": return a >= (isIIe() ? 0xc100 : 0xd000) ? ROMmemoryStart + a - 0xc000 : -1;   // the II Plus has no internal ROM at $C100-$CFFF
        case "cpu": return a >>> 8 === 0xc0 ? -2 : addressGetTable[a >>> 8] + (a & 0xff);
    }
    throw new Error(`space ${space}: one of ${SPACES.join(", ")}`);
}

// Where a write by the CPU to a lands now, from Apple2TS's own table of the switches; -1 where it
// goes nowhere (ROM, or the language card with writing off), -2 for the I/O page.
function writeTarget(a) {
    const page = a >>> 8;
    if (page === 0xc0) return -2;
    const t = kitAddressSetTable[page];
    return t >= kitAddressGuard ? -1 : t + (a & 0xff);
}

// The 64K an offset into Apple2TS's memory belongs to.
const bankOf = (p) => (p >= AUX ? "aux" : p >= 0 && p < 0x10000 ? "main" : "rom");

function address(a) {
    const n = typeof a === "string" ? parseInt(a.replace(/^[$&]|^0x/i, ""), 16) : a;
    if (!Number.isInteger(n) || n < 0 || n > 0xffff) throw new Error(`address ${a}: 0 to $FFFF`);
    return n;
}

// Memory without touching a device: a read of a soft switch through the bus changes the machine
// ($C030 clicks the speaker, $C010 clears the keyboard's strobe, $C08x switches the language
// card), so the I/O page, $C000-$C0FF, reads as zero here; `chips` has the switches.
function readMemory(args) {
    const space = args.space ?? "cpu";
    const start = address(args.address);
    const length = args.length ?? 256;
    if (!(Number.isInteger(length) && length >= 0 && length <= 0x10000)) throw new Error("length: 0 to 65536");
    const out = Buffer.alloc(length);
    let io = false;
    for (let i = 0; i < length; i++) {
        const a = (start + i) & 0xffff;
        const p = physical(space, a);
        if (p === -1) throw new Error(`the ${space} space has no $${hex(a)}: see kit/skills/apple2/tool-apple2ts, "Spaces"`);
        if (p === -2) io = true;
        else out[i] = memory[p];
    }
    return { address: start, space, data: out.toString("base64"), io };
}

function writeMemory(args) {
    const space = args.space ?? "cpu";
    const start = address(args.address);
    const bytes = args.data != null ? Buffer.from(args.data, "base64") : Uint8Array.from(args.bytes ?? []);
    for (let i = 0; i < bytes.length; i++) {
        const a = (start + i) & 0xffff;
        const p = space === "cpu" ? writeTarget(a) : physical(space, a);
        if (p === -2 && args.io) memSet(a, bytes[i]);
        else if (p === -2) throw new Error(`$${hex(a)} is a soft switch: pass "io": true to write to it`);
        else if (p < 0 || space === "rom") throw new Error(`$${hex(a)} is not writable in the ${space} space as the machine is switched`);
        else memory[p] = bytes[i];
    }
    return { written: bytes.length };
}

const hex = (n, w = 4) => n.toString(16).toUpperCase().padStart(w, "0");

function registers() {
    const p = s6502.PStatus;
    const flags = "NV-BDIZC".split("").map((f, i) => (p & (0x80 >> i) ? f : f.toLowerCase())).join("");
    return { pc: s6502.PC, a: s6502.Accum, x: s6502.XReg, y: s6502.YReg, s: s6502.StackPtr, p, flags, cycles: cycles() };
}

function setRegisters(args) {
    const map = { a: "Accum", x: "XReg", y: "YReg", s: "StackPtr", p: "PStatus" };
    for (const [k, f] of Object.entries(map)) if (args[k] != null) s6502[f] = args[k] & 0xff;
    if (args.pc != null) {
        s6502.PC = address(args.pc);
        S.countedAt = -1; // the instruction at the new PC has not been seen yet
    }
    return registers();
}

// One instruction as the machine would fetch it now, in Apple2TS's own words. The I/O page has no
// instructions to show: reading it would work its switches.
function disassemble(pc) {
    const at = (i) => { const p = physical("cpu", (pc + i) & 0xffff); return p >= 0 ? memory[p] : -1; };
    const op = at(0);
    if (op < 0) return { address: pc, text: "(the I/O page)", length: 1, bytes: [] };
    const code = pcodes[op];
    // Apple2TS's line is "ADDR: XX YY ZZ  NAME operand", its bytes always eight characters wide
    const text = getInstructionString(pc, code, at(1), at(2), -1).slice(16).trim();
    const bytes = Array.from({ length: code.bytes }, (_, i) => at(i));
    return { address: pc, text, length: code.bytes, bytes };
}

// The soft switches by name, the keyboard, the game port, the disk drive and the Mockingboard, read
// from Apple2TS's own state: nothing goes through the bus.
function chips() {
    const sw = (k) => SWITCHES[k].isSet;
    const ds = getCurrentDriveState();
    const via = (chip) => {
        const r = (o) => memGetSlotROM(4, o + (chip ? 0x80 : 0));
        return {
            orb: r(0), ora: r(1), ddrb: r(2), ddra: r(3), t1c: r(4) | (r(5) << 8), t1l: r(6) | (r(7) << 8),
            t2c: r(8) | (r(9) << 8), sr: r(0xa), acr: r(0xb), pcr: r(0xc), ifr: r(0xd), ier: r(0xe) | 0x80,
            ay: Array.from({ length: 16 }, (_, k) => r(0x20 + k)),
        };
    };
    // The II Plus has neither the IIe's memory switches nor its status reads: its $C000-$C01F are the
    // keyboard and bus noise, so it has no vertical-blank flag and no any-key-down bit.
    const iie = isIIe();
    const switches = iie
        ? {
            "80store": sw("STORE80"), ramrd: sw("AUXRAMREAD"), ramwrt: sw("AUXRAMWRITE"), intcxrom: sw("INTCXROM"),
            altzp: sw("ALTZP"), slotc3rom: sw("SLOTC3ROM"), "80col": sw("COLUMN80"), altchar: sw("ALTCHARSET"),
        }
        : {};
    Object.assign(switches, {
        text: sw("TEXT"), mixed: sw("MIXED"), page2: sw("PAGE2"), hires: sw("HIRES"), ...(iie ? { dhires: sw("DHIRES") } : {}),
        lcram: sw("BSRREADRAM"), lcwrite: sw("BSR_WRITE"), lcbank2: sw("BSRBANK2"),
    });
    const keyboard = { latch: memGetC000(0xc000) & 0x7f, strobe: (memGetC000(0xc000) & 0x80) !== 0 };
    if (iie) keyboard.akd = (memGetC000(0xc010) & 0x80) !== 0;
    return {
        model: MODELS[model].title,
        frames: frames(),
        vbl: iie ? !sw("VBLINV") : null,
        switches,
        keyboard,
        buttons: [sw("PB0"), sw("PB1"), sw("PB2")],
        paddles: [...input.paddles],
        disk: ds && !ds.hardDrive && ds.filename
            ? { drive: ds.drive, motor: ds.motorRunning, quarter_track: ds.quarterTrack, track: ds.quarterTrack / 4, image: ds.filename }
            : null,
        mockingboard: { slot: 4, via: [via(0), via(1)] },
    };
}

// ---- the text screen -------------------------------------------------------------------------

// The text page's 24 rows, as text. A row's 40 bytes start at $400 + 128 * (row mod 8) + 40 * (row / 8),
// on page 2 at $800. With 80 columns the even columns are the auxiliary 64K's, the odd ones main's.
// The characters as the IIe's video ROM draws them: $00-$3F inverse, $40-$7F flashing (or, with the
// alternate set on, MouseText and inverse lower case), $80-$FF normal; the text gives each its letter.
function screenText() {
    const iie = isIIe();
    const page2 = SWITCHES.PAGE2.isSet && !(iie && SWITCHES.STORE80.isSet);
    const base = page2 ? 0x800 : 0x400;
    const col80 = iie && SWITCHES.COLUMN80.isSet;
    const mixed = !SWITCHES.TEXT.isSet;
    const lines = [];
    for (let row = 0; row < 24; row++) {
        const at = base + 128 * (row % 8) + 40 * Math.floor(row / 8);
        let s = "";
        for (let c = 0; c < 40; c++) {
            if (col80) s += letter(memory[AUX + at + c]);
            s += iie ? letter(memory[at + c]) : letterIIPlus(memory[at + c]);
        }
        lines.push(s.replace(/\s+$/, ""));
    }
    return {
        lines,
        page: page2 ? 2 : 1,
        columns: col80 ? 80 : 40,
        graphics: mixed ? (SWITCHES.MIXED.isSet ? "mixed: the last four rows are text" : "full screen: the text page is not shown") : null,
    };
}

function letter(b) {
    let c = b & 0x7f;
    if (b < 0x80 && !SWITCHES.ALTCHARSET.isSet) c = b & 0x3f;     // inverse and flashing: upper case and symbols
    if (c < 0x20) c += 0x40;
    if (b >= 0x40 && b < 0x60 && SWITCHES.ALTCHARSET.isSet) return " "; // MouseText
    return String.fromCharCode(c === 0x7f ? 0x20 : c);
}

// The II Plus's video ROM has no lower case and no alternate set: $60-$7F flash the same signs as
// $20-$3F, and $E0-$FF show them as $A0-$BF do.
function letterIIPlus(b) {
    let c = b & 0x3f;
    if (c < 0x20) c += 0x40;
    return String.fromCharCode(c);
}

// ---- the run: slices, the reason it stopped --------------------------------------------------

const S = {
    running: false,
    stopRequested: false,
    hit: null,            // the checkpoint that stopped the run, as the reply gives it
    countedAt: -1,        // the PC a checkpoint, `until` or a step stopped on, which was counted then
    checkpoints: new Map(),
    nextId: 1,
    exec: new Map(),      // address: the exec checkpoints there
    watches: [],          // the read and write checkpoints
    rearmNeeded: false,
    codemap: null,
    sound: null,
    kept: new Map(),
    typing: false,
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

function matches(when, value) {
    if (!when) return true;
    const regs = { a: s6502.Accum, x: s6502.XReg, y: s6502.YReg, s: s6502.StackPtr, p: s6502.PStatus, pc: s6502.PC, value };
    for (const [k, v] of Object.entries(when)) if (regs[k] !== v) return false;
    return true;
}

// The exec checkpoints on pc, before its instruction runs. True when one of them stops the run.
function arrive(pc, mayStop) {
    const at = S.exec.get(pc);
    if (!at) return false;
    let stop = false;
    for (const cp of at) {
        if (cp.bank && bankOf(physical("cpu", pc)) !== cp.bank) continue;
        if (!matches(cp.when)) continue;
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
    return stop;
}

// Every data read and write the CPU makes, while a read or write checkpoint is armed. Apple2TS
// calls it after the access, with the value read or written; the instruction is the one running.
let accessPc = 0;
let watchStop = false;
function access(addr, value, isWrite) {
    const kind = isWrite ? "write" : "read";
    for (const cp of S.watches) {
        if (cp.kind !== kind || addr < cp.start || addr > cp.end) continue;
        if (cp.bank) {
            const p = isWrite ? writeTarget(addr) : physical("cpu", addr);
            if (p === -2 || bankOf(p) !== cp.bank) continue;
        }
        if (!matches(cp.when, value)) continue;
        cp.hits++;
        cp.last = { pc: accessPc, address: addr, value };
        if (!cp.stop) continue;
        if (cp.skip > 0) {
            cp.skip--;
            continue;
        }
        if (!S.hit) S.hit = { checkpoint: cp.id, kind, address: addr, pc: accessPc, value };
        watchStop = true;
    }
}

// One instruction, and what Apple2TS's own loop does after one: the vertical blank and the timers.
function execOne() {
    const pc = s6502.PC;
    accessPc = pc;
    if (S.codemap) {
        const m = S.codemap;
        if (m.count[pc]++ === 0) m.len[pc] = pcodes[memory[physical("cpu", pc)]]?.bytes ?? 1;
    }
    processInstruction();
    const cif = s6502.cycleCount % FRAME;
    if (cif < VBL) {
        if (SWITCHES.VBLINV.isSet) {
            SWITCHES.VBLINV.isSet = false;
            onMouseVBL();
        }
    } else SWITCHES.VBLINV.isSet = true;
    if (s6502.cycleCount >= clock.nextDue) vFire();
}

// The machine runs until a limit, a stopping checkpoint, `until`, `stop`, or `done()` says so
// (typing uses that to wait for the program to read a key). `steps` stops after that many instructions.
async function runCore({ cycles: limit, frames: nframes, until, maxCycles, steps, done }) {
    S.running = true;
    S.stopRequested = false;
    S.hit = null;
    watchStop = false;
    hooks.access = S.watches.length ? access : null;
    const c0 = cycles();
    const f0 = frames();
    let end = Infinity;
    if (limit != null) end = c0 + limit;
    else if (nframes != null) end = (f0 + nframes) * FRAME;
    const backstop = c0 + (maxCycles ?? (limit != null || nframes != null ? Infinity : RUN_BACKSTOP));
    let reason = null;
    let first = true;
    let left = steps ?? -1;
    try {
        while (!reason) {
            const sliceEnd = cycles() + SLICE;
            while (cycles() < sliceEnd) {
                if (done && done()) { reason = "done"; break; }
                const pc = s6502.PC;
                // the look before each instruction: the first of a run is counted unless it was
                // counted when the last run stopped on it, and is never stopped on
                if (!(first && pc === S.countedAt)) {
                    const stop = arrive(pc, !first);
                    if (stop) { reason = "checkpoint"; break; }
                    if (!first && pc === until) { reason = "until"; break; }
                    if (left === 0) { reason = "step"; break; }
                }
                first = false;
                execOne();
                if (left > 0) left--;
                if (watchStop) { reason = "checkpoint"; break; }
                const c = cycles();
                if (c >= end) { reason = limit != null ? "cycles" : "frames"; break; }
                if (c >= backstop) { reason = "timeout"; break; }
            }
            if (reason) break;
            await yieldToSocket();
            if (S.stopRequested) reason = "stopped";
        }
    } finally {
        S.running = false;
        S.stopRequested = false;
        hooks.access = null;
        if (S.rearmNeeded) {
            S.rearmNeeded = false;
            rearm();
        }
    }
    // the PC a checkpoint, `until` or a step stopped on was counted already
    S.countedAt = ["until", "step"].includes(reason) || (reason === "checkpoint" && S.hit?.kind === "exec") ? s6502.PC : -1;
    if (S.hit) dropTemporary(S.hit.checkpoint);
    return {
        reason,
        pc: s6502.PC,
        ran: cycles() - c0,
        frames: frames() - f0,
        cycles: cycles(),
        hit: S.hit,
        registers: registers(),
    };
}

function run(args) {
    if (S.running) throw new Error("the machine is already running: `stop` it first");
    return exclusive(() =>
        runCore({
            cycles: args.cycles ?? (args.seconds != null ? Math.round(args.seconds * CLOCK) : undefined),
            frames: args.frames,
            until: args.until != null ? address(args.until) : -1,
            maxCycles: args.max_cycles,
        }),
    );
}

function step(args) {
    if (S.running) throw new Error("the machine is running: `stop` it first");
    const n = Math.max(1, args.count ?? 1);
    return exclusive(async () => {
        const r = await runCore({ steps: n, maxCycles: args.max_cycles ?? 2 * CLOCK });
        r.next = disassemble(s6502.PC);
        return r;
    });
}

// ---- checkpoints -----------------------------------------------------------------------------

function rearm() {
    const all = [...S.checkpoints.values()];
    S.exec = new Map();
    for (const cp of all) {
        if (cp.kind !== "exec") continue;
        for (let a = cp.start; a <= cp.end; a++) {
            if (!S.exec.has(a)) S.exec.set(a, []);
            S.exec.get(a).push(cp);
        }
    }
    S.watches = all.filter((c) => c.kind !== "exec");
    if (S.running) hooks.access = S.watches.length ? access : null;
}

// A temporary checkpoint goes once it has stopped the machine.
function dropTemporary(id) {
    const cp = S.checkpoints.get(id);
    if (cp && cp.temporary) {
        S.checkpoints.delete(id);
        rearm();
    }
}

function addCheckpoint(args) {
    const kind = args.kind ?? "exec";
    if (!["exec", "read", "write"].includes(kind)) throw new Error(`kind ${kind}: exec, read or write`);
    if (args.bank != null && !["main", "aux", "rom"].includes(args.bank)) throw new Error(`bank ${args.bank}: main, aux or rom`);
    const start = address(args.address);
    const end = args.end != null ? address(args.end) : start;
    if (end < start) throw new Error("end is before address");
    const cp = {
        id: S.nextId++, kind, start, end, stop: args.stop ?? true, skip: args.ignore ?? 0,
        temporary: !!args.temporary, when: args.when ?? null, bank: args.bank ?? null, hits: 0, last: null,
    };
    S.checkpoints.set(cp.id, cp);
    rearm();
    return { checkpoint: cp.id };
}

function listCheckpoints() {
    return {
        checkpoints: [...S.checkpoints.values()].map((c) => ({
            checkpoint: c.id, kind: c.kind, address: c.start, end: c.end, stop: c.stop, ignore: c.skip,
            temporary: c.temporary, when: c.when, bank: c.bank, hits: c.hits, last: c.last,
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

// ---- input -----------------------------------------------------------------------------------

// The keys by name. Any other key is its character, or its ASCII code as a number.
const KEYS = {
    RETURN: 0x0d, ENTER: 0x0d, ESC: 0x1b, ESCAPE: 0x1b, TAB: 0x09, DELETE: 0x7f, SPACE: 0x20,
    LEFT: 0x08, RIGHT: 0x15, UP: 0x0b, DOWN: 0x0a,
};
// The two Apple keys are the game port's buttons 0 and 1, wired to the same lines.
const BUTTON_KEYS = { "OPEN-APPLE": 0, "SOLID-APPLE": 1, "CLOSED-APPLE": 1, OPTION: 1 };

function keyCode(k) {
    if (typeof k === "number" && Number.isInteger(k) && k >= 0 && k < 0x80) return k;
    const s = String(k);
    if (s.length === 1 && s.charCodeAt(0) < 0x80) return s.charCodeAt(0);
    const name = s.toUpperCase();
    if (name in KEYS) return KEYS[name];
    const ctrl = /^CTRL-([A-Z@\[\\\]^_])$/.exec(name);
    if (ctrl) return ctrl[1].charCodeAt(0) & 0x1f;
    throw new Error(`no key ${JSON.stringify(k)}: a character, an ASCII code, CTRL-X, or one of ${[...Object.keys(KEYS), ...Object.keys(BUTTON_KEYS)].join(", ")}`);
}

// A key goes down as the IIe's keyboard puts it: the code in the latch with the strobe set ($C000
// bit 7), and any-key-down set ($C010 bit 7) until it is let go. The strobe stays until the program
// clears it.
function press(code) {
    input.key = code;
    memSetC000(0xc000, code | 0x80, 16);
    memSetC000(0xc010, code | 0x80, 16);
}

function letGo() {
    input.key = null;
    apple2KeyRelease();
}

function held() {
    return { key: input.key, buttons: [...input.buttons], paddles: [...input.paddles] };
}

function key(args) {
    if (S.typing) throw new Error("text from `type` is still being typed: wait for it, or `release-keys`");
    const name = String(args.key).toUpperCase();
    if (name in BUTTON_KEYS) {
        input.buttons[BUTTON_KEYS[name]] = args.down !== false;
        applyInputs();
    } else if (args.down === false) letGo();
    else press(keyCode(args.key));
    return { held: held() };
}

// The game port: four paddles (0 to 255; null puts one back to 128) and buttons 0 and 1. Held until
// changed, and kept in a snapshot.
function joystick(args) {
    const paddles = args.paddles ?? [];
    if (!Array.isArray(paddles) || paddles.length > 4) throw new Error("paddles: a list of up to four values");
    paddles.forEach((v, n) => {
        if (v === undefined) return;
        if (v === null) input.paddles[n] = 128;
        else if (Number.isInteger(v) && v >= 0 && v <= 255) input.paddles[n] = v;
        else throw new Error(`paddle ${n}: 0 to 255, or null`);
    });
    const buttons = args.buttons ?? [];
    if (!Array.isArray(buttons) || buttons.length > 2) throw new Error("buttons: a list of up to two values; Apple2TS has no button 2");
    buttons.forEach((v, n) => { if (v != null) input.buttons[n] = !!v; });
    applyInputs();
    return { held: held() };
}

// Text typed as a person types it: each key goes down when the program has read the one before
// (the strobe is clear), and is let go once the program has read it. "\n" is RETURN.
function type(args) {
    const text = String(args.text ?? "").replace(/\r\n?/g, "\n");
    const codes = [...text].map((ch) => (ch === "\n" ? 0x0d : keyCode(ch)));
    const wait = args.max_cycles ?? 10 * CLOCK;
    return replacing(async () => {
        S.typing = true;
        let typed = 0;
        let last = null;
        const free = () => (memGetC000(0xc000) & 0x80) === 0;
        try {
            for (const code of codes) {
                if (!free()) {
                    last = await runCore({ cycles: wait, done: free });
                    if (last.reason !== "done") break;
                }
                press(code);
                last = await runCore({ cycles: wait, done: free });
                letGo();
                if (last.reason !== "done") break;
                typed++;
            }
        } finally {
            S.typing = false;
        }
        const ok = typed === codes.length;
        return {
            typed, of: codes.length, pc: s6502.PC, cycles: cycles(),
            stopped: ok ? null : last && last.reason === "cycles" ? { reason: "not read", waited: wait } : last,
        };
    });
}

// ---- media -----------------------------------------------------------------------------------

function disk(args) {
    const drive = args.drive ?? 1;
    if (drive !== 1 && drive !== 2) throw new Error("drive: 1 or 2");
    if (args.eject) {
        swap(drive, null);
        return { drive, ejected: true };
    }
    if (!args.path) throw new Error('give "path", a disk image on this computer, or "eject": true');
    const file = path.resolve(args.path);
    swap(drive, file);
    return { drive, name: path.basename(file) };
}

// ---- state -----------------------------------------------------------------------------------

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

// The whole machine: Apple2TS's own save state (memory, the switches, the CPU, the cards, each disk
// with what the game has written to it), and what Apple2TS leaves out of it.
function state() {
    return {
        state: doGetSaveState(true),
        rng: rngState,
        held: held(),
        disk: kitDiskSave(),
        joy: kitJoySave(),
        motor: getCurrentDriveState()?.motorRunning ?? false,
        mounted: { ...mounted },
    };
}

let quiet = false; // a restore passes the Mockingboard's registers on, which is not the game writing them
function restore(k) {
    // the machine the state was saved on: Apple2TS's restore sets the model, and its slots come first
    const saved = keyOfName(k.state?.state6502?.machineName ?? "APPLE2EE");
    if (!saved) throw new Error(`the snapshot is of an Apple2TS machine the kit has no model for (${k.state?.state6502?.machineName})`);
    vClearAll();
    if (saved !== model) configureModel(saved);
    quiet = true;
    try {
        doRestoreSaveState(k.state, false, false, 2);
    } finally {
        quiet = false;
    }
    kitDiskRestore(k.disk);
    kitJoyRestore(k.joy);
    const ds = getCurrentDriveState();
    if (ds) ds.motorRunning = k.motor;
    rngState = k.rng >>> 0;
    Object.assign(mounted, k.mounted);
    Object.assign(input, k.held);
    applyInputs();
    S.countedAt = -1;
}

// The kit's snapshot: JSON, so that kit/apple2/snapshot.py reads it with no help.
function save(args) {
    const file = insideRepository(args.path);
    const snap = {
        format: "apple2ts-kit-snapshot",
        version: 1,
        saved_by: "kit/apple2/apple2ts_server.mjs",
        protocol: PROTOCOL,
        apple2ts: APPLE2TS,
        model: MODELS[model].name,
        pc: s6502.PC,
        cycles: cycles(),
        timers: vPending(),
        ...state(),
    };
    writeFileAtomic(file, JSON.stringify(snap));
    return { path: file, bytes: fs.statSync(file).size, pc: s6502.PC, cycles: cycles() };
}

function load(args) {
    return replacing(async () => {
        const file = path.resolve(args.path);
        const snap = JSON.parse(fs.readFileSync(file, "utf8"));
        if (snap.format !== "apple2ts-kit-snapshot")
            throw new Error(`${path.basename(file)} is not a snapshot of the kit's Apple II server (it has no "format": "apple2ts-kit-snapshot")`);
        restore(snap);
        return { registers: registers(), held: held(), drives: { ...mounted } };
    });
}

// Rollback in memory: a whole state, disks included, kept under a name.
function keep(args) {
    const name = args.name ?? "default";
    S.kept.set(name, state());
    return { name, kept: [...S.kept.keys()] };
}

function back(args) {
    const name = args.name ?? "default";
    const k = S.kept.get(name);
    if (!k) throw new Error(`nothing kept as ${name}`);
    return replacing(async () => {
        restore(k);
        return { name, registers: registers() };
    });
}

// ---- outputs: the sound, what ran -------------------------------------------------------------

hooks.speaker = (cycle) => {
    if (S.sound) S.sound.speaker.push(cycle);
};
// Apple2TS passes on a sound chip's sixteen registers each time a write changes one of them.
const lastAy = new Map();
hooks.mockingboard = (sound) => {
    const key = `${sound.slot}:${sound.chip}`;
    const before = lastAy.get(key) ?? [];
    lastAy.set(key, [...sound.params]);
    if (!S.sound || quiet) return;
    sound.params.forEach((v, r) => {
        if (before[r] !== v) S.sound.mockingboard.push([cycles(), sound.chip, r, v]);
    });
};

function sound(args) {
    if (args.action === "start") {
        S.sound = { start: cycles(), speaker: [], mockingboard: [] };
        return { start: S.sound.start };
    }
    if (args.action !== "stop") throw new Error('action: "start" or "stop"');
    if (!S.sound) throw new Error("no capture running: `sound` start first");
    const cap = S.sound;
    S.sound = null;
    const out = {
        format: "kit-apple2-sound",
        clock: CLOCK,
        start: cap.start,
        end: cycles(),
        speaker: cap.speaker,
        mockingboard: cap.mockingboard,
    };
    if (!args.path) return { ...out, clicks: cap.speaker.length, writes: cap.mockingboard.length };
    writeFileAtomic(insideRepository(args.path), JSON.stringify(out));
    return { path: path.resolve(args.path), clicks: cap.speaker.length, writes: cap.mockingboard.length, start: out.start, end: out.end };
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

// ---- the socket ------------------------------------------------------------------------------

function status() {
    return {
        running: S.running,
        typing: S.typing,
        model: MODELS[model].title,
        pc: s6502.PC,
        cycles: cycles(),
        frames: frames(),
        checkpoints: S.checkpoints.size,
        codemap: !!S.codemap,
        sound: !!S.sound,
        drives: { ...mounted },
        held: held(),
    };
}

const COMMANDS = {
    hello: () => ({
        server: "kit Apple2TS server",
        protocol: PROTOCOL,
        apple2ts: APPLE2TS,
        model: MODELS[model].title,
        models: Object.fromEntries(Object.entries(MODELS).map(([k, m]) => [k, m.title])),
        node: process.version,
        root: ROOT,
        clock: CLOCK,
        frame: FRAME,
        spaces: SPACES.filter((sp) => isIIe() || !IIE_SPACES.includes(sp)),
        commands: Object.keys(COMMANDS),
        workarounds: WORKAROUNDS,
    }),
    status,
    // hard: a power-on (the default), as `model` ("iie" or "iiplus") when given; otherwise CONTROL-RESET
    reset: (a) => replacing(async () => {
        if (a.hard ?? true) coldStart(a.model);
        else {
            if (a.model != null && modelKey(a.model) !== model) throw new Error("a model changes only at a power-on: pass \"hard\": true");
            doReset();
            applyInputs();
        }
        S.countedAt = -1;
        return { ...registers(), missing: [...missing] };
    }),
    // a power-on with the disks in, as `model` when given, and a run: the disk in drive 1 boots
    // `until` an address (for at most `seconds`, 30 unless given), or for `seconds`, or `frames` (300)
    boot: (a) => replacing(async () => {
        coldStart(a.model);
        S.countedAt = -1;
        const until = a.until != null ? address(a.until) : -1;
        const limit = until >= 0
            ? { until, maxCycles: a.max_cycles ?? Math.round((a.seconds ?? 30) * CLOCK) }
            : a.seconds != null ? { cycles: Math.round(a.seconds * CLOCK) } : { frames: a.frames ?? 300 };
        const r = await runCore(limit);
        return { ...r, missing: [...missing], text: screenText() };
    }),
    // a disk changes between two slices of a run, as a person swaps one mid-game
    disk,
    type,
    key,
    keys: () => ({ held: held() }),
    "release-keys": () => {
        letGo();
        input.buttons = [false, false];
        applyInputs();
        return { held: held() };
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
        let at = address(a.address ?? s6502.PC);
        const out = [];
        for (let i = 0; i < (a.count ?? 1); i++) {
            const d = disassemble(at);
            out.push(d);
            at = (at + d.length) & 0xffff;
        }
        return { instructions: out };
    },
    chips,
    text: screenText,
    checkpoint: addCheckpoint,
    checkpoints: listCheckpoints,
    delete: deleteCheckpoints,
    zero: zeroCheckpoints,
    // a save is taken between two slices of a run, so a running machine is saved as it runs
    save,
    load,
    keep,
    back,
    sound,
    codemap,
    quit: () => {
        setImmediate(() => process.exit(0));
        return { bye: true };
    },
};

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
    socket.setNoDelay(true);
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
    console.log(`kit Apple2TS server: Apple2TS ${APPLE2TS}, ${MODELS[model].title}, on 127.0.0.1:${PORT}`);
});
