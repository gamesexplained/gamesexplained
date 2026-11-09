// The kit's Game & Watch: the kit's SM5A (kit/gnw/sm5a.js) in this Node process, driven over a
// local socket. kit/gnw/gnw.py is its client; kit/gnw/tools.py starts and stops it.
//
//   node kit/gnw/gnw_server.mjs [--port 6858]
//
// The machine is the kit's own model, held instruction for instruction to MAME 0.289's by
// kit/gnw/test_machine.js; MAME itself is the second machine (kit/skills/gnw/tool-mame). The
// protocol is the other platforms' servers': one JSON object a line, both ways, on 127.0.0.1
// only. A request is {"id": 7, "cmd": "read", ...arguments}; its reply carries the same id and
// "ok": true with the result, or "ok": false with "error". "id", "cmd" and "ok" are the protocol's
// own: no argument or result uses them (a checkpoint's number is "checkpoint"). The commands are listed in
// kit/skills/gnw/tool-gnw-server.
//
// The machine runs only inside `run` and `step`, in slices, and between two slices it answers
// every other call, so a call made while it runs is served between two instructions and `stop`
// ends the run there. A command that replaces the machine's state (`load`, `power`, `reset`,
// `rom`) stops a run first. Checkpoints are the server's, not the machine's, so a load never
// touches them; the first instruction of a run or a step is counted but never stopped on.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { SM5A, ROM_SIZE } = require("./sm5a.js");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(path.dirname(HERE));
const PROTOCOL = 1;
const HZ = 16384;                // machine cycles a second: 32,768 Hz, two clocks a cycle
const SLICE = 4096;              // cycles between two looks at the socket: a quarter of a second
const RUN_BACKSTOP = 600 * HZ;   // a run with no limit of its own stops after ten minutes of the machine's time

function option(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
const PORT = Number(option("--port", process.env.KIT_GNW_PORT || 6858));
const HOME = path.join(ROOT, "tools", "gnw-home");
const SNAPSHOTS = path.join(HOME, "snapshots");

// ---- the ROM: a file of 1,856 bytes, or MAME's ROM set (a zip holding it and the screen's SVG)
function unzip(buf) {
  // the central directory, read by hand: Node has inflate but no zip reader
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip file");
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("a damaged zip directory");
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), size = buf.readUInt32LE(p + 24),
      nameLen = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32),
      local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const body = buf.subarray(start, start + csize);
    out[name] = method === 0 ? Buffer.from(body) : method === 8 ? zlib.inflateRawSync(body) : null;
    if (out[name] && out[name].length !== size) throw new Error(name + ": " + out[name].length + " bytes unpacked, the zip says " + size);
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

function readRom(file) {
  const buf = fs.readFileSync(file);
  if (buf.length === ROM_SIZE) return { rom: buf, name: path.basename(file) };
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error(file + ": " + buf.length + " bytes, neither an SM5A's ROM (" + ROM_SIZE + ") nor a zip");
  const files = unzip(buf);
  const hit = Object.entries(files).filter(([, b]) => b && b.length === ROM_SIZE);
  if (hit.length !== 1) throw new Error(file + ": " + hit.length + " files of " + ROM_SIZE + " bytes in the zip (" + Object.keys(files).join(", ") + "), want one");
  return { rom: hit[0][1], name: path.basename(file) + ":" + hit[0][0] };
}

// ---- the machine and what the server keeps beside it
let m = null, romInfo = null;
let wiring = { buttons: {}, low: [] };     // name -> "R2.K1" .. "R4.K4", "GND.K1".., "alpha", "beta", "acl"
const held = new Set();
let checkpoints = [], nextId = 1;
let running = null;                        // the run in progress: { reply, until, stopAt, reason }
let stopAsked = false;

function applyButtons() {
  if (!m) return;
  m.rows = [0, 0, 0]; m.always = 0;
  let alpha = 0, beta = 0;
  for (const [name, pin] of Object.entries(wiring.buttons)) {
    const down = held.has(name);
    let mt;
    if (pin === "alpha") alpha = down ? 1 : 0;
    else if (pin === "beta") beta = down ? 1 : 0;
    else if ((mt = /^R([234])\.K([1-4])$/.exec(pin))) { if (down) m.rows[+mt[1] - 2] |= 1 << (+mt[2] - 1); }
    else if ((mt = /^GND\.K([1-4])$/.exec(pin))) { if (down) m.always |= 1 << (+mt[1] - 1); }
  }
  m.alpha = wiring.low.includes("alpha") ? 1 - alpha : alpha;
  m.beta = wiring.low.includes("beta") ? 1 - beta : beta;
}

const hex = (bytes) => Buffer.from(bytes).toString("hex");
function where() {
  return { pc: m.pc, at: (m.pc >> 10) + ":" + (m.pc >> 6 & 15).toString(16).toUpperCase() + ":" + (m.pc & 63).toString(16).toUpperCase().padStart(2, "0"),
    cycles: m.cycles, clocks: m.clocks, halt: m.halt, skip: m.skip };
}
function registers() {
  return Object.assign(where(), { acc: m.acc, bl: m.bl, bm: m.bm, c: m.c, cb: m.cb, su: m.getSu(), stack: m.stack, rsub: m.rsub,
    div: m.div, gamma: m.gamma, bp: m.bp, r: m.r, r_out: m.rOut, mx: m.mx, w: Array.from(m.o), w_prime: Array.from(m.ox),
    alpha: m.alpha, beta: m.beta, k: m.k() });
}
function need() { if (!m) throw new Error("no ROM: send {\"cmd\": \"rom\", \"path\": ...} first"); }

function snapshotFile(name) {
  if (!name) throw new Error("name or path wanted");
  if (name.includes("/") || name.includes("\\")) return path.resolve(name);
  fs.mkdirSync(SNAPSHOTS, { recursive: true });
  return path.join(SNAPSHOTS, name.endsWith(".gnw.json.gz") ? name : name + ".gnw.json.gz");
}

// One instruction (or a cycle asleep), with the checkpoints. Returns a checkpoint that stops, or null.
function stepOnce(first) {
  let stop = null;
  if (!m.halt && !m.skip) {
    for (const c of checkpoints) {
      if (c.pc !== m.pc) continue;
      c.hits++;
      if (c.stop && !first && c.hits > c.ignore && !stop) stop = c;
    }
  }
  if (stop) return stop;
  m.step();
  return null;
}

function finishRun(reason, extra) {
  const r = running;
  running = null;
  stopAsked = false;
  r.reply(Object.assign({ reason }, where(), extra || {}));
}

function slice() {
  const r = running;
  if (!r) return;
  let first = r.first;
  r.first = false;
  const end = Math.min(m.cycles + SLICE, r.until);
  while (m.cycles < end) {
    if (stopAsked) return finishRun("stopped");
    const c = stepOnce(first);
    first = false;
    if (c) return finishRun("checkpoint", { checkpoint: c.checkpoint });
    if (r.steps !== undefined && --r.steps <= 0) return finishRun("steps");
  }
  if (m.cycles >= r.until) return finishRun(r.limitReason);
  setImmediate(slice);
}

const COMMANDS = {
  hello: () => ({ protocol: PROTOCOL, machine: "Game & Watch (Sharp SM5A), the kit's model", rom: romInfo, port: PORT }),
  rom: (a) => {
    stopRun();
    const r = readRom(path.resolve(a.path));
    m = new SM5A(r.rom);
    romInfo = { file: r.name, sha1: crypto.createHash("sha1").update(r.rom).digest("hex"), bytes: r.rom.length };
    applyButtons();
    return romInfo;
  },
  wiring: (a) => {
    wiring = { buttons: a.buttons || {}, low: a.low || [] };
    for (const [n, pin] of Object.entries(wiring.buttons)) if (!/^(R[234]\.K[1-4]|GND\.K[1-4]|alpha|beta|acl)$/.test(pin)) throw new Error(n + ": pin " + pin + ", want R2.K1 to R4.K4, GND.K1 to GND.K4, alpha, beta or acl");
    applyButtons();
    return wiring;
  },
  power: () => { need(); stopRun(); m.powerOn(); applyButtons(); return where(); },
  reset: () => { need(); stopRun(); m.reset(); applyButtons(); return where(); },
  status: () => ({ running: !!running, rom: romInfo, ...(m ? where() : {}) }),
  registers: () => { need(); return registers(); },
  read: (a) => {
    need();
    const space = a.space || "data", start = a.start | 0, n = a.length === undefined ? 1 : a.length | 0;
    if (space === "data") return { space, start, bytes: hex(Array.from({ length: n }, (_, i) => m.ram[SM5A.cell(start + i)])) };
    if (space === "rom") return { space, start, bytes: hex(Array.from({ length: n }, (_, i) => m.fetch(start + i))) };
    throw new Error("space " + space + ": want data or rom");
  },
  write: (a) => {
    need();
    if ((a.space || "data") !== "data") throw new Error("only the data memory is written");
    const b = Buffer.from(a.bytes, "hex");
    b.forEach((v, i) => { m.ram[SM5A.cell((a.start | 0) + i)] = v & 0xf; });
    return { written: b.length };
  },
  press: (a) => {
    need();
    if (!(a.button in wiring.buttons)) throw new Error("no button " + a.button + ": the wiring names " + Object.keys(wiring.buttons).join(", "));
    if (wiring.buttons[a.button] === "acl") { if (a.down !== false) { m.reset(); } return where(); }
    if (a.down === false) held.delete(a.button); else held.add(a.button);
    applyButtons();
    return { held: Array.from(held), k: m.k(), alpha: m.alpha, beta: m.beta };
  },
  release: () => { held.clear(); applyButtons(); return { held: [] }; },
  checkpoint: (a) => {
    const pc = a.pc !== undefined ? a.pc : undefined;
    if (pc === undefined || pc < 0 || pc > 0x7ff) throw new Error("pc wanted, the physical program counter (CB, page and PL), 0 to $7FF");
    const c = { checkpoint: nextId++, pc, stop: a.stop !== false, ignore: a.ignore | 0, hits: 0 };
    checkpoints.push(c);
    return c;
  },
  delete: (a) => { const n = checkpoints.length; checkpoints = checkpoints.filter((c) => a.checkpoint !== undefined && c.checkpoint !== a.checkpoint); return { deleted: n - checkpoints.length }; },
  checkpoints: () => ({ checkpoints }),
  save: (a) => {
    need();
    const file = snapshotFile(a.name || a.path);
    const body = { format: "kit-gnw-snapshot", version: 1, chip: "SM5A", rom: { ...romInfo, hex: hex(m.rom) }, wiring, held: Array.from(held), state: m.save() };
    fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(body)));
    return { path: file, ...where() };
  },
  load: (a) => {
    stopRun();
    const file = snapshotFile(a.name || a.path);
    const s = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
    if (s.format !== "kit-gnw-snapshot") throw new Error(file + ": not the kit's Game & Watch snapshot");
    const rom = Buffer.from(s.rom.hex, "hex");
    m = SM5A.load(rom, s.state);
    romInfo = { file: s.rom.file, sha1: s.rom.sha1, bytes: rom.length };
    wiring = s.wiring || wiring;
    held.clear(); for (const b of s.held || []) held.add(b);
    applyButtons();
    return { path: file, ...where() };
  },
  screen: () => { need(); return { bp: m.bp, lit: m.lit() }; },
  stop: () => { if (running) stopAsked = true; return { stopping: !!running }; },
};

function stopRun() { if (running) finishRun("stopped"); }

function startRun(a, reply) {
  need();
  if (running) throw new Error("a run is in progress: stop it first");
  let until = m.cycles + RUN_BACKSTOP, limitReason = "backstop", steps;
  if (a.cycles !== undefined) { until = m.cycles + (a.cycles | 0); limitReason = "cycles"; }
  if (a.seconds !== undefined) { until = m.cycles + Math.round(a.seconds * HZ); limitReason = "seconds"; }
  if (a.cmd === "step") { steps = a.count === undefined ? 1 : a.count | 0; limitReason = "steps"; }
  running = { reply, until, limitReason, steps, first: true };
  setImmediate(slice);
}

const server = net.createServer((sock) => {
  sock.setEncoding("utf8");
  let buf = "";
  sock.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const text = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (!text.trim()) continue;
      let req;
      try { req = JSON.parse(text); } catch { sock.write(JSON.stringify({ ok: false, error: "not JSON: " + text.slice(0, 80) }) + "\n"); continue; }
      const send = (ok, body) => { if (!sock.destroyed) sock.write(JSON.stringify(Object.assign({ id: req.id, ok }, ok ? body : { error: body })) + "\n"); };
      try {
        if (req.cmd === "run" || req.cmd === "step") startRun(req, (r) => send(true, r));
        else if (COMMANDS[req.cmd]) send(true, COMMANDS[req.cmd](req));
        else send(false, "no command " + req.cmd + ": the commands are " + Object.keys(COMMANDS).concat(["run", "step"]).join(", "));
      } catch (e) { send(false, String(e.message || e)); }
    }
  });
  sock.on("error", () => {});
});
server.listen(PORT, "127.0.0.1", () => console.log("gnw server on 127.0.0.1:" + PORT + ", protocol " + PROTOCOL));
