// The kit's NES: jsnes, the emulator, running in this Node process and driven over a local
// socket. kit/nes/jsnes.py is its client; kit/nes/tools.py starts and stops it.
//
//   node kit/nes/jsnes_server.mjs [--port 6855] [--jsnes <package dir>]
//
// jsnes is installed under tools/nes/node_modules (kit/nes/INSTALL.md) and imported from there
// at run time, so none of its code is in this repository. The server starts with no cartridge:
// `cartridge` puts one in, from a file the contributor owns or from bytes the caller sends.
//
// The protocol is the BBC Micro's (kit/bbc/jsbeeb_server.mjs): one JSON object a line, both
// ways, on 127.0.0.1 only. A request is {"id": 7, "cmd": "read", ...arguments}; its reply carries
// the same id and "ok": true with the result, or "ok": false with "error". The commands are
// listed in kit/skills/nes/tool-jsnes.
//
// jsnes's own frame() runs a whole frame in one call. The server runs the same loop itself, one
// instruction at a time (machineStep below), so that a checkpoint stops before the instruction
// it is on and a frame advance stops on the frame's last instruction. jsnes takes an IRQ and
// carries out the handler's first instruction in the same call, so the server takes a pending
// IRQ itself first; an NMI jsnes takes at the end of an instruction, which needs nothing.
//
// The machine runs only inside `run` and `step`, in slices, and between two slices it answers
// every other call: `stop` ends the run there, always between two instructions. A command that
// replaces the machine's state (`load`, `back`, `reset`, `cartridge`) stops a run first.
//
// Checkpoints are the server's, not the machine's, so a load never touches them. A load
// replaces jsnes's CPU, PPU and APU objects, so the server's hooks on them are put back after
// every load (hook()). The first instruction of a run or a step is counted but never stopped
// on, so a machine stopped at a checkpoint goes on past it; an instruction a checkpoint stopped
// before was counted then, and is not counted again when the run goes on.
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(path.dirname(HERE));
const PROTOCOL = 1;
const FRAME_CYCLES = 29781;          // one NTSC frame, 29,780.5 CPU cycles (kit/skills/nes/nes-reference, "Timing")
const CPU_HZ = 1789773;
const SLICE = 30000;                 // cycles a slice, about a frame: 17 ms of the machine's time between two looks at the socket
const FRAME_BACKSTOP = 4 * FRAME_CYCLES;   // cycles a frame may take before a frame advance gives up
const RUN_BACKSTOP = 60 * CPU_HZ;          // a run with no limit of its own stops after a minute of the machine's time

function option(name, fallback) {
    const i = process.argv.indexOf(name);
    return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const PORT = Number(option("--port", process.env.KIT_JSNES_PORT || 6855));
const JSNES = path.resolve(option("--jsnes", path.join(ROOT, "tools", "nes", "node_modules", "jsnes")));

let jsnesVersion = "unknown";
try {
    jsnesVersion = JSON.parse(fs.readFileSync(path.join(JSNES, "package.json"), "utf8")).version;
} catch {
    console.error(`no jsnes at ${JSNES}: run \`python3 kit/scripts/tools.py get-jsnes\` (kit/nes/INSTALL.md)`);
    process.exit(2);
}
const { default: NES } = await import(pathToFileURL(path.join(JSNES, "src", "nes.js")).href);

// The NMOS 6502's 256 opcodes as kit/cpu/opcodes.py names them (VICE's names), mnemonic.mode.
const OPCODES = "brk.imp ora.izx jam.imp slo.izx noop.zp ora.zp asl.zp slo.zp php.imp ora.imm asl.acc anc.imm noop.abs ora.abs asl.abs slo.abs bpl.rel ora.izy jam.imp slo.izy noop.zpx ora.zpx asl.zpx slo.zpx clc.imp ora.aby noop.imp slo.aby noop.abx ora.abx asl.abx slo.abx jsr.abs and.izx jam.imp rla.izx bit.zp and.zp rol.zp rla.zp plp.imp and.imm rol.acc anc.imm bit.abs and.abs rol.abs rla.abs bmi.rel and.izy jam.imp rla.izy noop.zpx and.zpx rol.zpx rla.zpx sec.imp and.aby noop.imp rla.aby noop.abx and.abx rol.abx rla.abx rti.imp eor.izx jam.imp sre.izx noop.zp eor.zp lsr.zp sre.zp pha.imp eor.imm lsr.acc asr.imm jmp.abs eor.abs lsr.abs sre.abs bvc.rel eor.izy jam.imp sre.izy noop.zpx eor.zpx lsr.zpx sre.zpx cli.imp eor.aby noop.imp sre.aby noop.abx eor.abx lsr.abx sre.abx rts.imp adc.izx jam.imp rra.izx noop.zp adc.zp ror.zp rra.zp pla.imp adc.imm ror.acc arr.imm jmp.ind adc.abs ror.abs rra.abs bvs.rel adc.izy jam.imp rra.izy noop.zpx adc.zpx ror.zpx rra.zpx sei.imp adc.aby noop.imp rra.aby noop.abx adc.abx ror.abx rra.abx noop.imm sta.izx noop.imm sax.izx sty.zp sta.zp stx.zp sax.zp dey.imp noop.imm txa.imp ane.imm sty.abs sta.abs stx.abs sax.abs bcc.rel sta.izy jam.imp sha.izy sty.zpx sta.zpx stx.zpy sax.zpy tya.imp sta.aby txs.imp shs.aby shy.abx sta.abx shx.aby sha.aby ldy.imm lda.izx ldx.imm lax.izx ldy.zp lda.zp ldx.zp lax.zp tay.imp lda.imm tax.imp lxa.imm ldy.abs lda.abs ldx.abs lax.abs bcs.rel lda.izy jam.imp lax.izy ldy.zpx lda.zpx ldx.zpy lax.zpy clv.imp lda.aby tsx.imp las.aby ldy.abx lda.abx ldx.aby lax.aby cpy.imm cmp.izx noop.imm dcp.izx cpy.zp cmp.zp dec.zp dcp.zp iny.imp cmp.imm dex.imp sbx.imm cpy.abs cmp.abs dec.abs dcp.abs bne.rel cmp.izy jam.imp dcp.izy noop.zpx cmp.zpx dec.zpx dcp.zpx cld.imp cmp.aby noop.imp dcp.aby noop.abx cmp.abx dec.abx dcp.abx cpx.imm sbc.izx noop.imm isb.izx cpx.zp sbc.zp inc.zp isb.zp inx.imp sbc.imm nop.imp usbc.imm cpx.abs sbc.abs inc.abs isb.abs beq.rel sbc.izy jam.imp isb.izy noop.zpx sbc.zpx inc.zpx isb.zpx sed.imp sbc.aby noop.imp isb.aby noop.abx sbc.abx inc.abx isb.abx".split(" ").map((s) => s.split("."));
const MODE_LEN = { imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, rel: 2, abs: 3, abx: 3, aby: 3, ind: 3, izx: 2, izy: 2 };

let lastFrame = null; // the last whole picture, 256 x 240 values of 0x00BBGGRR
const nes = new NES({
    onFrame: (buffer) => {
        lastFrame = Uint32Array.from(buffer);
    },
    onAudioSample: null,
    emulateSound: true,
});

// ---- the run state -------------------------------------------------------------------------

const S = {
    running: false,
    stopRequested: false,
    hit: null, // the checkpoint that stopped the run, as the reply gives it
    stopAfter: false, // a read or write checkpoint asked to stop once its instruction is done
    stoppedBefore: -1, // the PC an exec checkpoint stopped before, counted already
    pc: 0, // the instruction being carried out, for read and write checkpoints
    frames: 0, // frames completed since the cartridge went in: the start of each vertical blank
    checkpoints: new Map(),
    nextId: 1,
    exec: [],
    reads: [],
    writes: [],
    codemap: null,
    sound: null,
    kept: new Map(),
    pendingWrites: new Map(), // address: value, the writes of the instruction being carried out
    cartridge: null, // { name, path, sha1, prg, chr, mapper, mirroring }
    romData: null,
};

let chain = Promise.resolve();
function exclusive(fn) {
    const p = chain.then(fn);
    chain = p.catch(() => {});
    return p;
}
function replacing(fn) {
    if (S.running) S.stopRequested = true;
    return exclusive(fn);
}
const yieldToSocket = () => new Promise((resolve) => setImmediate(resolve));

function machine() {
    if (!nes.mmap) throw new Error("no cartridge: `cartridge` first, with a path to the contributor's .nes image");
    return nes.cpu;
}

const pcOf = (cpu) => (cpu.REG_PC + 1) & 0xffff; // jsnes keeps the PC one less than the next instruction
const cycles = () => nes.cpu._cpuCycleBase;

// ---- one step of the machine ---------------------------------------------------------------

// Whether a pending IRQ or reset is taken before the next instruction (jsnes, src/cpu.js, emulate()).
function interruptDue(cpu) {
    return cpu.irqRequested && (cpu.irqType === 2 || (cpu.irqType === 0 && cpu.F_INTERRUPT === 0));
}

// Take the pending IRQ or reset as jsnes's emulate() does at the top of an instruction, and stop
// there, so the handler's first instruction is seen by the checkpoints before it runs.
//
// An interrupt's entry is seven cycles (NESdev, CPU interrupts). jsnes 2.1.0 counts seven but
// steps the PPU for five: its doIrq() makes the three pushes and the two vector reads and leaves
// out the two internal cycles before them, which its NMI entry does step, and its reset entry
// makes only the two vector reads. Its own frame loop so runs an IRQ two cycles short in the
// picture's time. The server steps the missing cycles here, so that the cycle counter and the
// picture agree (kit/skills/nes/tool-jsnes, "Where the server differs from jsnes").
function takeInterrupt(cpu) {
    const temp = cpu.getStatus();
    cpu.REG_PC_NEW = cpu.REG_PC;
    cpu.F_INTERRUPT_NEW = cpu.F_INTERRUPT;
    const internal = cpu.irqType === 0 ? 2 : 5;
    for (let i = 0; i < internal; i++) nes.ppu.advanceDots(3);
    if (cpu.irqType === 0) cpu.doIrq(temp & 0xef);
    else cpu.doResetInterrupt();
    cpu.REG_PC = cpu.REG_PC_NEW;
    cpu.F_INTERRUPT = cpu.F_INTERRUPT_NEW;
    cpu.F_BRK = cpu.F_BRK_NEW;
    cpu.irqRequested = false;
    cpu._cpuCycleBase += 7;
    nes.papu.clockFrameCounter(7, cpu.apuCatchupCycles);
    cpu.apuCatchupCycles = 0;
}

function frameDone() {
    const ppu = nes.ppu;
    if (!ppu.frameEnded) return false;
    ppu.frameEnded = false;
    S.frames++;
    // what jsnes's frame() does before the next frame's first instruction
    nes.controllers[1].clock();
    nes.controllers[2].clock();
    ppu.startFrame();
    return true;
}

// Advance the machine by one instruction, one interrupt entry, or one slice of a DMA's halt.
// Returns "stop" when a checkpoint stops it before the instruction, else whether a frame ended.
function machineStep(first) {
    const r = machineAdvance(first);
    flushWrites();
    return r;
}

function machineAdvance(first) {
    const cpu = nes.cpu;
    if (cpu.cyclesToHalt !== 0) {
        const chunk = Math.min(cpu.cyclesToHalt, 8);
        for (let i = 0; i < chunk; i++) nes.ppu.advanceDots(3);
        nes.papu.clockFrameCounter(chunk);
        cpu.cyclesToHalt -= chunk;
        cpu._cpuCycleBase += chunk;
        return frameDone();
    }
    if (cpu.nmiImmediate) {
        // an NMI with no instruction before it: emulate() takes it and returns
        const c = cpu.emulate();
        nes.papu.clockFrameCounter(c, cpu.apuCatchupCycles);
        cpu.apuCatchupCycles = 0;
        return frameDone();
    }
    if (interruptDue(cpu)) {
        takeInterrupt(cpu);
        return frameDone();
    }
    const pc = pcOf(cpu);
    if (onExec(pc, first)) return "stop";
    S.pc = pc;
    const c = cpu.emulate();
    nes.papu.clockFrameCounter(c, cpu.apuCatchupCycles);
    cpu.apuCatchupCycles = 0;
    return frameDone();
}

async function runCore({ cycles: limit, frames, until, maxCycles, steps }) {
    machine();
    S.running = true;
    S.stopRequested = false;
    S.hit = null;
    S.stopAfter = false;
    S.until = until ?? -1;
    S.untilHit = false;
    S.stepLeft = steps ?? 0;
    S.stepDone = false;
    const c0 = cycles();
    const f0 = S.frames;
    const budget = limit ?? maxCycles ?? (frames ? frames * FRAME_BACKSTOP : RUN_BACKSTOP);
    let first = true;
    let reason = null;
    try {
        while (reason === null) {
            const sliceEnd = Math.min(cycles() + SLICE, c0 + budget);
            while (cycles() < sliceEnd) {
                const r = machineStep(first);
                first = false;
                if (r === "stop") {
                    reason = S.stepDone ? "step" : S.hit ? "checkpoint" : "until";
                    break;
                }
                if (S.stopAfter) {
                    reason = "checkpoint";
                    break;
                }
                if (frames && r === true && S.frames >= f0 + frames) {
                    reason = "frames";
                    break;
                }
            }
            if (reason) break;
            if (cycles() >= c0 + budget) {
                reason = limit != null ? "cycles" : "timeout";
                break;
            }
            await yieldToSocket();
            if (S.stopRequested) {
                reason = "stopped";
            }
        }
    } finally {
        S.running = false;
        S.stopRequested = false;
        S.until = -1;
        S.stepLeft = 0;
        if (S.rearmNeeded) {
            S.rearmNeeded = false;
            rearm();
        }
    }
    return {
        reason,
        pc: pcOf(nes.cpu),
        ran: cycles() - c0,
        frames: S.frames - f0,
        cycles: cycles(),
        hit: S.hit,
        registers: registers(),
    };
}

function run(args) {
    if (S.running) throw new Error("the machine is already running: `stop` it first");
    machine();
    return exclusive(() =>
        runCore({
            cycles: args.cycles ?? (args.seconds != null ? Math.round(args.seconds * CPU_HZ) : undefined),
            frames: args.frames,
            until: args.until != null ? address(args.until) : undefined,
            maxCycles: args.max_cycles,
        }),
    );
}

function step(args) {
    if (S.running) throw new Error("the machine is running: `stop` it first");
    machine();
    const n = Math.max(1, args.count ?? 1);
    return exclusive(async () => {
        const r = await runCore({ steps: n, maxCycles: args.max_cycles ?? 2000000 });
        r.next = disassemble(pcOf(nes.cpu));
        return r;
    });
}

// ---- checkpoints ---------------------------------------------------------------------------

function matches(when, value) {
    if (!when) return true;
    const regs = registers();
    for (const [k, v] of Object.entries(when)) {
        const have = k === "value" ? value : regs[k];
        if (have !== v) return false;
    }
    return true;
}

// Called before each instruction. Returns true to stop before it.
function onExec(pc, first) {
    if (first && pc === S.stoppedBefore) {
        // stopped before this instruction by a checkpoint, which counted it then
        S.stoppedBefore = -1;
        if (S.stepLeft > 0 && --S.stepLeft === 0) S.stepPending = true;
        countCode(pc);
        return false;
    }
    S.stoppedBefore = -1;
    if (S.stepPending) {
        S.stepPending = false;
        S.stepDone = true;
        S.stoppedBefore = -1;
        return true;
    }
    countCode(pc);
    if (!S.exec.length && S.stepLeft === 0 && S.until < 0) return false;
    let stop = false;
    for (const cp of S.exec) {
        if (pc < cp.start || pc > cp.end || !matches(cp.when)) continue;
        cp.hits++;
        cp.last = { pc };
        if (!cp.stop || first) continue;
        if (cp.skip > 0) {
            cp.skip--;
            continue;
        }
        if (!S.hit) S.hit = { checkpoint: cp.id, kind: "exec", address: pc, pc };
        stop = true;
    }
    if (S.until === pc && !first) {
        S.untilHit = true;
        stop = true;
    }
    if (S.stepLeft > 0 && --S.stepLeft === 0) S.stepPending = true;
    if (stop) {
        S.stepPending = false;
        S.stoppedBefore = pc;
        dropTemporary();
    }
    return stop;
}

function countCode(pc) {
    const m = S.codemap;
    if (m && m.count[pc]++ === 0) m.len[pc] = instructionLength(pc);
}

function instructionLength(pc) {
    const op = nes.mmap ? nes.mmap.load(pc) : 0;
    return MODE_LEN[OPCODES[op][1]];
}

// A read of the instruction's own opcode or operand bytes is a fetch, not a load.
function isFetch(addr) {
    const d = (addr - S.pc) & 0xffff;
    return d < instructionLength(S.pc);
}

function access(list, kind, addr, value) {
    for (const cp of list) {
        if (addr < cp.start || addr > cp.end) continue;
        if (kind === "read" && !cp.fetch && isFetch(addr)) continue;
        if (!matches(cp.when, value)) continue;
        cp.hits++;
        cp.last = { pc: S.pc, address: addr, value };
        if (!cp.stop) continue;
        if (cp.skip > 0) {
            cp.skip--;
            continue;
        }
        if (!S.hit) S.hit = { checkpoint: cp.id, kind, address: addr, pc: S.pc, value };
        S.stopAfter = true;
        dropTemporary();
    }
}

// The CPU's bus: every read and write jsnes makes goes through these six methods (src/cpu.js).
// A wrapper is put on the CPU object only while a checkpoint of its kind exists, since it slows
// every access, and put back whenever jsnes replaces the CPU (a load, a reset).
const READS = ["load", "loadDirect", "load16bit", "pull"];
function hook() {
    // jsnes blacks out 8 pixels round the edge of its picture to imitate a television's
    // (src/ppu/index.js, clipToTvSize). The kit's picture is the PPU's whole 256 by 240, which
    // is what site/lib/nes.js draws; the flag is the PPU object's, so it is set again whenever
    // jsnes makes a new one.
    nes.ppu.clipToTvSize = false;
    const cpu = nes.cpu;
    for (const m of [...READS, "write", "push"]) delete cpu[m];
    if (S.reads.length) {
        const proto = Object.getPrototypeOf(cpu);
        cpu.load = function (a) {
            const v = proto.load.call(this, a);
            access(S.reads, "read", a & 0xffff, v);
            return v;
        };
        cpu.loadDirect = function (a) {
            const v = proto.loadDirect.call(this, a);
            access(S.reads, "read", a & 0xffff, v);
            return v;
        };
        cpu.load16bit = function (a) {
            const v = proto.load16bit.call(this, a);
            access(S.reads, "read", a & 0xffff, v & 0xff);
            access(S.reads, "read", (a + 1) & 0xffff, v >> 8);
            return v;
        };
        cpu.pull = function () {
            const v = proto.pull.call(this);
            access(S.reads, "read", 0x100 | this.REG_SP, v);
            return v;
        };
    }
    if (S.writes.length) {
        // A read-modify-write instruction (INC, ASL and the rest) writes its operand twice, the
        // old value and then the new (jsnes, src/cpu.js, "dummy write"), as the 6502 does. The
        // writes of one instruction are kept until it ends and counted once an address, with the
        // value it was left holding (flushWrites).
        const proto = Object.getPrototypeOf(cpu);
        cpu.write = function (a, v) {
            proto.write.call(this, a, v);
            S.pendingWrites.set(a & 0xffff, v);
        };
        cpu.push = function (v) {
            const at = 0x100 | this.REG_SP;
            proto.push.call(this, v);
            S.pendingWrites.set(at, v);
        };
    }
    hookSound();
}

function flushWrites() {
    if (!S.pendingWrites.size) return;
    for (const [a, v] of S.pendingWrites) access(S.writes, "write", a, v);
    S.pendingWrites.clear();
}

function rearm() {
    const all = [...S.checkpoints.values()];
    S.exec = all.filter((c) => c.kind === "exec");
    S.reads = all.filter((c) => c.kind === "read");
    S.writes = all.filter((c) => c.kind === "write");
    hook();
}

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
    for (const cp of S.checkpoints.values())
        if (args.checkpoint == null || cp.id === args.checkpoint) {
            cp.hits = 0;
            cp.last = null;
        }
    return {};
}

// ---- memory, registers, chips --------------------------------------------------------------

function address(a, top = 0xffff) {
    const n = typeof a === "string" ? parseInt(a.replace(/^[$&]|^0x/i, ""), 16) : a;
    if (!Number.isInteger(n) || n < 0 || n > top) throw new Error(`address ${a}: 0 to $${hex(top)}`);
    return n;
}

const hex = (n, w = 4) => n.toString(16).toUpperCase().padStart(w, "0");

// The CPU's view without touching the bus: a read of $2000-$401F through the bus would clear
// the PPU's vertical blank flag or move a controller's shift register on, so those read as 0
// and are flagged; `chips` has their state. RAM's mirrors read the 2 KB beneath.
function cpuByte(a) {
    if (a < 0x2000) return nes.cpu.mem[a & 0x7ff];
    if (a < 0x4020) return null;
    if (a < 0x6000) return 0;
    return nes.cpu.mem[a];
}

function readMemory(args) {
    machine();
    const space = args.space ?? "cpu";
    const rom = nes.rom;
    const prgSize = rom.romCount * 16384;
    const chrSize = rom.vromCount * 4096;
    const top = { cpu: 0xffff, ppu: 0x3fff, oam: 0xff, prg: prgSize - 1, chr: chrSize - 1 }[space];
    if (top == null) throw new Error(`space ${space}: cpu, ppu, oam, prg or chr`);
    if (top < 0) throw new Error(`the cartridge has no ${space.toUpperCase()} ROM`);
    if (space === "prg" || space === "chr") {
        // the cartridge's own ROM, by its offset in the image after the header: every bank,
        // whichever the mapper has selected (jsnes, src/rom.js: 16 KB PRG banks, 4 KB CHR banks)
        const start = address(args.address, top);
        const length = Math.min(args.length ?? 256, top + 1 - start);
        const size = space === "prg" ? 16384 : 4096;
        const banks = space === "prg" ? rom.rom : rom.vrom;
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) bytes[i] = banks[Math.floor((start + i) / size)][(start + i) % size];
        return { address: start, space, data: Buffer.from(bytes).toString("base64"), io: false };
    }
    const start = address(args.address, top);
    const length = args.length ?? 256;
    if (!(Number.isInteger(length) && length >= 0 && length <= top + 1)) throw new Error(`length: 0 to ${top + 1}`);
    const bytes = new Uint8Array(length);
    let io = false;
    for (let i = 0; i < length; i++) {
        const a = (start + i) & top;
        if (space === "ppu") bytes[i] = nes.ppu.mirroredLoad(a);
        else if (space === "oam") bytes[i] = nes.ppu.spriteMem[a];
        else {
            const v = cpuByte(a);
            if (v === null) io = true;
            bytes[i] = v ?? 0;
        }
    }
    return { address: start, space, data: Buffer.from(bytes).toString("base64"), io };
}

function writeMemory(args) {
    machine();
    const space = args.space ?? "cpu";
    const bytes = args.data != null ? Buffer.from(args.data, "base64") : Uint8Array.from(args.bytes ?? []);
    const start = address(args.address, space === "ppu" ? 0x3fff : space === "oam" ? 0xff : 0xffff);
    for (let i = 0; i < bytes.length; i++) {
        const v = bytes[i];
        if (space === "oam") nes.ppu.spriteMem[(start + i) & 0xff] = v;
        else if (space === "ppu") {
            nes.ppu.mirroredWrite((start + i) & 0x3fff, v); // jsnes's writeMem updates its tile and name caches
        } else {
            const a = (start + i) & 0xffff;
            if (a < 0x2000) nes.cpu.mem[a & 0x7ff] = v;
            else if (a < 0x4020) {
                if (!args.io) throw new Error(`$${hex(a)} is a chip's register: pass "io": true to write to it`);
                nes.mmap.write(a, v);
            } else if (a >= 0x8000 && !args.rom)
                throw new Error(`$${hex(a)} is ROM: pass "rom": true to change the image in memory (a patch, gone at the next bank switch)`);
            else nes.cpu.mem[a] = v;
        }
    }
    return { written: bytes.length };
}

function registers() {
    const cpu = nes.cpu;
    const p = cpu.getStatus();
    const flags = "NV-BDIZC"
        .split("")
        .map((f, i) => (p & (0x80 >> i) ? f : f.toLowerCase()))
        .join("");
    return { pc: pcOf(cpu), a: cpu.REG_ACC, x: cpu.REG_X, y: cpu.REG_Y, s: cpu.REG_SP & 0xff, p, flags, cycles: cpu._cpuCycleBase };
}

function setRegisters(args) {
    const cpu = machine();
    if (args.a != null) cpu.REG_ACC = args.a & 0xff;
    if (args.x != null) cpu.REG_X = args.x & 0xff;
    if (args.y != null) cpu.REG_Y = args.y & 0xff;
    if (args.s != null) cpu.REG_SP = 0x100 | (args.s & 0xff);
    if (args.p != null) cpu.setStatus(args.p & 0xff);
    if (args.pc != null) {
        cpu.REG_PC = (address(args.pc) - 1) & 0xffff;
        S.stoppedBefore = -1; // the instruction at the new PC has not been seen yet
    }
    return registers();
}

function chips() {
    machine();
    const ppu = nes.ppu;
    const ctrl = (ppu.f_nmiOnVblank << 7) | (ppu.f_spriteSize << 5) | (ppu.f_bgPatternTable << 4) |
        (ppu.f_spPatternTable << 3) | (ppu.f_addrInc << 2) | ppu.f_nTblAddress;
    const mask = (ppu.f_color << 5) | (ppu.f_spVisibility << 4) | (ppu.f_bgVisibility << 3) |
        (ppu.f_spClipping << 2) | (ppu.f_bgClipping << 1) | ppu.f_dispType;
    const pad = (n) => {
        const c = nes.controllers[n];
        return Object.fromEntries(BUTTONS.map((b, i) => [b, c.state[i] === 0x41]));
    };
    return {
        ppu: {
            ctrl,
            mask,
            status: nes.cpu.mem[0x2002],
            scanline: ppu.scanline - 21 < 0 ? ppu.scanline + 241 : ppu.scanline - 21, // NES numbering: 0-239 drawn, 241 the start of vertical blank
            dot: ppu.curX,
            vram_address: ppu.vramAddress,
            write_toggle: ppu.firstWrite ? 0 : 1,
            mirroring: ppu.currentMirroring,
            palette: Array.from({ length: 32 }, (_, i) => ppu.mirroredLoad(0x3f00 + i)),
        },
        controllers: { 1: pad(1), 2: pad(2) },
        mapper: S.cartridge && S.cartridge.mapper,
        frames: S.frames,
    };
}

function disassemble(pc) {
    const b = (i) => cpuByte((pc + i) & 0xffff) ?? 0;
    const [m, mode] = OPCODES[b(0)];
    const length = MODE_LEN[mode];
    const w = b(1) | (b(2) << 8);
    const op = {
        imp: "", acc: "A", imm: `#$${hex(b(1), 2)}`, zp: `$${hex(b(1), 2)}`, zpx: `$${hex(b(1), 2)},X`,
        zpy: `$${hex(b(1), 2)},Y`, izx: `($${hex(b(1), 2)},X)`, izy: `($${hex(b(1), 2)}),Y`,
        abs: `$${hex(w)}`, abx: `$${hex(w)},X`, aby: `$${hex(w)},Y`, ind: `($${hex(w)})`,
        rel: `$${hex((pc + 2 + ((b(1) ^ 0x80) - 0x80)) & 0xffff)}`,
    }[mode];
    return { address: pc, text: `${m.toUpperCase()} ${op}`.trim(), length };
}

// ---- the controllers -----------------------------------------------------------------------

const BUTTONS = ["a", "b", "select", "start", "up", "down", "left", "right"];

function button(args) {
    machine();
    const n = args.controller ?? 1;
    if (n !== 1 && n !== 2) throw new Error("controller: 1 or 2");
    const names = Array.isArray(args.button) ? args.button : [args.button];
    for (const name of names) {
        const i = BUTTONS.indexOf(String(name).toLowerCase());
        if (i < 0) throw new Error(`no button ${JSON.stringify(name)}: ${BUTTONS.join(", ")}`);
        if (args.down === false) nes.buttonUp(n, i);
        else nes.buttonDown(n, i);
    }
    return { held: held() };
}

function held() {
    const out = {};
    for (const n of [1, 2]) out[n] = BUTTONS.filter((_, i) => nes.controllers[n].state[i] === 0x41);
    return out;
}

function releaseButtons() {
    machine();
    for (const n of [1, 2]) for (let i = 0; i < 8; i++) nes.buttonUp(n, i);
    return { held: held() };
}

// ---- the cartridge, snapshots, rollback ----------------------------------------------------

function describe(data, name, file) {
    const h = data.subarray(0, 16);
    if (!(h[0] === 0x4e && h[1] === 0x45 && h[2] === 0x53 && h[3] === 0x1a))
        throw new Error(`${name}: not an iNES image (it does not start with "NES" and $1A)`);
    const mapper = (h[6] >> 4) | (h[7] & 0xf0);
    const trainer = h[6] & 4 ? 512 : 0;
    const body = data.subarray(16 + trainer, 16 + trainer + h[4] * 16384 + h[5] * 8192);
    return {
        name,
        path: file ?? null,
        bytes: data.length,
        sha1: crypto.createHash("sha1").update(data).digest("hex"),
        crc32_body: crc32(body).toString(16).toUpperCase().padStart(8, "0"),
        prg_kb: h[4] * 16,
        chr_kb: h[5] * 8,
        mapper,
        mirroring: h[6] & 8 ? "four-screen" : h[6] & 1 ? "vertical" : "horizontal",
        battery: !!(h[6] & 2),
        nes2: (h[7] & 0x0c) === 0x08,
    };
}

function putIn(data, info) {
    nes.loadROM(data);
    S.romData = data;
    S.cartridge = info;
    S.frames = 0;
    S.stoppedBefore = -1;
    lastFrame = null;
    rearm();
}

function cartridge(args) {
    return replacing(async () => {
        let data, info;
        if (args.path) {
            const file = path.resolve(args.path);
            data = new Uint8Array(fs.readFileSync(file));
            info = describe(data, path.basename(file), file);
        } else if (args.data) {
            data = new Uint8Array(Buffer.from(args.data, "base64"));
            info = describe(data, args.name ?? "sent by the client", null);
        } else throw new Error('give "path" (a .nes image on this computer) or "data" (its bytes, base64)');
        putIn(data, info);
        return { cartridge: info, registers: registers() };
    });
}

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

// The whole machine as jsnes saves it, and the server's own part of the state. jsnes leaves the
// image out (its romData); the snapshot names the cartridge, and a load puts the same one in.
// The CPU's 64 KB, ROM banks included, is state.cpu.mem (kit/nes/snapshot.py reads it).
function stateNow() {
    return { state: nes.toJSON(), frames: S.frames, stoppedBefore: S.stoppedBefore };
}

function restore(k) {
    nes.fromJSON(k.state);
    S.frames = k.frames;
    S.stoppedBefore = k.stoppedBefore ?? -1;
    rearm(); // jsnes made a new CPU, PPU and APU: the hooks go back on
}

function save(args) {
    machine();
    const file = insideRepository(args.path);
    const snap = {
        format: "kit-nes-snapshot",
        kit: {
            saved_by: "kit/nes/jsnes_server.mjs",
            protocol: PROTOCOL,
            jsnes: jsnesVersion,
            cartridge: S.cartridge,
            frames: S.frames,
            stopped_before: S.stoppedBefore,
            held: held(),
        },
        state: nes.toJSON(),
    };
    writeFileAtomic(file, zlib.gzipSync(Buffer.from(JSON.stringify(snap))));
    return { path: file, bytes: fs.statSync(file).size, pc: pcOf(nes.cpu), cycles: cycles(), frames: S.frames };
}

function load(args) {
    return replacing(async () => {
        const file = path.resolve(args.path);
        const raw = fs.readFileSync(file);
        const text = raw[0] === 0x1f && raw[1] === 0x8b ? zlib.gunzipSync(raw).toString("utf8") : raw.toString("utf8");
        const snap = JSON.parse(text);
        if (snap.format !== "kit-nes-snapshot") throw new Error(`${path.basename(file)}: not a snapshot the kit's NES server saved`);
        const want = snap.kit.cartridge;
        if (!S.cartridge || S.cartridge.sha1 !== want.sha1) {
            const from = args.cartridge ?? want.path;
            if (!from || !fs.existsSync(from))
                throw new Error(`the snapshot's cartridge, ${want.name}, is not in the machine and not at ${want.path}: ` +
                    'put it in with `cartridge`, or pass "cartridge": <path>');
            const data = new Uint8Array(fs.readFileSync(from));
            const info = describe(data, path.basename(from), path.resolve(from));
            if (info.sha1 !== want.sha1) throw new Error(`${from} is not the snapshot's cartridge (its SHA-1 differs)`);
            putIn(data, info);
        }
        restore({ state: snap.state, frames: snap.kit.frames, stoppedBefore: snap.kit.stopped_before });
        return { registers: registers(), frames: S.frames, cartridge: S.cartridge.name, held: held() };
    });
}

function keep(args) {
    machine();
    const name = args.name ?? "default";
    S.kept.set(name, structuredClone(stateNow()));
    return { name, kept: [...S.kept.keys()] };
}

function back(args) {
    const name = args.name ?? "default";
    const k = S.kept.get(name);
    if (!k) throw new Error(`nothing kept as ${name}`);
    return replacing(async () => {
        restore(structuredClone(k));
        return { name, registers: registers(), held: held() };
    });
}

// ---- outputs: the screen, the APU, what ran ------------------------------------------------

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

// The last whole frame, 256 x 240, in jsnes's palette.
function screenshot(args) {
    machine();
    if (!lastFrame) throw new Error("no frame drawn yet: run a frame first");
    const file = insideRepository(args.path);
    const w = 256;
    const h = 240;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const v = lastFrame[y * w + x];
            const o = y * (w * 3 + 1) + 1 + x * 3;
            raw[o] = v & 0xff;
            raw[o + 1] = (v >> 8) & 0xff;
            raw[o + 2] = (v >> 16) & 0xff;
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
    return { path: file, width: w, height: h, frames: S.frames };
}

// Every write to the APU's registers, $4000-$4013, $4015 and $4017, with the CPU cycle.
function hookSound() {
    const papu = nes.papu;
    delete papu.writeReg;
    if (!S.sound) return;
    const proto = Object.getPrototypeOf(papu);
    papu.writeReg = function (a, v) {
        if (S.sound) S.sound.writes.push([cycles(), a, v]);
        return proto.writeReg.call(this, a, v);
    };
}

function sound(args) {
    machine();
    if (args.action === "start") {
        S.sound = { start: cycles(), writes: [] };
        hookSound();
        return { start: S.sound.start };
    }
    if (args.action !== "stop") throw new Error('action: "start" or "stop"');
    if (!S.sound) throw new Error("no capture running: `sound` start first");
    const cap = S.sound;
    S.sound = null;
    hookSound();
    const out = { format: "kit-nes-apu-writes", clock: CPU_HZ, start: cap.start, end: cycles(), writes: cap.writes };
    if (!args.path) return { ...out, count: cap.writes.length };
    writeFileAtomic(insideRepository(args.path), JSON.stringify(out));
    return { path: path.resolve(args.path), count: cap.writes.length, start: out.start, end: out.end };
}

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
        cartridge: S.cartridge,
        pc: nes.mmap ? pcOf(nes.cpu) : null,
        cycles: nes.mmap ? cycles() : null,
        frames: S.frames,
        checkpoints: S.checkpoints.size,
        codemap: !!S.codemap,
        sound: !!S.sound,
        held: nes.mmap ? held() : null,
    };
}

const COMMANDS = {
    hello: () => ({
        server: "kit jsnes server",
        protocol: PROTOCOL,
        jsnes: jsnesVersion,
        model: "NES (NTSC)",
        node: process.version,
        root: ROOT,
        commands: Object.keys(COMMANDS),
    }),
    status,
    cartridge,
    reset: (a) => replacing(async () => {
        machine();
        if (a.hard ?? true) putIn(S.romData, S.cartridge);
        else nes.cpu.requestIrq(nes.cpu.IRQ_RESET);
        S.stoppedBefore = -1;
        return registers();
    }),
    button,
    buttons: () => ({ held: held() }),
    "release-buttons": releaseButtons,
    run,
    step,
    stop: () => {
        const was = S.running;
        if (was) S.stopRequested = true;
        return { was_running: was };
    },
    read: readMemory,
    write: writeMemory,
    registers: () => (machine(), registers()),
    "set-registers": setRegisters,
    disassemble: (a) => {
        machine();
        let at = address(a.address ?? pcOf(nes.cpu));
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
    save,
    load,
    keep,
    back,
    screenshot,
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
    console.log(`kit jsnes server: jsnes ${jsnesVersion}, NES (NTSC), no cartridge, on 127.0.0.1:${PORT}`);
});
