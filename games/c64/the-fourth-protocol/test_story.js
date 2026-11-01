#!/usr/bin/env node
// Hold episode one's story-lines on the page (nato-documents.html's tfp-story block, TFP_STORY) against the
// episode's own code, run on the kit's simulator over episode one's listing.
// - Each story-line's fixed starts: init_events, init_targets and init_stories run from nothing;
//   the events they put in the four lists ($1000-$151F) must be the page's starts, and each
//   target's day (byte 15 of its record at $1603) the page's day its watchers can first find
//   something, for the targets the page names.
// - Each step and choice that names a routine: the routine runs with the memory the step pokes
//   first (set), the day at 5 unless set, and the answers it gives to ask_options and ask_word, in
//   order (ans). Hooks stand in for what it calls and record it in order: post_item (an item in a
//   tray), schedule_event and schedule_in (an event on a day, or in some days), add_prestige,
//   add_progress, set_target_day and set_target_day_in (a target's watchers), set_phone_until and
//   phone_for_days (a number answering). The countdown to the win and the fingerprint found are
//   recorded when they change. The operating system's entries return at once, past the bytes some
//   functions take after the call, and wait_seconds and print_text return at once. The record must be the step's
//   fx, the effects the page prints.
// - Progress: the progress in the steps on the best path, with each decision's best choice, adds
//   up to 100, the most ASSESSMENT can show.
// - The ending: day_clock at the end of day 40 wins with the countdown running and loses without;
//   with the countdown at 1 it wins on any day. plumb_questions starts the countdown only with all
//   six answers right and the fingerprint found, and brings memo 41 otherwise. The routine for
//   call 12 (Plumb's question) left ringing is an RTS, so the call never comes back.
// - A tray holding 48 items stops the machine at the 49th (post_item's DEBUG ERROR).
// It exits 1 on any difference. Required by a script, it gives run(step) and the listing instead.
//   node games/c64/the-fourth-protocol/test_story.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const L = g.listing('parts/nato-documents/listing.json');
const OS = g.listing('parts/resident/listing.json');
const S = (name) => {
  if (typeof name === 'number') return name;
  if (/^\$[0-9A-F]{4}$/.test(name)) return parseInt(name.slice(1), 16);
  const a = L.sym(name); if (a === undefined) throw new Error('no symbol ' + name); return a;
};

// The OS functions that take bytes after the call, and how many: each such routine loads the count
// and calls os_inline_args before its first branch or return.
const INLINE = {};
const len = (op) => (op & 0x0F) === 0x08 || (op & 0x0F) === 0x0A ? 1 : op === 0x20 || (op & 0x0F) >= 0x0C || (op & 0x1F) === 0x19 ? 3 : 2;
for (let f = 0; f < 0x57; f++) {
  const ad = OS.ram[0xEC22 + 2 * f] | OS.ram[0xEC23 + 2 * f] << 8;
  for (let a = ad, k = 0; k < 8; k++) {
    if (OS.ram[a] === 0xA9 && OS.ram[a + 2] === 0x20 && (OS.ram[a + 3] | OS.ram[a + 4] << 8) === OS.sym('os_inline_args')) { INLINE[f] = OS.ram[a + 1]; break; }
    if ([0x60, 0x40, 0x4C, 0x6C].includes(OS.ram[a]) || (OS.ram[a] & 0x1F) === 0x10) break;   // the function's first stretch ends
    a += len(OS.ram[a]);
  }
}

const ret = (p) => p.m[0x100 + ((p.sp + 1) & 255)] | p.m[0x100 + ((p.sp + 2) & 255)] << 8;
const back = (p, to) => { p.sp = (p.sp + 2) & 255; p.pc = to & 0xFFFF; };
const s8 = (v) => v > 127 ? v - 256 : v, s16 = (v) => v > 32767 ? v - 65536 : v;

// run({ at, set, ans, until }) -> the effects in order, as the page writes them
function run(step, base) {
  const m = (base || L.ram).slice(), fx = [], ans = (step.ans || []).slice();
  m[S('day')] = 5;
  for (const [k, v] of Object.entries(step.set || {})) m[S(k)] = v;
  const watch = { countdown: S('win_countdown'), fingerprint: S('fingerprint_found') }, was = {};
  for (const [k, a] of Object.entries(watch)) was[k] = m[a];
  const io = { read() { return 0; }, write() {} };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  const args = (p, n) => { const at = ret(p) + 1; return [at, Array.from(p.m.slice(at, at + n))]; };
  const answer = (p, what) => {
    if (!ans.length) throw new Error(`${step.name || step.at}: ${what} asked with no answer left`);
    p.a = ans.shift(); p.z = p.a === 0 ? 1 : 0; p.n = p.a >> 7;
  };
  let lastDay = -1;
  const hooks = {
    [S('post_item')]: (p) => { fx.push(['item', p.x, p.a]); p.rts(); },
    [S('schedule_event')]: (p) => { const [at, [l, e, d]] = args(p, 3); fx.push(['on', l, e, d]); back(p, at + 3); },
    [S('schedule_in')]: (p) => { const [at, [l, e, d]] = args(p, 3); fx.push(['in', l, e, d]); back(p, at + 3); },
    [S('add_prestige')]: (p) => { fx.push(['prestige', s16(p.x | p.y << 8)]); p.rts(); },
    [S('add_progress')]: (p) => { fx.push(['progress', p.a]); p.rts(); },
    [S('set_target_day')]: (p) => { fx.push(['target', p.x, p.a]); p.rts(); },
    [S('set_target_day_in')]: (p) => { fx.push(['target in', p.x, p.a]); p.rts(); },
    [S('set_phone_until')]: (p) => { fx.push(['phone', p.x, p.a]); p.rts(); },
    [S('phone_for_days')]: (p) => { fx.push(['phone for', p.x, p.a]); p.rts(); },
    [S('ask_options')]: (p) => { const [at] = args(p, 3); answer(p, 'a question'); back(p, at + 3); },
    [S('ask_word')]: (p) => { answer(p, 'a word'); p.rts(); },
    [S('wait_seconds')]: (p) => { p.rts(); },
    [S('print_text')]: (p) => { p.rts(); },
    // end_day sets the frame count to just before the day's end; two calls one after the other,
    // as the flight to Stockholm makes, set the same count and cost one day, so they are one effect
    [S('end_day')]: (p) => { if (ret(p) !== lastDay + 3) fx.push(['day']); lastDay = ret(p); p.rts(); },
    0xEC00: (p) => { const n = INLINE[p.a] || 0; const at = ret(p) + 1; p.c = 1; back(p, at + n); },
    0xEC03: (p) => { p.rts(); },
    0xEC09: (p) => { p.rts(); },
    0xEC06: (p) => { let at = ret(p) + 1; while (p.m[at]) at++; back(p, at + 1); },
    0xEC0C: (p) => { let at = ret(p) + 1; while (p.m[at]) at++; back(p, at + 1); },
  };
  for (const [r, v] of Object.entries(step.ret || {})) hooks[S(r)] = (p) => { p.a = v; p.z = v === 0 ? 1 : 0; p.n = v >> 7; p.rts(); };
  // a run that stops where it started stops when it comes back there
  const entry = S(step.at);
  let left = false;
  for (const u of [].concat(step.until || [])) hooks[S(u)] = (p) => { if (p.pc === entry && !left) { left = true; return false; } return true; };
  cpu.call(entry, {}, { maxSteps: 2000000, hooks });
  if (ans.length) throw new Error(`${step.name || step.at}: ${ans.length} answers left over`);
  for (const [k, a] of Object.entries(watch)) if (m[a] !== was[k]) fx.push([k, m[a]]);
  return fx;
}

// the four lists and the targets' days after the episode's own set-up
function starts() {
  const m = L.ram.slice();
  const io = { read() { return 0; }, write() {} };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  for (const r of ['init_events', 'init_targets', 'init_stories']) cpu.call(S(r), {}, { maxSteps: 200000 });
  const events = [], days = [];
  for (let l = 0; l < 4; l++) for (let d = 0; d < 41; d++) for (let k = 0; k < 8; k++) {
    const e = m[0x1000 + l * 328 + d * 8 + k];
    if (e !== 0xFF) events.push([l, e, d]);
  }
  for (let t = 0; t < 16; t++) days.push(m[0x1603 + 16 * t + 15]);
  return { events, days };
}

module.exports = { run, starts, L, S, INLINE };
if (require.main !== module) return;

const page = process.argv[2] || 'nato-documents.html';
const { TFP_STORY } = g.run(page, 'tfp-story', 'TFP_STORY');
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const { events, days } = starts();
const want = TFP_STORY.flatMap((s) => s.starts || []).map((e) => e.join()).sort();
const got = events.map((e) => e.join()).sort();
if (!same(want, got)) fail('the starts', want.join(' '), '| the game:', got.join(' '));
for (const s of TFP_STORY) for (const [t, d] of s.watch || []) if (days[t] !== d) fail(s.name, 'target', t, 'from day', d, '| the game:', days[t]);

let steps = 0, progress = 0;
for (const s of TFP_STORY) for (const st of s.steps) {
  if (st.name && S(st.name) !== st.at) fail(s.name, st.name, 'is not at', st.at.toString(16));
  for (const c of st.choices || [st]) {
    if (c.at === undefined) continue;
    if (c.name && S(c.name) !== c.at) fail(s.name, c.name, 'is not at', c.at.toString(16));
    let fx;
    try { fx = run(c); } catch (e) { fail(s.name, c.name || c.at, e.message); continue; }
    steps++;
    if (!same(fx, c.fx)) fail(s.name, c.name || c.at.toString(16), JSON.stringify(c.fx), '| the game:', JSON.stringify(fx));
  }
  if (st.path === false) continue;
  const on = st.choices ? st.choices.filter((c) => c.best) : [st];
  for (const c of on) for (const [k, v] of c.fx || []) if (k === 'progress') progress += v;
}
if (progress !== 100) fail('the best path makes', progress, 'per cent of progress, not 100');

// the ending
const clock = (day, countdown) => {
  const m = L.ram.slice();
  m[S('day')] = day; m[S('win_countdown')] = countdown;
  m[S('frame_count')] = 0x3F; m[S('frame_count_high')] = 0x38;            // one frame before the day ends
  let end = '';
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read() { return 0; }, write() {} } });
  cpu.call(S('day_clock'), {}, { maxSteps: 200000, hooks: {
    [S('game_won')]: () => { end = 'won'; return true; }, [S('game_lost')]: () => { end = 'lost'; return true; },
    [S('draw_calendar')]: (p) => p.rts(), [S('run_todays_events')]: (p) => p.rts(),
    [S('daily_surveillance')]: (p) => p.rts(), [S('daily_watchers')]: (p) => p.rts() } });
  return end;
};
if (clock(40, 5) !== 'won') fail('day 41 with the countdown running is not won');
if (clock(40, 0xFF) !== 'lost') fail('day 41 without the countdown is not lost');
if (clock(20, 1) !== 'won') fail('the countdown at its end is not won');
if (clock(20, 0xFF) !== '') fail('an ordinary day ends the game');
const right = [0x29, 0x2A, 0x00, 0x0C, 0x2B, 0x2C];
if (!same(run({ at: 'plumb_questions', ans: right, set: { fingerprint_found: 0xFF } }), [['countdown', 10]])) fail('six right answers with the fingerprint do not start the countdown');
if (!same(run({ at: 'plumb_questions', ans: right, set: { fingerprint_found: 0 } }), [['in', 0, 41, 1]])) fail('six right answers without the fingerprint do not bring memo 41');
for (let k = 0; k < 6; k++) {
  const a = right.slice(); a[k] = 0x31;
  if (!same(run({ at: 'plumb_questions', ans: a, set: { fingerprint_found: 0xFF } }), [['in', 0, 41, 1]])) fail('a wrong answer', k + 1, 'does not bring memo 41');
}
const missed = S('missed_call_routines');
if ((L.ram[missed + 24] | L.ram[missed + 25] << 8) !== S('null_routine')) fail('call 12 left ringing does something');
{
  const m = L.ram.slice(); m[S('tray_counts') + 2] = 48;
  let hung = false;
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read() { return 0; }, write() {} } });
  cpu.call(S('post_item'), { a: 0x20, x: 2 }, { maxSteps: 200000, hooks: {
    0xEC00: (p) => { const at = ret(p) + 1; back(p, at + (INLINE[p.a] || 0)); },
    0xEC06: (p) => { let at = ret(p) + 1; while (p.m[at]) at++; back(p, at + 1); },
    [S('phone_check')]: (p) => p.rts(), 0x5F09: () => { hung = true; return true; } } });
  if (!hung) fail('a 49th sitrep does not stop the machine');
}
console.log(`${TFP_STORY.length} story-lines, ${steps} routines run: ` + (bad ? bad + ' differences' : 'every start, step and ending matches episode one\'s code, and the best path makes 100 per cent'));
process.exit(bad ? 1 : 0);
