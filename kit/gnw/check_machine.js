#!/usr/bin/env node
'use strict';
// Holds the kit's SM5A (kit/gnw/sm5a.js) to MAME's, instruction by instruction, on programs of
// its own: seeded random bytes, which run every opcode and every odd path a game rarely takes
// (a call inside a subroutine, a long call after SSR, a page that wraps, CEND and the wake-up),
// with the buttons pressed and released at times the seed picks. MAME runs each program as the
// ROM of its first SM5A unit, AC-01 ('gnw_ball'), from a folder under tools/gnw/home/check, with
// an empty screen; its debugger's trace logs every instruction with A, BL, BM and C, and the
// Lua script logs the CPU's cycle count at each press and the data memory at the end.
//
//   node kit/gnw/check_machine.js            compare with MAME, every line (needs tools.py get-mame)
//   node kit/gnw/check_machine.js --record   and write the fixture kit/gnw/fixtures/machine.json
//   node kit/gnw/check_machine.js --seeds 6,7 only those programs, keeping MAME's last trace in tools/gnw/home/check
//
// The fixture keeps, per program, the presses, a hash of each 1,024 lines of MAME's trace and the
// memory at the end; kit/gnw/test_machine.js holds the machine to it with no MAME. Nothing of a
// game is used: the programs are made from the seeds.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const { SM5A } = require('./sm5a.js');

const ROOT = path.resolve(__dirname, '../..');
const MAME = path.join(ROOT, 'tools/gnw/mame-src/gnw');
const HOME = path.join(ROOT, 'tools/gnw/home');
const FIXTURE = path.join(__dirname, 'fixtures/machine.json');
const DASM = path.join(__dirname, 'fixtures/disassembly.json');
const DASM_SEEDS = [1, 2, 3, 4];
const SEEDS = Array.from({ length: 64 }, (_, i) => i + 1);
const FRAMES = 40;                  // MAME's frames (60 a second) each program runs for
const CHUNK = 1024;

// a program: 1,856 bytes from a seeded generator (xorshift32), laid out in the order the chip runs
// them; one byte in 24 is the prefix 5E, and the byte the chip runs after it is 00 or 04, so that
// CEND and DTA, which random bytes would almost never make, run in every program
function program(seed) {
  let x = (seed * 2654435761) >>> 0 || 1;
  const next = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x; };
  const order = [];                      // the PL values of a page, in the order the chip runs them
  for (let pl = 0, i = 0; i < 63; i++, pl = SM5A.nextPc(pl)) order.push(pl);
  order.push(0x3f);
  const rom = new Uint8Array(SM5A.ROM_SIZE);
  for (let page = 0; page < SM5A.ROM_SIZE >> 6; page++) {
    for (let i = 0; i < 64; i++) {
      let b = next() & 0xff;
      if (next() % 24 === 0 && i < 62) { rom[page << 6 | order[i]] = 0x5e; i++; b = next() & 1 ? 0x00 : 0x04; }
      rom[page << 6 | order[i]] = b;
    }
  }
  return rom;
}

// the presses: [frame, input, pressed], input one of 'time', 'b', 'a' (row IN.0's K1-K3), 'right', 'left'
function presses(seed) {
  const names = ['time', 'b', 'a', 'right', 'left'];
  const out = [];
  for (let i = 0; i < 6; i++) {
    const f = 3 + ((seed * 37 + i * 23) % (FRAMES - 12)), n = names[(seed + i) % names.length];
    out.push([f, n, 1], [f + 4 + (i % 5), n, 0]);
  }
  return out.sort((p, q) => p[0] - q[0]);
}

// what a press does to the machine's pins on AC-01: K1-K3 of its one row, which it wires to
// ground so that it is read whatever R selects, and alpha and beta, which it wires active low
// (hh_sm510.cpp, gnw_ball_state's inp_fixed_last and its ports)
function apply(m, held, name, v) {
  held[name] = v;
  m.always = (held.time ? 1 : 0) | (held.b ? 2 : 0) | (held.a ? 4 : 0);
  m.alpha = held.right ? 0 : 1;
  m.beta = held.left ? 0 : 1;
}

const hex = n => n.toString(16).toUpperCase();
const line = m => [hex(m.acc), hex(m.bl), hex(m.bm), hex(m.c), (m.pc >> 10) + ':' + hex(m.pc >> 6 & 15) + ':' + hex(m.pc & 63).padStart(2, '0') + ':'].join(' ');

// the machine's trace of a program, with the presses at MAME's cycle counts; stops at `end` cycles
function model(rom, events, end) {
  const m = new SM5A(rom), held = {}, out = [], ops = new Set();
  apply(m, held, 'right', 0);
  let k = 0;
  while (m.cycles < end) {
    while (k < events.length && m.cycles >= events[k][0]) { apply(m, held, events[k][1], events[k][2]); k++; }
    if (!m.halt && !m.skip) {
      out.push(line(m));
      const op = m.fetch(m.pc);
      ops.add(op === 0x5e ? 0x5e00 | m.fetch(SM5A.nextPc(m.pc)) : op);
    }
    m.step();
  }
  return { lines: out, ram: Array.from({ length: 0x80 }, (_, a) => m.ram[SM5A.cell(a)]), ops };
}

const chunks = lines => { const h = []; for (let i = 0; i < lines.length; i += CHUNK) h.push(crypto.createHash('sha1').update(lines.slice(i, i + CHUNK).join('\n')).digest('hex').slice(0, 16)); return h; };

const LUA = `
local plan = {}
for f, name, v in string.gmatch(os.getenv("CHECK_PLAN"), "(%d+) (%a+) (%d)") do plan[#plan + 1] = {tonumber(f), name, tonumber(v)} end
local FIELDS = {time = {":IN.0", "Time"}, b = {":IN.0", "Game B"}, a = {":IN.0", "Game A"}, right = {":BA"}, left = {":B"}}
local log = io.open(os.getenv("CHECK_EVENTS"), "w")
local n, started, dbg = 0, false, nil
local function field(p, name) for k, f in pairs(manager.machine.ioport.ports[p].fields) do if name == nil or k == name then return f end end end
local function cycles() dbg:command('printf "%d",totalcycles'); local cl = dbg.consolelog; return cl[#cl] end
emu.register_periodic(function()
  if started then return end
  started = true
  dbg = manager.machine.debugger
  dbg:command('trace ' .. os.getenv("CHECK_TRACE") .. ',maincpu,noloop,{tracelog "%X %X %X %X ",acc,bl,bm,c}')
end)
emu.register_frame_done(function()
  n = n + 1
  for _, e in ipairs(plan) do
    if e[1] == n then
      local c = cycles()
      local fd = FIELDS[e[2]]
      field(fd[1], fd[2]):set_value(e[3])
      log:write(c .. " " .. e[2] .. " " .. e[3] .. "\\n")
    end
  end
  if n == tonumber(os.getenv("CHECK_FRAMES")) then
    local d = manager.machine.devices[":maincpu"].spaces["data"]
    local t = {}
    for a = 0, 0x7f do t[#t + 1] = string.format("%X", d:read_u8(a)) end
    log:write("end " .. cycles() .. " " .. table.concat(t) .. "\\n")
    log:close()
    dbg:command("traceflush")
    manager.machine:exit()
  end
end)
`;

function mame(seed, rom) {
  const dir = path.join(HOME, 'check'), set = path.join(dir, 'roms', 'gnw_ball');
  fs.mkdirSync(set, { recursive: true });
  fs.writeFileSync(path.join(set, 'ac-01'), rom);
  fs.writeFileSync(path.join(set, 'gnw_ball.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1671" height="1080"></svg>\n');
  const lua = path.join(dir, 'check.lua'), trace = path.join(dir, 'trace.txt'), events = path.join(dir, 'events.txt');
  fs.writeFileSync(lua, LUA);
  for (const f of [trace, events]) if (fs.existsSync(f)) fs.unlinkSync(f);
  const plan = presses(seed).map(p => p.join(' ')).join(' ');
  execFileSync(MAME, ['gnw_ball', '-rompath', path.join(dir, 'roms'), '-video', 'none', '-sound', 'none', '-nothrottle',
    '-skip_gameinfo', '-nowriteconfig', '-debug', '-debugger', 'none', '-autoboot_script', lua],
    { cwd: HOME, stdio: ['ignore', 'ignore', 'ignore'], env: Object.assign({}, process.env, { CHECK_PLAN: plan, CHECK_TRACE: trace, CHECK_EVENTS: events, CHECK_FRAMES: String(FRAMES) }) });
  const ev = fs.readFileSync(events, 'utf8').trim().split('\n');
  const last = ev.pop().split(' ');
  const lines = fs.readFileSync(trace, 'utf8').split('\n').filter(l => /^[0-9A-F]+ /.test(l)).map(l => l.trim().split(/\s+/).slice(0, 5).join(' '));
  return {
    events: ev.map(l => { const p = l.split(' '); return [+p[0], p[1], +p[2]]; }),
    end: +last[1], ram: last[2].split('').map(c => parseInt(c, 16)), lines,
  };
}

function main() {
  if (process.argv.includes('-h') || process.argv.includes('--help')) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 19).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); return 0; }
  if (!fs.existsSync(MAME)) { console.log('FAIL no MAME at ' + path.relative(ROOT, MAME) + ': python3 kit/scripts/tools.py get-mame'); return 1; }
  const record = process.argv.includes('--record'), fixture = { about: 'MAME 0.289\'s trace of seeded random programs on its SM5A, made by kit/gnw/check_machine.js --record', frames: FRAMES, chunk: CHUNK, programs: [] };
  let fails = 0;
  const ops = new Set();
  const only = process.argv.includes('--seeds') ? process.argv[process.argv.indexOf('--seeds') + 1].split(',').map(Number) : SEEDS;
  if (record && only !== SEEDS) { console.log('FAIL --record takes every program'); return 1; }
  for (const seed of only) {
    const rom = program(seed), got = mame(seed, rom);
    // MAME's trace starts at the second instruction: its first runs before the script's first call
    const mine = model(rom, got.events, got.end);
    mine.ops.forEach(o => ops.add(o));
    const off = mine.lines[0] === got.lines[0] ? 0 : 1;
    let i = 0;
    while (i < got.lines.length && mine.lines[i + off] === got.lines[i]) i++;
    const ok = i === got.lines.length, ramOk = mine.ram.every((v, a) => v === got.ram[a]);
    if (!ok || !ramOk) fails++;
    console.log((ok && ramOk ? 'ok   ' : 'FAIL ') + 'program ' + seed + ': ' + got.lines.length.toLocaleString('en-GB') + ' instructions, ' + got.events.length + ' presses' +
      (ok ? '' : '; parts at line ' + i + ': MAME ' + got.lines[i] + ', the kit ' + mine.lines[i + off]) + (ramOk ? '' : '; the data memory differs at the end'));
    fixture.programs.push({ seed, skip: off, events: got.events, end: got.end, lines: got.lines.length, chunks: chunks(got.lines), ram: got.ram.map(v => v.toString(16)).join('') });
  }
  const all = Array.from({ length: 256 }, (_, i) => i).filter(o => o !== 0x5e).concat([0x5e00, 0x5e04]);
  const missing = all.filter(o => !ops.has(o));
  console.log((missing.length ? 'note ' : 'ok   ') + 'opcodes run: ' + (all.length - missing.length) + ' of ' + all.length + (missing.length ? ', not ' + missing.map(o => o.toString(16)).join(' ') : ''));
  if (record) {
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true }); fs.writeFileSync(FIXTURE, JSON.stringify(fixture, null, 1) + '\n'); console.log('wrote ' + path.relative(ROOT, FIXTURE));
    // MAME's disassembly, for kit/gnw/test_sm5a.py to hold kit/cpu/sm5a.py to
    const d = { about: 'MAME 0.289\'s disassembly of programs ' + DASM_SEEDS.join(', ') + ' (kit/gnw/check_machine.js), a hash of each 64 lines', chunk: 64, programs: [] };
    for (const seed of DASM_SEEDS) {
      const lines = mameDasm(program(seed)), h = [];
      for (let i = 0; i < lines.length; i += 64) h.push(crypto.createHash('sha1').update(lines.slice(i, i + 64).join('\n')).digest('hex').slice(0, 16));
      d.programs.push({ seed, lines: lines.length, first: lines.slice(0, 3), chunks: h });
    }
    fs.writeFileSync(DASM, JSON.stringify(d, null, 1) + '\n'); console.log('wrote ' + path.relative(ROOT, DASM));
  }
  console.log(fails ? fails + ' FAILED' : 'the kit\'s SM5A agrees with MAME\'s');
  return fails ? 1 : 0;
}

// MAME's disassembly of a program, each page's 63 steps in the order the chip runs them (step $3F,
// which the counter never reaches, left out), as lines "CB:PM:PL: bytes MNEMONIC operand" with the
// spacing made single. A two-byte instruction on a page's 63rd step takes its second byte from step
// 0, where MAME's CPU reads it (sm510base.cpp, execute_run); MAME's disassembler shows another
// byte there, so that byte and the operand are masked as "~" (kit/gnw/test_sm5a.py masks its own)
const LAST = (() => { let pl = 0; for (let i = 0; i < 62; i++) pl = SM5A.nextPc(pl); return pl; })();   // the 63rd step's PL
function mameDasm(rom) {
  const dir = path.join(HOME, 'check'), set = path.join(dir, 'roms', 'gnw_ball');
  fs.mkdirSync(set, { recursive: true });
  fs.writeFileSync(path.join(set, 'ac-01'), rom);
  fs.writeFileSync(path.join(set, 'gnw_ball.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1671" height="1080"></svg>\n');
  const lua = path.join(dir, 'dasm.lua'), out = path.join(dir, 'dasm.txt');
  const pages = [];
  for (let p = 0; p < SM5A.ROM_SIZE >> 6; p++) pages.push('manager.machine.debugger:command("dasm ' + out + '.' + p + ',' + (p << 6).toString(16) + ',3f")');
  fs.writeFileSync(lua, 'emu.register_periodic(function() ' + pages.join('; ') + '; manager.machine:exit() end)\n');
  for (let p = 0; p < SM5A.ROM_SIZE >> 6; p++) if (fs.existsSync(out + '.' + p)) fs.unlinkSync(out + '.' + p);
  execFileSync(MAME, ['gnw_ball', '-rompath', path.join(dir, 'roms'), '-video', 'none', '-sound', 'none', '-skip_gameinfo', '-nowriteconfig',
    '-debug', '-debugger', 'none', '-autoboot_script', lua], { cwd: HOME, stdio: 'ignore' });
  const text = Array.from({ length: SM5A.ROM_SIZE >> 6 }, (_, p) => fs.readFileSync(out + '.' + p, 'utf8')).join('\n');
  return text.split('\n').map(l => /^\s*(\d+:[0-9A-F]+:[0-9A-F]+):\s+((?:[0-9A-F]{2} )+)\s*(.*)$/.exec(l + ' '))
    .filter(Boolean).map(m => {
      const bytes = m[2].trim().split(' '), last = parseInt(m[1].split(':')[2], 16) === LAST;
      if (last && bytes.length === 2) return m[1] + ': ' + bytes[0] + ' ~ ' + m[3].trim().split(/\s+/)[0] + ' ~';
      return m[1] + ': ' + m[2].trim() + ' ' + m[3].trim().split(/\s+/).join(' ');
    });
}

module.exports = { program, presses, apply, model, chunks, line, mameDasm, DASM_SEEDS };
if (require.main === module) process.exit(main());
