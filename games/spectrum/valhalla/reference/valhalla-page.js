/* Valhalla: the script every tab of the page shares. The block VH is the ports of the game's
   rules that the tests run; the rest builds the widgets of whichever tab it is on. */
/* VH */
// Ports of the game's own rules, run by the pages and by test_parser.py, test_pictures.py and
// test_cast.py.
const VH = {
  // find_word ($D937) and next_entry ($DA11): word is an array of lower-case character codes,
  // dict the 255 rows of d$ from $AFE8. Returns the row (0 for none) and whether a final "s"
  // was allowed (bit 1 of the editor's flags).
  findWord(word, dict) {
    const len = word.length;
    const wb = i => (i >= 0 && i < len ? word[i] : 0);
    let flags = 0, bestCount = 0, bestCode = 0, entryNo = 0, ent = 0;
    for (;;) {
      let matched = 0, pos = 0, f17 = 0, de = ent;
      const c = dict[de++];
      let hl = 0, best = false, done = false;
      entryNo = (entryNo + 1) & 255;
      for (;;) {
        const e = dict[de] | 0x20;
        let near = false;
        if (matched === len) { if (matched === c) { flags &= ~2; best = true; break; } near = true; }
        else if (matched >= c || pos >= c) near = true;
        if (near) { flags |= 8; if (bestCount >= matched) break;
          if (wb(hl) === 0x73) flags |= 2; else flags &= ~2; best = true; break; }
        if (e === wb(hl)) { hl++; matched++; de++; pos++; continue; }
        if (pos === 0) break;
        const used = flags & 8; flags |= 8;
        if (!used) { de++; pos++; continue; }
        if (matched !== 0 && !(f17 & 8)) { f17 |= 8; if (e === wb(hl - 1)) { de++; pos++; continue; } }
        if (!(f17 & 16)) { hl++; f17 |= 16; if (e === wb(hl)) { matched++; de++; pos++; continue; } }
        if (f17 & 32) break;
        hl++; f17 |= 32;
        if (e === wb(hl)) { matched++; de++; pos++; continue; }
        break;
      }
      if (best) { bestCount = matched; bestCode = entryNo; if (!(flags & 8)) done = true; }
      if (done) return { code: bestCode, finalS: !!(flags & 2) };
      ent += 11; flags &= ~8;
      if (entryNo < 255) continue;
      const diff = Math.abs(bestCount - len);
      return { code: diff < 3 ? bestCode : 0, finalS: !!(flags & 2) };
    }
  },

  // BASIC's RND after RANDOMIZE n: each call makes SEED (75 x (SEED + 1)) mod 65537 - 1.
  rnd(n) {
    let seed = n;
    return () => { seed = (75 * (seed + 1)) % 65537 - 1; return seed / 65536; };
  },

  // The graphics commands lines 7010-7039 send for place h, after mprop (line 3760) has read
  // its terrain te and the terrain to the north tb. ram is the 64 KB image.
  commands(ram, h) {
    const MAP = 0xBF3F, SPECIAL = 0xC64C;
    const m = (h, i) => ram[MAP + 18 * (h - 1) + i - 1];
    const s = (n, i) => ram[SPECIAL + 9 * (n - 1) + i - 1];
    let te = m(h, 1) || 3, sp = 0;
    if (te > 128) { sp = te - 128; te = s(sp, 1); }
    let tb = 3;
    if (h <= 72) { tb = m(h + 9, 1); if (tb > 128) tb = s(tb - 128, 1); }
    if (tb === 8) tb = 6;
    if (tb === 0) tb = 3;
    const rnd = VH.rnd(h * 500), fr = x => Math.floor(rnd() * x) + 1;
    const out = [];
    if (h < 46 || [56, 57, 65, 66, 81].includes(h)) out.push([19]);
    out.push([1, h >> 4, h & 15, te, tb]);
    if (te === 8) for (let j = fr(3); j <= 14; j += fr(4) + 1) out.push([18, 11 * 16 + j]);
    const feature = x => {
      if (x) out.push([18, x]);
      if (!x || x > 79) return;
      const p = x >> 4; x &= 15;
      const w = p === 2 ? 5 : 4 + 4 * (p > 0);
      if (p === 4) {
        if (rnd() < 0.5) out.push([18, 160 + x]);
        if (rnd() < 0.25) out.push([18, 112 + x + 1]);
        return;
      }
      for (let k = 1; k <= w; k++) {
        let y = rnd() < 0.5 ? 1 : 0;
        if (p < 2 && k === 2) y = 1;
        if ((p === 1 && (k === 3 || k === 4)) || (p === 3 && k > 3 && k < 7)) continue;
        if (p === 2) { y = 0; if (k === 2 || k === 3) continue; }
        if (p === 3) y = (k === 3 || k === 7) ? 0 : 1;
        if (p === 1 && k === 5) y = 0;
        out.push([18, (10 + y) * 16 + k + x]);
      }
    };
    feature(m(h, 18));
    if (sp) for (let i = 6; i <= 9; i++) feature(s(sp, i));
    return out;
  },

  // A fight, lines 1362-1376. Each side: {str, weapon, slot1, shield, helmet, you}. For the
  // attacker, weapon is the object named with "with"; for the defender it is its slot 1.
  fight(a, d) {
    const score = (str, w) => str + (w > 0) * 40 + (w > 66) * 40;
    let sa = score(a.str, a.weapon), sd = score(d.str, d.weapon);
    const base = [sa, sd];
    const behind = sa < sd ? a : d;
    const armour = (behind.shield ? 32 : 0) + (behind.helmet ? 64 : 0);
    let added = 0;
    if (behind.slot1) { added = armour; if (behind === a) sa += armour; else sd += armour; }
    const attackerWins = !(sa < sd);
    const win = attackerWins ? a : d, lose = attackerWins ? d : a;
    const m = Math.abs(sa - sd);
    let result;
    if (m < 20) result = 'draw';
    else if (!lose.you && m < 64) result = 'defeat';
    else result = 'kill';
    return { base, sa, sd, behind: behind === a ? 'attacker' : 'defender', added, m, result,
             winner: attackerWins ? 'attacker' : 'defender' };
  },
  // The commands line 5105 sends as you arrive at place h, without you: the picture (above), each
  // object lying there that is not in a chest or cupboard (lines 5110-5118; the first chest or
  // cupboard is the picture's own), then each character that is there (5120-5125), at its column
  // and facing. Objects are given facing 1, where line 5118 picks each one's facing at random.
  scene(ram, h) {
    const MAP = 0xBF3F, CHR = 0xBC2B, FACING = 0xC4F7;
    const m = i => ram[MAP + 18 * (h - 1) + i - 1];
    const out = VH.commands(ram, h);
    let ct = 0;
    for (let j = 6; j <= 16; j += 2) {
      const g = m(j), x = m(j + 1);
      if (!g || x === 255) continue;
      if (!ct && (g === 68 || g === 73)) { ct = g; continue; }
      out.push([2, g, x, 0, 1]);
    }
    for (let n = 2; n <= 39; n++) {
      const row = CHR + 20 * (n - 1);
      if (ram[row + 12] === h) out.push([2, n, ram[row + 13], 0, ram[FACING + 5 * (n - 1) + 2]]);
    }
    return out;
  },

  // "who" (lines 6210-6235): names[j] is the name of the character in column j, 0 to 31, or
  // nothing. Each name goes under its figure behind an up arrow, or before one at the right edge,
  // and a name that would overlap the one before starts a new line.
  who(names) {
    const blank = ' '.repeat(32), lines = [];
    let x = blank, p = 0;
    for (let j = 1; j <= 32; j++) {
      if (!names[j - 1]) continue;
      let q = j, z = '^' + names[j - 1];
      if (q + z.length > 33) { z = z.slice(1) + '^'; q = j - z.length + 1; }
      if (q < p) { lines.push(x); x = blank; p = 0; }
      x = (x.slice(0, q - 1) + z).padEnd(32).slice(0, 32);
      p = q + z.length;
    }
    if (p) lines.push(x);
    return lines.map(l => l.replace(/ +$/, ''));
  },

  // How far apart two characters are in goodness, FN f (line 59), and what a gap leads to.
  gap: (g1, g2) => Math.abs(g1 - g2),
  attacks: gap => gap >= 7,                 // line 4410: the one it likes less
  gives: gap => gap <= 3,                   // line 4510: the one it likes more
  follows: gap => gap < 5 || gap > 11,      // line 4010: from the place you just left
  // Line 210: told to act by an asker of this charisma, a character always refuses at this gap;
  // otherwise one time in three.
  alwaysRefuses: (gap, charisma) => gap - charisma / 2 > 2,
  // Lines 1129 and 1830: the least a character sells an object of this value for, how often it
  // will not sell at all, and what it pays you for one.
  price: (value, gap) => value * (1 + gap / 32),
  noSale: gap => gap > 9 ? (gap - 9) / gap : 0,
  pays: (value, gap) => Math.floor(value * (1 - gap / 32)),

  // Line 1356: after an attack you ordered, one time in two, the attacker's byte 17 (goodness x 16
  // plus charisma) moves a step of 16, up for a victim of goodness under 8, down otherwise. The new
  // byte, or the same byte when the guard keeps it (0, or 255 and over), or 'error B' when it is
  // below 0 and CHR$ stops the program.
  step(byte, victim) {
    const x = (victim < 8 ? 16 : -16) + byte;
    if (x < 0) return 'error B';
    return x && x < 255 ? x : byte;
  },
};
// end of VH

// The widgets of the three tabs. Each runs only on the page that has its elements.
(function () {
  const $ = id => document.getElementById(id);
  const MAP = 0xBF3F, SPEC = 0xC64C, CHR = 0xBC2B, DICT = 0xAFE8, OBJ = 0xBAF7, FIG = 0xE8AA;
  const TERRAIN = ['', 'an icy waste', 'a marsh', 'a plain', 'an area of lakes', 'a forest', 'the mountains', 'a cave', 'a hall'];
  const TNAME = ['', 'icy waste', 'marsh', 'plain', 'lakes', 'forest', 'mountains', 'cave', 'hall'];
  const TCOL = ['#ffffff', '#e8eff5', '#a9bf9a', '#d9e2a2', '#9cc3e6', '#6fa36a', '#b9ada1', '#857466', '#d9b37a'];
  const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const STEP = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const FEAT = ['a castle', 'a castle', 'a castle', 'a castle', 'a hut', 'a shut cupboard', 'an open cupboard',
    "a hut's door", 'a shut chest', 'an open chest', 'a window', 'a tall window', 'a gate', 'a black sky', 'dark buildings'];
  const SHAPE = ['person', 'dwarf', 'dragon', 'giant', 'wolf', 'snake', 'raven'];
  const CLASS = { 1: 'a name or object', 2: 'a verb', 3: 'a preposition', 5: 'passed over', 6: 'a swear word', 7: 'a game command' };
  let ram = null;

  const pic = new Image();
  pic.src = 'reference/pictures.png';

  function need(msg) {
    document.querySelectorAll('.vh-need').forEach(el => {
      const p = document.createElement('p'); p.className = 'vh-note'; p.textContent = msg; el.before(p);
    });
  }

  // The data, as the tape loads it.
  const word = n => { const a = DICT + 11 * (n - 1); let s = ''; for (let i = 1; i <= ram[a]; i++) { const b = ram[a + i]; s += b >= 32 && b < 127 ? String.fromCharCode(b) : ' '; } return s; };
  const wclass = n => ram[DICT + 11 * (n - 1) + 10];
  const m = (h, i) => ram[MAP + 18 * (h - 1) + i - 1];
  const sp$ = (n, i) => ram[SPEC + 9 * (n - 1) + i - 1];
  const c = (n, i) => ram[CHR + 20 * (n - 1) + i - 1];
  const p$ = (n, i) => ram[OBJ + 3 * (n - 1) + i - 1];
  const the = n => n <= 39 || /^[A-Z]/.test(word(n)) ? word(n) : 'the ' + word(n);
  const world = h => h <= 45 ? 'Hell' : ((h - 1) % 9 > 4 ? 'Asgard' : 'Midgard');

  function place(h) {
    let te = m(h, 1) || 3, sp = 0, o1 = 0, o2 = 0, k = 0, name = '';
    if (te > 128) {
      sp = te - 128; te = sp$(sp, 1); o1 = sp$(sp, 3); o2 = sp$(sp, 4); k = sp$(sp, 5);
      if (sp$(sp, 2)) name = word(sp$(sp, 2));
    }
    const exits = [], extra = [];
    for (let j = 0; j < 8; j++) {
      if (m(h, 2) >> (7 - j) & 1) exits.push(j);
      if (sp && (k >> (7 - j) & 1)) extra.push(j);
    }
    const objects = [];
    for (let i = 6; i <= 16; i += 2) if (m(h, i)) objects.push([m(h, i), m(h, i + 1)]);
    let desc = 'You are in ';
    if (name) desc += name + (name.length > 1 && name[name.length - 2] === "'" ? ' hall' : '') + ', which is in ';
    if (te < 8) desc += TERRAIN[te] + ' in ';
    desc += world(h) + '.';
    return { h, te, sp, o1, o2, name, exits, extra, objects, desc, ring: m(h, 3), crowns: m(h, 4) * 256 + m(h, 5), feature: m(h, 18) };
  }
  const nb = (h, j) => { const x = (h - 1) % 9 + STEP[j][0], y = Math.floor((h - 1) / 9) + STEP[j][1]; return x < 0 || x > 8 || y < 0 || y > 8 ? 0 : y * 9 + x + 1; };

  function drawMap(cv, sel, route) {
    const g = cv.getContext('2d'), S = 44;
    g.clearRect(0, 0, cv.width, cv.height);
    g.font = '10px "IBM Plex Mono", monospace';
    for (let h = 1; h <= 81; h++) {
      const P = place(h), x = (h - 1) % 9 * S, y = (8 - Math.floor((h - 1) / 9)) * S;
      g.fillStyle = TCOL[P.te] || '#fff'; g.fillRect(x + 1, y + 1, S - 2, S - 2);
      if (P.sp) { g.strokeStyle = '#2f3136'; g.lineWidth = 3; g.strokeRect(x + 2.5, y + 2.5, S - 5, S - 5); }
      g.fillStyle = P.te === 7 || P.te === 5 ? '#fff' : '#2f3136';
      g.fillText(h, x + 5, y + 13);
      if (P.ring) { g.fillStyle = '#c25a00'; g.fillText('→' + P.ring, x + S - 4 - g.measureText('→' + P.ring).width, y + S - 5); }
    }
    g.lineCap = 'round';
    for (let h = 1; h <= 81; h++) {
      const P = place(h), cx = (h - 1) % 9 * S + S / 2, cy = (8 - Math.floor((h - 1) / 9)) * S + S / 2;
      const one = (j, dash) => {
        if (!nb(h, j)) return;
        g.setLineDash(dash ? [3, 3] : []); g.strokeStyle = dash ? '#4a5bd6' : '#2f3136'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + STEP[j][0] * S / 2, cy - STEP[j][1] * S / 2); g.stroke();
      };
      P.exits.forEach(j => one(j, false));
      P.extra.forEach(j => { if (!P.exits.includes(j)) one(j, true); });
    }
    g.setLineDash([]);
    if (route) {
      g.strokeStyle = '#c25a00'; g.lineWidth = 4; g.globalAlpha = .75;
      const ctr = h => [(h - 1) % 9 * S + S / 2, (8 - Math.floor((h - 1) / 9)) * S + S / 2];
      for (let i = 1; i <= route.at; i++) {
        const [a, b] = [ctr(route.path[i - 1]), ctr(route.path[i])];
        g.setLineDash(route.jump[i] ? [6, 5] : []);
        g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
      }
      g.setLineDash([]); g.globalAlpha = 1;
    }
    if (!sel) return;
    const x = (sel - 1) % 9 * S, y = (8 - Math.floor((sel - 1) / 9)) * S;
    g.strokeStyle = '#c25a00'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, S - 3, S - 3);
  }

  function drawPic(cv, h) {
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const go = () => g.drawImage(pic, (h - 1) % 9 * 256, (8 - Math.floor((h - 1) / 9)) * 128, 256, 128, 0, 0, 512, 256);
    if (pic.complete && pic.naturalWidth) go(); else pic.addEventListener('load', go, { once: true });
  }

  function pick(sel, n, set) {
    const pk = sel.closest('.pick');
    pk.querySelectorAll('.step').forEach(b => b.addEventListener('click', () => {
      const i = Math.min(n - 1, Math.max(0, sel.selectedIndex + +b.dataset.d)); sel.selectedIndex = i; set(i);
    }));
    sel.addEventListener('change', () => set(sel.selectedIndex));
  }

  // Maps: the map, the picture and the commands.
  function mapWidget() {
    const sel = $('vh-loc');
    for (let h = 1; h <= 81; h++) {
      const P = place(h), o = document.createElement('option');
      o.textContent = h + ' · ' + (P.name ? P.name + ', ' : '') + TNAME[P.te] + ', ' + world(h);
      sel.append(o);
    }
    const kv = (k, v) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>';
    const show = h => {
      const P = place(h);
      sel.selectedIndex = h - 1;
      drawMap($('vh-map'), h);
      drawPic($('vh-pic'), h);
      $('vh-desc').textContent = P.desc;
      const who = [];
      for (let n = 2; n <= 39; n++) if (c(n, 13) === h) who.push(word(n));
      let rows = kv('Exits', P.exits.map(j => DIRS[j]).join(', ') || 'none');
      if (P.extra.length) {
        const cond = [P.o1 ? 'with ' + (P.o1 <= 39 ? word(P.o1) + ' here' : the(P.o1) + ' carried or here') : '',
                      P.o2 ? 'not with ' + (P.o2 <= 39 ? word(P.o2) + ' here' : the(P.o2) + ' carried or here') : ''].filter(Boolean).join(' and ');
        rows += kv('Extra exits', P.extra.map(j => DIRS[j]).join(', ') + (cond ? ', ' + cond : ''));
      }
      if (P.ring) rows += kv('Ringway', 'to ' + P.ring + ', with a ring');
      if (P.crowns) rows += kv('Crowns', P.crowns);
      if (P.objects.length) rows += kv('Objects', P.objects.map(([o, col]) => the(o) + (col === 255 ? ' (in the container)' : '')).join(', '));
      if (who.length) rows += kv('Starts here', who.join(', '));
      rows += kv('Row', '<code>$' + (MAP + 18 * (h - 1)).toString(16).toUpperCase() + '</code>' + (P.sp ? ', special place ' + P.sp + ' at <code>$' + (SPEC + 9 * (P.sp - 1)).toString(16).toUpperCase() + '</code>' : ''));
      $('vh-info').innerHTML = rows;
      // 03
      const cmds = VH.commands(ram, h);
      $('vh-cmdh').textContent = 'Place ' + h + ': ' + cmds.length + ' commands';
      $('vh-cmdn').textContent = 'RANDOMIZE ' + h * 500 + ' before the windows. The machine code seeds its own generator from ' + h + '.';
      $('vh-cmds').innerHTML = cmds.map(k => {
        let t = '[' + k.join(', ') + '] ';
        if (k[0] === 19) t += 'dark buildings: red on black';
        else if (k[0] === 1) t += 'the place: ' + TNAME[k[3]] + ', looking north at ' + (k[4] >= 6 ? 'mountains' : TNAME[k[4]]);
        else t += FEAT[k[1] >> 4] + ' at column ' + 2 * (k[1] & 15);
        return '<li>' + t + '</li>';
      }).join('');
    };
    pick(sel, 81, i => show(i + 1));
    $('vh-map').addEventListener('click', e => {
      const r = $('vh-map').getBoundingClientRect(), S = r.width / 9;
      const x = Math.floor((e.clientX - r.left) / S), y = 8 - Math.floor((e.clientY - r.top) / S);
      if (x >= 0 && x < 9 && y >= 0 && y < 9) show(y * 9 + x + 1);
    });
    show(71);
  }

  // How it works: fights and weapons.
  function fightWidget() {
    const objs = [];
    for (let n = 63; n <= 97; n++) { const w = word(n); if (w && (n < 88 || n === 96) && n !== 68 && n !== 73) objs.push(n); }
    const fill = (sel, list, none) => { sel.innerHTML = (none ? '<option value="0">nothing</option>' : '') + list.map(n => '<option value="' + n + '">' + (n <= 39 ? word(n) : the(n)) + '</option>').join(''); };
    const people = []; for (let n = 1; n <= 39; n++) people.push(n);
    fill($('vh-fa'), people); fill($('vh-fd'), people); fill($('vh-faw'), objs, true); fill($('vh-fdw'), objs, true);
    const full = n => (c(n, 18) >> 4) * 16 + 15;
    const setFrom = (side, n) => {
      $('vh-f' + side + 's').value = n === 1 ? 175 : full(n);
      if (side === 'd') $('vh-fdw').value = c(n, 1);
      else $('vh-fa1').checked = !!c(n, 1);
      $('vh-f' + side + 'sh').checked = !!c(n, 2); $('vh-f' + side + 'he').checked = !!c(n, 3);
    };
    const run = () => {
      const an = +$('vh-fa').value, dn = +$('vh-fd').value;
      const A = { str: +$('vh-fas').value, weapon: +$('vh-faw').value, slot1: $('vh-fa1').checked, shield: $('vh-fash').checked, helmet: $('vh-fahe').checked, you: an === 1 };
      const D = { str: +$('vh-fds').value, weapon: +$('vh-fdw').value, slot1: +$('vh-fdw').value > 0, shield: $('vh-fdsh').checked, helmet: $('vh-fdhe').checked, you: dn === 1 };
      const r = VH.fight(A, D), wi = r.winner === 'attacker' ? an : dn, li = r.winner === 'attacker' ? dn : an;
      const name = n => n === 1 ? 'You' : word(n), obj = n => n === 1 ? 'you' : word(n), verb = (n, v) => n === 1 ? v : v + 's';
      const wn = name(wi), ln = obj(li);
      let t = 'Scores ' + r.base[0] + ' and ' + r.base[1];
      t += r.added ? '; the ' + r.behind + ', behind, adds ' + r.added + ' for its armour: ' + r.sa + ' and ' + r.sd + '. ' : '. ';
      t += 'The difference is ' + r.m + '. ';
      if (r.result === 'draw') t += '<b>"The fight is drawn."</b> Both lose 32 strength.';
      else if (r.result === 'defeat') t += '<b>"' + wn + ' ' + verb(wi, 'defeat') + ' ' + ln + '."</b> ' + wn + ' ' + verb(wi, 'lose') + ' 32 strength, ' + ln + ' 64, and ' + ln + ' goes off to a random place.';
      else t += '<b>"' + wn + ' ' + verb(wi, 'kill') + ' ' + ln + '."</b> ' + wn + ' ' + verb(wi, 'lose') + ' 32 strength.' + (r.m < 64 ? ' A loss of 20 or more by you is always death.' : '');
      $('vh-fout').innerHTML = t;
    };
    ['vh-fas', 'vh-faw', 'vh-fa1', 'vh-fash', 'vh-fahe', 'vh-fds', 'vh-fdw', 'vh-fdsh', 'vh-fdhe'].forEach(id => $(id).addEventListener('input', run));
    $('vh-fa').addEventListener('change', () => { setFrom('a', +$('vh-fa').value); run(); });
    $('vh-fd').addEventListener('change', () => { setFrom('d', +$('vh-fd').value); run(); });
    const IDUN = 14;
    const live = [['against Idun at 175', 175, 0, '"The fight is drawn."'], ['against Idun at 215', 215, 0, '"Idun kills you."'], ['against Idun at 135', 135, 0, '"You defeat Idun."'],
                  ['with food against Idun at 215', 215, 96, '"You defeat Idun."'], ['with the axe against Idun at 215', 215, 63, '"The fight is drawn."']];
    live.forEach(([label, s, w, seen]) => {
      const b = document.createElement('button'); b.className = 'vh-btn'; b.textContent = 'You ' + label;
      b.addEventListener('click', () => {
        $('vh-fa').value = 1; setFrom('a', 1); $('vh-faw').value = w;
        $('vh-fd').value = IDUN; setFrom('d', IDUN); $('vh-fds').value = s;
        run(); $('vh-fout').innerHTML += ' <span class="vh-note">The emulator said ' + seen + '</span>';
      });
      $('vh-presets').append(b);
    });
    $('vh-fa').value = 1; setFrom('a', 1); $('vh-fd').value = 4; setFrom('d', 4); run();
    // 05: the weapons table
    $('vh-weap').innerHTML = '<tr><th>No.</th><th>Object</th><th>In a fight</th><th>Thrown</th></tr>' + objs.map(n => {
      const thrown = { 67: 10, 69: 10, 63: 20, 64: 20, 66: 30, 87: 40 }[n] || 2;
      return '<tr' + (n > 66 ? ' class="vh-yes"' : '') + '><td class="vh-n">' + n + '</td><td>' + word(n) + '</td><td class="vh-n">+' + (n > 66 ? 80 : 40) + '</td><td class="vh-n">' + thrown + '</td></tr>';
    }).join('');
  }

  // How it works: the spelling checker.
  function typeWidget() {
    const dict = ram.subarray(DICT, DICT + 255 * 11 + 16);
    const run = () => {
      const line = $('vh-type').value, out = [];
      let w = '', num = '', bad = false;
      const end = () => {
        if (num) { out.push('<div class="vh-word"><div class="vh-typed">' + num + '</div><div class="vh-meta">a number</div></div>'); num = ''; }
        if (!w) return;
        const lw = w.toLowerCase();
        if (bad) { out.push('<div class="vh-word"><div class="vh-typed">' + w + '</div><div class="vh-meta">not read: the line stopped at the red word</div></div>'); w = ''; return; }
        const r = VH.findWord(Array.from(lw, ch => ch.charCodeAt(0)), dict);
        if (!r.code) { bad = true; out.push('<div class="vh-word vh-bad"><div class="vh-typed">' + w + '</div><div class="vh-meta">not in the dictionary: shown in red</div></div>'); }
        else {
          const t = word(r.code), same = t.toLowerCase() === lw || (r.finalS && t.toLowerCase() + 's' === lw);
          out.push('<div class="vh-word"><div class="vh-typed">' + w + '</div><div>row ' + r.code + ': <b>' + t + '</b>' + (r.finalS ? ' + s' : '') + '</div><div class="vh-meta">' +
            (CLASS[wclass(r.code)] || 'class ' + wclass(r.code)) + (same ? '' : ', with one letter forgiven') + '</div></div>');
        }
        w = '';
      };
      for (const ch of line) {
        if (/[a-z]/i.test(ch)) w += ch;
        else if (/[0-9]/.test(ch)) num += ch;
        else end();
      }
      end();
      $('vh-words').innerHTML = out.join('');
    };
    $('vh-type').addEventListener('input', run);
    run();
  }

  // Maps: the route to Felstrong, walked in the emulator.
  function routeWidget() {
    const steps = [['the start', 71], ['west', 70], ['west', 69], ['jump', 51], ['west', 50], ['jump', 21], ['northeast', 31], ['north', 40], ['jump', 6]];
    const sel = $('vh-route');
    steps.forEach(([cmd, h], i) => { const o = document.createElement('option'); o.textContent = i ? i + ' · ' + cmd + ' to ' + h : '0 · Valheim, place 71'; sel.append(o); });
    const route = { path: steps.map(s => s[1]), jump: steps.map(s => s[0] === 'jump'), at: 0 };
    const show = i => {
      route.at = i; sel.selectedIndex = i;
      const h = steps[i][1];
      drawMap($('vh-rmap'), h, route); drawPic($('vh-rpic'), h);
      $('vh-rdesc').textContent = (i ? '> ' + steps[i][0] + '\n' : '') + place(h).desc + (h === 6 ? ' Felstrong is in the cupboard.' : '');
    };
    pick(sel, steps.length, show);
    show(0);
    const Q = [['Ofnir', 73, ''], ['Felstrong', 6, ''], ['Drapnir', 37, 'Ofnir'], ['Skornir', 4, 'Ofnir, Drapnir'], ['Skalir', 44, 'Ofnir, Skornir'],
               ['Grimnir', 81, 'Felstrong, Skalir, Skornir'], ['Valhalla', 80, 'Grimnir (from 71 north or 79 east)']];
    $('vh-quests').innerHTML = '<tr><th>Goal</th><th>Place</th><th>Strength to open</th><th>Needs first</th></tr>' + Q.map(([q, h, n]) => {
      const sp = m(h, 1) > 128 ? m(h, 1) - 128 : 0;
      return '<tr><td>' + q + '</td><td class="vh-n">' + h + '</td><td class="vh-n">' + (q === 'Valhalla' ? '' : (35 - sp) * 6) + '</td><td>' + (n || 'nothing') + '</td></tr>';
    }).join('');
  }

  // How it works: money.
  function moneyWidget() {
    const sel = $('vh-mwho');
    for (let n = 1; n <= 39; n++) { const o = document.createElement('option'); o.value = n; o.textContent = word(n) + ' (' + n + ')'; sel.append(o); }
    const run = () => {
      const n = +sel.value, a = +$('vh-mamt').value;
      $('vh-mout').innerHTML = 'Meant to add ' + a + '. Line 3410 adds <b>' + n + '</b>, ' + word(n) + "'s own number" + (a > n ? ', and ' + (a - n) + ' crowns are gone.' : '.');
    };
    sel.addEventListener('change', run); $('vh-mamt').addEventListener('input', run);
    run();
  }

  // Maps: help.
  function helpWidget() {
    const rows = [];
    for (let sp = 1; sp <= 36; sp++) {
      let h = 0; for (let x = 1; x <= 81; x++) if (m(x, 1) === 128 + sp) h = x;
      const o1 = sp$(sp, 3), o2 = sp$(sp, 4), k = sp$(sp, 5);
      const dirs = DIRS.filter((d, j) => k >> (7 - j) & 1);
      if (!dirs.length) continue;
      const need = n => n <= 39 ? word(n) + ' here' : the(n);
      const says = o1 && o2 ? 'nothing about these exits' : o1 ? 'what they need' : o2 ? '"You can go ...", as if they were open' : 'that they are open';
      rows.push('<tr' + (o2 ? ' class="vh-yes"' : '') + '><td class="vh-n">' + h + '</td><td>' + (sp$(sp, 2) ? word(sp$(sp, 2)) : '') + '</td><td>' + dirs.join(', ') +
        '</td><td>' + (o1 ? need(o1) : '') + '</td><td>' + (o2 ? need(o2) : '') + '</td><td>' + says + '</td></tr>');
    }
    $('vh-help').innerHTML = '<tr><th>Place</th><th>Name</th><th>Extra exits</th><th>Need</th><th>Forbid</th><th>help says</th></tr>' + rows.join('');
  }

  // How it works: sound.
  function soundWidget() {
    let ac = null;
    const beep = seq => {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      let t = ac.currentTime + 0.05;
      for (const [f, d, gap] of seq) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'square'; o.frequency.value = f; g.gain.value = 0.12;
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d); t += d + (gap || 0);
      }
    };
    const B = p => 261.63 * Math.pow(2, p / 12);
    const S = [['Key click', [[1000.9, 7 / 1000.9]], '7 cycles at 1001 Hz'], ['Refused key', [[399.9, 40 / 399.9]], '40 cycles at 400 Hz'],
               ["Mary's slap, a thrown object landing", [[B(-10), 0.1]], 'BEEP .1,-10, lines 122, 1484, 1495'],
               ['A chest or cupboard', [[B(-15), 0.05]], 'BEEP .05,-15, line 1980'], ['A blow', [[B(0), 0.01]], 'BEEP .01,0, line 1380'],
               ['A death', [[B(-12), 0.5, 0.04], [B(-12), 0.5, 0.04], [B(-12), 1 / 6, 0.04], [B(-12), 0.5]], 'four BEEPs at -12 with PAUSE 2 between, line 5620']];
    S.forEach(([name, seq, how]) => {
      const b = document.createElement('button'); b.className = 'vh-btn'; b.textContent = name; b.title = how;
      b.addEventListener('click', () => beep(seq)); $('vh-snd').append(b);
    });
  }

  // How it works: the stale editor variables.
  function staleWidget() {
    let s = '';
    for (let a = 0xD1D3; a <= 0xD2B0; a++) { const b = ram[a]; s += b >= 32 && b < 127 ? String.fromCharCode(b) : '·'; }
    const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const at = s.indexOf('quitt');
    $('vh-stale').innerHTML = at < 0 ? esc(s) : esc(s.slice(0, at)) + '<mark>' + esc(s.slice(at, at + 24)) + '</mark>' + esc(s.slice(at + 24));
  }

  // ---- Characters ----

  // The inlay's table (sort, then badness, goodness, charisma, strength, bravery and brains, 1 to 5).
  const INLAY = {
    Gore: 'wolf 4 - 2 3 3 2', Gastro: 'wolf 5 - 2 3 4 4', Frantic: 'wolf 3 - 1 4 5 4', Skadi: 'dragon - 3 5 4 3 1',
    Nasher: 'dragon 5 - 1 2 1 1', Nidhog: 'dragon 3 - 2 4 4 2', Grunt: 'giant 2 - 4 4 5 3', Rankle: 'giant 4 - 1 4 4 4',
    Krank: 'giant 4 - 1 4 5 5', Thudd: 'giant 2 - 2 2 4 3', Gripe: 'giant 3 - 4 4 3 2', Tyr: 'god - 2 3 4 4 1',
    Heimdal: 'god - 2 4 3 2 3', Idun: 'goddess - 5 2 2 2 2', Boldir: 'god - 5 5 4 4 3', Kir: 'god - 4 5 3 4 3',
    Bragi: 'god - 3 2 2 3 3', Kon: 'dwarf 4 - 4 3 1 4', Mary: 'dwarf - 3 1 1 1 3', Klepto: 'dwarf 1 - 4 2 3 5',
    Alvin: 'dwarf - 2 4 2 1 2', Boogi: 'dwarf 1 - 4 1 1 1', Bug: 'dwarf - 2 3 3 3 2', Leer: 'dwarf 3 - 2 3 3 3',
    Snor: 'giant - 1 3 3 1 1', Glut: 'giant - 1 2 3 2 2', Klout: 'giant - 3 2 4 4 2', Drudge: 'giant - 2 1 3 2 1',
    Odin: 'god - 3 5 4 4 5', Saga: 'goddess - 4 5 3 4 5', Loki: 'god 5 - 5 4 4 5', Hel: 'goddess 5 - 3 4 4 5',
    Thor: 'god - 5 4 5 5 2', Talis: 'goddess - 2 5 3 3 4', Od: 'god - 4 3 1 1 5', Mistra: 'goddess - 1 5 3 3 3',
  };
  const figs = new Image();
  figs.src = 'reference/figures.png';
  const castPic = new Image();
  castPic.src = 'reference/cast.png';
  const whenLoaded = (img, f) => { if (img.complete && img.naturalWidth) f(); else img.addEventListener('load', f, { once: true }); };
  function drawFig(cv, n, s) {
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    whenLoaded(figs, () => { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(figs, (n - 1) * 40, 0, 40, 24, 0, 0, 40 * s, 24 * s); });
  }
  const goodness = n => c(n, 17) >> 4, charisma = n => c(n, 17) & 15;
  const strength = n => c(n, 18) >> 4, bravery = n => c(n, 18) & 15, brains = n => c(n, 19) >> 4, restless = n => c(n, 19) & 15;
  const starts = () => Array.from(new Set(Array.from({ length: 38 }, (_, i) => c(i + 2, 13)))).sort((a, b) => a - b);
  const placeName = h => { const P = place(h); return 'place ' + h + (P.name ? ', ' + P.name : '') + ' (' + TNAME[P.te] + ', ' + world(h) + ')'; };
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' and ' + a[a.length - 1];
  let youG = 15;
  const onYou = [];
  const setYou = g => { youG = g; onYou.forEach(f => f()); };

  // Who a character would turn on or give things to, of the 38 others, by the gap in goodness.
  function feelings(n) {
    const at = [], gv = [];
    for (let k = 2; k <= 39; k++) {
      if (k === n) continue;
      const f = VH.gap(goodness(n), goodness(k));
      if (VH.attacks(f)) at.push(word(k)); else if (VH.gives(f)) gv.push(word(k));
    }
    return { at, gv };
  }
  // How a character treats you at goodness g (you: charisma 10).
  function towardYou(n, g) {
    const f = VH.gap(g, goodness(n)), r = restless(n);
    return {
      f,
      obeys: VH.alwaysRefuses(f, charisma(1)) ? 'never' : '2 in 3',
      follows: !VH.follows(f) ? '' : r >= 8 ? 'always' : r ? r + ' in 8' : 'never',
      attacks: VH.attacks(f), gives: VH.gives(f),
      price: VH.price(1, f), noSale: VH.noSale(f), pays: VH.pays(100, f) / 100,
    };
  }

  // 01: the cast.
  function castWidget() {
    const grid = $('vh-cast');
    let sel = 4;
    const btns = [];
    for (let n = 1; n <= 39; n++) {
      const b = document.createElement('button');
      b.className = 'vh-who'; b.type = 'button'; b.title = word(n);
      const cv = document.createElement('canvas'); cv.width = 80; cv.height = 48; drawFig(cv, n, 2);
      const t = document.createElement('span'); t.textContent = n === 1 ? 'You' : word(n);
      b.append(cv, t);
      b.addEventListener('click', () => show(n));
      grid.append(b); btns.push(b);
    }
    const places = starts();
    const sceneCv = $('vh-cscene');
    const show = n => {
      sel = n;
      btns.forEach((b, i) => b.setAttribute('aria-pressed', i + 1 === n));
      drawFig($('vh-cfig'), n, 4);
      const nm = n === 1 ? 'You' : word(n), inl = (INLAY[nm] || '').split(' ');
      $('vh-cname').textContent = nm;
      $('vh-csort').textContent = n === 1 ? 'a mortal, character 1' : (inl[0] ? 'a ' + inl[0] + ' on the inlay' : 'not on the inlay') + ', character ' + n;
      const g = goodness(n);
      const good = inl.length > 1 ? (inl[1] !== '-' ? 'badness ' + inl[1] : 'goodness ' + inl[2]) : '';
      const q = [
        ['Goodness', g, good, n === 1 ? 'Moves when you attack someone (line 1356). Everyone else measures you by it.' : 'Decides whom it attacks, whom it gives things to, and whether it will do what you ask (lines 4410, 4510, 210).'],
        ['Charisma', charisma(n), inl[3], 'Gives weight to its orders: the asked refuse when their gap from it, less half this, is over 2 (line 210).'],
        ['Strength', strength(n), inl[4], 'Full strength is 16 times this plus 15: ' + (strength(n) * 16 + 15) + ' (line 63).'],
        ['Bravery', bravery(n), inl[5], 'Nothing. No line reads it.'],
        ['Brains', brains(n), inl[6], n === 1 ? 'Never read for you.' : brains(n) > 7 ? 'Over 7: it does not drop things, and one time in two the one here who tells it what to do is another character (lines 4055, 4057).' : '7 or under: it drops things, and acts on its own (lines 4055, 4310).'],
        ['Restlessness', restless(n), '', n === 1 ? 'Never read for you.' : 'How often it follows you from the place you leave, and how likely it is to be sent on from a crowd (lines 4010, 5518).'],
      ];
      $('vh-cqual').innerHTML = '<tr><th>Quality</th><th>Game</th><th>Inlay</th><th></th><th>What it does</th></tr>' + q.map(([k, v, i, t]) =>
        '<tr><td>' + k + '</td><td class="vh-n">' + v + '</td><td class="vh-n">' + (i && i !== '-' ? i : '') + '</td><td><span class="vh-bar"><span style="width:' + (v / 15 * 100).toFixed(1) + '%"></span></span></td><td>' + t + '</td></tr>').join('');
      const slot = i => c(n, i) ? the(c(n, i)) : 'nothing';
      const rest = []; for (let i = 4; i <= 12; i++) if (c(n, i)) rest.push(word(c(n, i)));
      const counts = {}; rest.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
      const bag = Object.entries(counts).map(([w, k]) => k > 1 ? k + ' × ' + w : w);
      const h = c(n, 13), home = p$(n, 3), crowns = c(n, 15) * 256 + c(n, 16);
      const kv = (k, v) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>';
      let rows = kv('Weapon, shield, helmet', [slot(1), slot(2), slot(3)].join(', ')) + kv('Carries', bag.join(', ') || 'nothing') + kv('Crowns', crowns);
      rows += kv('Starts at', placeName(h) + ', column ' + c(n, 14));
      if (n > 1) rows += kv('Home', home ? (home === h ? 'the same place' : placeName(home)) : 'none');
      rows += kv('Row', '<code>$' + (CHR + 20 * (n - 1)).toString(16).toUpperCase() + '</code>');
      $('vh-ccarry').innerHTML = rows;
      // the place it starts at, as you find it, and "who" there
      const k = places.indexOf(h), g2 = sceneCv.getContext('2d'); g2.imageSmoothingEnabled = false;
      whenLoaded(castPic, () => g2.drawImage(castPic, (k % 9) * 256, Math.floor(k / 9) * 128, 256, 128, 0, 0, 512, 256));
      const cols = new Array(32).fill('');
      for (let m2 = 2; m2 <= 39; m2++) if (c(m2, 13) === h) cols[c(m2, 14)] = word(m2);
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const me = n === 1 ? null : new RegExp('(\\^' + nm + '|' + nm + '\\^)(?![a-z])');
      $('vh-cwho').innerHTML = VH.who(cols).map(l => me && me.test(l) ? esc(l).replace(me, '<b>$1</b>') : esc(l)).join('\n');
      $('vh-cscap').textContent = 'Place ' + h + ' as you arrive at the start, drawn by the game\'s code, and what "who" prints there' + (n === 1 ? ', without you: you come in at a random column.' : '.');
      feel();
    };
    const feel = () => {
      const n = sel;
      if (n === 1) { $('vh-cfeel').innerHTML = '<p>You start at goodness 15, as good as anyone, and every character judges you by the gap between its goodness and yours. Choose a character to see how it treats you, or move your goodness in section 03.</p>'; return; }
      const F = feelings(n), Y = towardYou(n, youG), nm = word(n);
      const yes = [];
      yes.push(Y.obeys === 'never' ? 'refuses whatever you ask' : 'does what you ask 2 times in 3');
      if (Y.follows) yes.push('can follow you (' + Y.follows + ' when its turn comes)'); else yes.push('never follows you');
      if (Y.attacks) yes.push('may attack you');
      if (Y.gives) yes.push('may give you things');
      $('vh-cfeel').innerHTML = '<p><b>' + nm + '</b> is ' + Y.f + ' from you at your goodness of ' + youG + ', and ' + list(yes) + '. It sells for ' + Y.price.toFixed(2) + ' times an object\'s value' + (Y.noSale ? ', and turns you away ' + Math.round(Y.noSale * 100) + ' times in 100' : '') + '.</p>' +
        '<p><span class="vh-tag vh-bad">attacks</span> ' + (F.at.join(', ') || 'nobody') + '</p>' +
        '<p><span class="vh-tag vh-good">gives to</span> ' + (F.gv.join(', ') || 'nobody') + '</p>';
    };
    onYou.push(feel);
    show(sel);
  }

  // 02: the goodness ladder.
  function ladderWidget() {
    const el = $('vh-ladder');
    let sel = 1;
    const draw = () => {
      const gs = n => n === 1 ? youG : goodness(n);
      const g0 = gs(sel);
      let h = '';
      for (let g = 15; g >= 0; g--) {
        const f = Math.abs(g - g0), cls = g === g0 ? 'vh-me' : VH.attacks(f) ? 'vh-bad' : VH.gives(f) ? 'vh-good' : '';
        const who = [];
        for (let n = 1; n <= 39; n++) if (gs(n) === g) who.push('<button type="button" class="vh-chip' + (n === sel ? ' on' : '') + '" data-n="' + n + '">' + (n === 1 ? 'You' : word(n)) + '</button>');
        h += '<div class="vh-rung ' + cls + '"><span class="vh-g">' + g + '</span><span class="vh-gap">' + (g === g0 ? '' : f) + '</span><span class="vh-names">' + who.join('') + '</span></div>';
      }
      el.innerHTML = h;
      el.querySelectorAll('.vh-chip').forEach(b => b.addEventListener('click', () => { sel = +b.dataset.n; draw(); }));
      const F = sel === 1 ? null : feelings(sel);
      const nm = sel === 1 ? 'You' : word(sel);
      $('vh-lnote').textContent = sel === 1
        ? 'You, at goodness ' + youG + '. Red rows may attack you, green rows may give you things.'
        : nm + ', at goodness ' + gs(sel) + ', attacks ' + (F.at.length ? list(F.at) : 'nobody') + ' when its turn picks them, and gives things to ' + (F.gv.length ? list(F.gv) : 'nobody') + '.';
    };
    onYou.push(draw);
    draw();
  }

  // 03: how they treat you.
  function youWidget() {
    const cols = [['n', 'No.'], ['name', 'Name'], ['g', 'Goodness'], ['f', 'Gap'], ['obeys', 'Does what you ask'], ['follows', 'Follows you'],
      ['attacks', 'Attacks you'], ['gives', 'Gives to you'], ['price', 'Sells at'], ['nosale', 'Won\'t sell'], ['pays', 'Pays you']];
    let key = 'n', dir = 1;
    const draw = () => {
      $('vh-goodv').textContent = youG; $('vh-good').value = youG;
      const rows = [];
      for (let n = 2; n <= 39; n++) {
        const Y = towardYou(n, youG);
        rows.push({ n, name: word(n), g: goodness(n), f: Y.f, obeys: Y.obeys, follows: Y.follows || '', attacks: Y.attacks ? 'yes' : '', gives: Y.gives ? 'yes' : '',
          price: '× ' + Y.price.toFixed(2), nosale: Y.noSale ? Math.round(Y.noSale * 100) + ' in 100' : '', pays: '× ' + Y.pays.toFixed(2),
          _p: Y.price, _s: Y.noSale, _y: Y.pays });
      }
      const sortKey = { price: '_p', nosale: '_s', pays: '_y' }[key] || key;
      rows.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : a.n - b.n) * dir);
      $('vh-you').innerHTML = '<tr>' + cols.map(([k, t]) => '<th class="vh-sort" data-k="' + k + '">' + t + '</th>').join('') + '</tr>' +
        rows.map(r => '<tr' + (r.obeys === 'never' ? '' : ' class="vh-yes"') + '>' + cols.map(([k]) =>
          '<td' + (['n', 'g', 'f'].includes(k) ? ' class="vh-n"' : '') + '>' + (k === 'obeys' && r[k] === 'never' ? 'never' : r[k]) + '</td>').join('') + '</tr>').join('');
      $('vh-you').querySelectorAll('th').forEach(th => th.addEventListener('click', () => { dir = key === th.dataset.k ? -dir : 1; key = th.dataset.k; draw(); }));
    };
    $('vh-good').addEventListener('input', () => setYou(+$('vh-good').value));
    onYou.push(draw);
    draw();
  }

  // 05: where everyone lives.
  function homesWidget() {
    const cv = $('vh-hmap'), S = 44;
    const homes = {};
    for (let n = 2; n <= 39; n++) { const h = p$(n, 3); if (h) (homes[h] = homes[h] || []).push(n); }
    const show = h => {
      drawMap(cv, h);
      const g = cv.getContext('2d');
      for (const [hh, ns] of Object.entries(homes)) {
        const x = (hh - 1) % 9 * S, y = (8 - Math.floor((hh - 1) / 9)) * S;
        g.fillStyle = '#c25a00'; g.beginPath(); g.arc(x + S - 11, y + 12, 8, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold 10px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText(ns.length, x + S - 11, y + 15.5); g.textAlign = 'left';
      }
      const ns = homes[h] || [];
      const away = []; for (let n = 2; n <= 39; n++) if (c(n, 13) === h && p$(n, 3) !== h) away.push(word(n));
      $('vh-hinfo').textContent = placeName(h).replace(/^p/, 'P') + ': ' + (ns.length ? 'home to ' + list(ns.map(word)) : 'nobody\'s home') + (away.length ? '; ' + list(away) + ' start' + (away.length > 1 ? '' : 's') + ' here without living here' : '') + '.';
    };
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), s = r.width / 9;
      const x = Math.floor((e.clientX - r.left) / s), y = 8 - Math.floor((e.clientY - r.top) / s);
      if (x >= 0 && x < 9 && y >= 0 && y < 9) show(y * 9 + x + 1);
    });
    show(71);
  }

  const has = id => !!document.getElementById(id);
  if (has('vh-snd')) soundWidget();
  if (typeof Spectrum === 'undefined') { need('This widget reads the game from listing.json and needs the built site.'); return; }
  Spectrum.load('listing.json').then(G => {
    ram = G.ram;
    const run = [['vh-loc', mapWidget], ['vh-fa', fightWidget], ['vh-type', typeWidget], ['vh-route', routeWidget], ['vh-mwho', moneyWidget],
      ['vh-help', helpWidget], ['vh-stale', staleWidget], ['vh-cast', castWidget], ['vh-ladder', ladderWidget], ['vh-you', youWidget],
      ['vh-hmap', homesWidget]];
    for (const [id, f] of run) if (has(id)) f();
  }).catch(e => need('listing.json could not be read: ' + e.message));
})();
