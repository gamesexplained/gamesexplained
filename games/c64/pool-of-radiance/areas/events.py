"""Find what each square of each map does: the events of the area scripts.

  python3 areas/events.py [--json out.json] [--map 0D] [--dump]

Reads the area scripts (ECLnn) and maps (GEOnn) from the game's disks, as
`work/files/<disk side>/` holds them after extraction (gitignored). For every
square, facing and Search setting it runs the part of the script the module
runs when the party arrives on a square (the script's first two entries,
before the step and on arrival) with a small interpreter that executes only
what decides where to go: jumps, comparisons, sums and tables. It stops at the
first command the party would see or feel (a text, a menu, a picture, a fight,
treasure, damage) and records that address as the square's event. Then it
walks every path from that address without running it, collecting what the
event can show: the texts, the menus, the fights, the treasure, the damage,
the passwords asked for and the exits.

The game state is the first visit: every flag 0, the clock at ten in the
morning, a party that is standing. Events that the flags hide on a first
visit, or that only a later visit shows, are found when the walk from another
event reaches them, but are not tied to a square.
"""
import os, sys, json, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
FILES = os.path.join(GAME, 'work', 'files')
sys.path.insert(0, HERE)
import ecl
import highlights

# Which script runs on which map: the map's own number, except these.
SCRIPT_OF_MAP = {0x1E: 0x10, 0x1F: 0x18, 0x20: 0x1D}

# Every script that loads a map: the town's halls run on the town's map, and
# the castle's scripts choose their map by the way the party faces as it
# enters (LOAD FILES from a table by FACING: ECL03 3 5 5 3, ECL05 3 5 6 6).
LAYERS = {0x00: [0x00, 0x08, 0x0B], 0x03: [0x03, 0x05], 0x05: [0x05, 0x03], 0x06: [0x06, 0x05]}

# The places the scripts name, by script number, for the exits.
PLACES = {0x00: 'New Phlan', 0x01: "the buccaneers' base", 0x02: 'the Cadorna Textile House',
          0x03: 'Valjevo Castle, the grounds', 0x04: 'Valjevo Castle, the barracks', 0x05: 'Valjevo Castle, the hedge maze',
          0x06: 'Valjevo Castle, the bailey', 0x07: 'Valjevo Castle, the keep', 0x08: 'the city hall',
          0x09: 'Stojanow Gate', 0x0A: 'Valhingen Graveyard', 0x0B: 'the training hall', 0x0D: 'the kobold caves',
          0x0E: 'Kovel Mansion', 0x0F: "Mendor's library", 0x10: "the lizard men's keep", 0x11: 'the nomad camp',
          0x12: 'Podol Plaza', 0x13: "the silver dragon's cave", 0x14: 'the slums', 0x15: 'Sokal Keep',
          0x16: "the pyramid's upper level", 0x17: "the pyramid's lower level", 0x18: 'the Temple of Bane quarter',
          0x19: 'the wilderness to the west', 0x1A: 'the wilderness to the east', 0x1B: 'the wilderness to the north',
          0x1C: 'Zhentil Outpost', 0x1D: "Kuto's Well", 0x1E: 'the demonstration'}

X, Y, FACING, WALLAHEAD, SQBYTE = 0xC04B, 0xC04C, 0xC04D, 0xC04E, 0xC04F
SEARCH, HOUR, MAP, IS3D = 0x6DCA, 0x49C9, 0x49C5, 0x49E6
PREVX, PREVY, PREVECL, PARTYSIZE = 0x49F0, 0x49F1, 0x49F2, 0x6E3E
M_STATUS = 0x6C00

# Flags a map needs before its squares do anything: New Phlan waits for the
# tour of the town (G0C5), and a wilderness script runs its small 3D map only
# while G09E is 255 (its overland squares otherwise).
SETUP = {0x00: {0x4AC5: 1}, 0x19: {0x4A9E: 255}, 0x1A: {0x4A9E: 255}, 0x1B: {0x4A9E: 255}}

# Commands the interpreter runs: they decide, the party sees nothing.
RUN = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 22, 23, 24, 25, 26, 27, 29, 30, 31, 34, 35,
       37, 38, 42, 45, 47, 48, 49, 51, 52, 53, 58, 61}
AHEAD = [(0, -1), (1, 0), (0, 1), (-1, 0)]


def find(name):
    for p in sorted(glob.glob(os.path.join(FILES, '*', name))):
        return p, os.path.basename(os.path.dirname(p))
    return None, None


def disk_label(side):
    # disk1_of_4_Side_A -> 1A
    return side[4] + side[-1]


def monster_name(n, side):
    p = os.path.join(FILES, side, 'MON%02X' % n)
    if not os.path.exists(p):
        return None
    d = open(p, 'rb').read()[2:]
    return d.split(b'\0')[0].decode('latin-1').strip()


class Script:
    def __init__(s, path):
        s.load, s.b = ecl.load(path)
        s.base = 0x9900
        s.cache = {}
        s.callers = collections.Counter()
        for a, (cmd, ops) in ecl.flow(s.b).items():
            if cmd == 2:
                s.callers[ops[0].v] += 1
            if cmd == 38:
                for o in ops[2:]:
                    s.callers[o.v] += 1
        # a subroutine called from three places or more is the area's common stock
        s.shared = {a for a, k in s.callers.items() if k >= 3}

    def at(s, a):
        if a not in s.cache:
            r = ecl.decode(s.b, s.base, a - s.base) if s.base <= a < s.base + len(s.b) else []
            if not r or r[0][0] != a:
                s.cache[a] = None
            else:
                cmd, ops = r[0][1], r[0][2]
                s.cache[a] = (cmd, ops, a + ecl.cmd_len(s.b, a - s.base))
        return s.cache[a]


def housekeeping(cmd, ops):
    """Commands the party sees nothing of: a blank text, the picture taken away."""
    if cmd in (17, 18) and ops and ops[0].kind == 0x80 and not ops[0].v.strip():
        return True
    if cmd == 14 and ops and ops[0].kind == 0 and ops[0].v == 255:
        return True
    return cmd in (28, 55)


class Stop(Exception):
    pass


def run(sc, entry, mem, roll=1, limit=4000, info=None):
    """Run from an entry until something visible: returns its address, or None.
    roll says what RANDOM n gives: 0 the lowest, 2 the highest, 1 the middle.
    info, a dict, gets 'handler': where the script's dispatch on the square's
    event number went (its first ON GOTO of four places or more)."""
    def rd(a):
        if sc.base <= a < sc.base + len(sc.b):
            return sc.b[a - sc.base]
        return mem.get(a, 0)

    def val(o):
        if o.kind == 0 or o.kind == 2:
            return o.v
        if o.kind == 1:
            return rd(o.v)
        if o.kind < 0x80:
            return rd(o.v) | rd(o.v + 1) << 8
        if o.kind == 0x80:
            raise Stop
        return o.v

    def wr(o, v):
        a = o.v
        mem[a] = v & 255
        if 2 < o.kind < 0x80:
            mem[a + 1] = v >> 8 & 255

    def addr(o):
        # a table's base: the operand's own address, or a plain number
        return o.v if o.kind in (0, 1, 2) or o.kind >= 0x81 else val(o)

    def cmp(a, b):
        return 'lt' if a < b else 'eq' if a == b else 'gt'

    pc, stack, flag = entry, [], 'eq'
    for _ in range(limit):
        c = sc.at(pc)
        if c is None:
            return None
        cmd, ops, nxt = c
        if cmd == 0:
            return None
        if cmd not in RUN and not housekeeping(cmd, ops):
            return pc
        try:
            if cmd == 1:
                pc = ops[0].v; continue
            if cmd == 2:
                stack.append(nxt); pc = ops[0].v; continue
            if cmd == 19:
                if not stack:
                    return None
                pc = stack.pop(); continue
            if cmd == 3:
                flag = cmp(val(ops[0]), val(ops[1]))
            elif cmd == 20:
                flag = cmp(val(ops[2]), val(ops[3])) if val(ops[0]) == val(ops[1]) else 'ne'
            elif 22 <= cmd <= 27:
                ok = {22: flag == 'eq', 23: flag != 'eq', 24: flag == 'lt', 25: flag == 'gt',
                      26: flag in ('lt', 'eq'), 27: flag in ('gt', 'eq')}[cmd]
                if not ok:
                    c2 = sc.at(nxt)
                    if c2 is None:
                        return None
                    nxt = c2[2]
            elif cmd == 4:
                wr(ops[2], val(ops[0]) + val(ops[1]))
            elif cmd == 5:
                wr(ops[2], val(ops[1]) - val(ops[0]))
            elif cmd == 6:
                d = val(ops[1]); wr(ops[2], val(ops[0]) // d if d else 0)
            elif cmd == 7:
                wr(ops[2], val(ops[0]) * val(ops[1]))
            elif cmd == 8:
                n = val(ops[0])
                wr(ops[1], (0, (n + 1) // 2, n)[roll])
            elif cmd == 9:
                if ops[0].kind != 0x80:          # a name kept for a later text: nothing to see yet
                    wr(ops[1], val(ops[0]))
            elif cmd == 42:
                wr(ops[2], rd(addr(ops[0]) + val(ops[1])))
            elif cmd == 53:
                mem[addr(ops[1]) + val(ops[2])] = val(ops[0]) & 255
            elif cmd == 47:
                r = val(ops[0]) & val(ops[1]); wr(ops[2], r); flag = 'eq' if r == 0 else 'gt'
            elif cmd == 48:
                r = val(ops[0]) | val(ops[1]); wr(ops[2], r); flag = 'eq' if r == 0 else 'gt'
            elif cmd == 29:
                wr(ops[0], 30)
            elif cmd in (34, 35):
                mem[0x6DCB] = 0                  # nobody surprised
            elif cmd == 30:
                # field's lowest, highest, average; 0 = nobody matches
                for o, v in zip(ops[2:6], (10, 14, 12, 0)):
                    wr(o, v)
            elif cmd in (37, 38):
                i = val(ops[0])
                if info is not None and 'handler' not in info and len(ops) >= 6:
                    info['handler'] = ops[2 + i].v if i < len(ops) - 2 else None
                if i < len(ops) - 2:
                    if cmd == 38:
                        stack.append(nxt)
                    pc = ops[2 + i].v; continue
        except Stop:
            return pc
        pc = nxt
    return None


def geo_square(g, n):
    d = g[768 + n]
    walls = [g[n] >> 4, g[n] & 15, g[256 + n] >> 4, g[256 + n] & 15]
    return walls, g[512 + n]


def state(sc, g, mapno, n, facing, search):
    mem = {}
    x, y = n & 15, n >> 4
    walls, info = geo_square(g, n)
    dx, dy = AHEAD[facing]
    mem.update({X: x, Y: y, FACING: facing, WALLAHEAD: walls[facing], SQBYTE: info,
                SEARCH: search, HOUR: 10, MAP: mapno, IS3D: 1, PARTYSIZE: 6,
                PREVX: (x - dx) & 15, PREVY: (y - dy) & 15, PREVECL: sc.num})
    for i in range(8):
        mem[M_STATUS + i] = 0
    mem.update(SETUP.get(mapno, {}))
    return mem


def squares(sc, g, mapno, extra):
    """{square: {event address: {(search, facing, roll)}}}; sc.handler gets
    each square's place in the arrival dispatch."""
    sq = {}
    sc.handler = {}
    for n in range(256):
        hits = {}
        info = {}
        mem = state(sc, g, mapno, n, 0, 0)
        mem.update(extra)
        run(sc, 0x9904, mem, 1, info=info)
        if info.get('handler'):
            sc.handler[n] = info['handler']
        for search in (0, 1):
            for facing in range(4):
                for roll in (0, 1, 2):
                    for entry in (0x9900, 0x9904):
                        mem = state(sc, g, mapno, n, facing, search)
                        mem.update(extra)
                        a = run(sc, entry, mem, roll)
                        if a is not None:
                            hits.setdefault(a, set()).add((search, facing, roll))
        if hits:
            sq[n] = hits
    return sq


def flag_writes(sc, start, steps=16):
    """The flags an event sets with plain numbers straight after it shows
    itself, along the path that falls through: how a welcome marks itself seen."""
    out, a = {}, start
    for _ in range(steps):
        c = sc.at(a)
        if c is None:
            break
        cmd, ops, nxt = c
        if cmd in (0, 19, 32, 37, 38, 56):
            break
        if cmd == 9 and ops[0].kind == 0 and 0x4A00 <= ops[1].v < 0x4BC0:
            out.setdefault(ops[1].v, ops[0].v)
        if cmd == 48 and ops[1].kind == 0 and 0x4A00 <= ops[2].v < 0x4BC0:
            out[ops[2].v] = out.get(ops[2].v, 0) | ops[1].v
        a = ops[0].v if cmd == 1 else nxt
    return out


AREA_WIDE = 40      # squares: an event met on more is the area's, not a square's


def starts_for_map(mapno, e=None):
    gp, gside = find('GEO%02X' % mapno)
    e = SCRIPT_OF_MAP.get(mapno, mapno) if e is None else e
    ep, eside = find('ECL%02X' % e)
    g = open(gp, 'rb').read()[2:]
    sc = Script(ep)
    sc.num = e
    sc.starts, sc.common = set(), set()
    extra, area = {}, {}
    for _ in range(4):
        sq = squares(sc, g, mapno, extra)
        count = collections.Counter(a for h in sq.values() for a in h)
        wide = [a for a, k in count.items() if k > AREA_WIDE]
        changed = False
        for a in wide:
            # a chance met everywhere (a wandering monster) or the area's
            # welcome: note it, then look again as if it had happened
            if a not in area:
                area[a] = sorted(n for n, h in sq.items() if a in h)
            if all(len({k[2] for k in sq[n][a]}) < 3 for n in sq if a in sq[n]):
                continue                    # met only by chance: nothing to mark seen
            w = flag_writes(sc, a)
            for k, v in w.items():
                if extra.get(k) != v:
                    extra[k] = v
                    changed = True
        for n in list(sq):
            for a in wide:
                sq[n].pop(a, None)
            if not sq[n]:
                del sq[n]
        if not changed:
            break
    return sc, eside, sq, area


# ---- the walk: what an event can show ----------------------------------------

SHOW = {17: 'text', 18: 'text'}


def describe(sc, side, start, stops, common=frozenset(), max_cmds=900):
    """Every command on every path from start, without entering another event's
    start or code that other events reach too (common), and without descending
    into the area's shared subroutines, which facts() sums up on their own."""
    seen, todo, out = set(), [start], []
    while todo and len(seen) < max_cmds:
        a = todo.pop()
        if a in seen or (a != start and (a in stops or a in common)):
            continue
        c = sc.at(a)
        if c is None:
            continue
        seen.add(a)
        cmd, ops, nxt = c
        out.append((a, cmd, ops))
        nexts = []
        if cmd in (0, 19, 32, 56):
            pass
        elif cmd == 1:
            nexts = [ops[0].v]
        elif cmd == 2:
            nexts = [nxt] if ops[0].v in sc.shared or ops[0].v in common else [ops[0].v, nxt]
        elif cmd in (37, 38):
            nexts = [o.v for o in ops[2:]] + [nxt]
        elif 22 <= cmd <= 27:
            c2 = sc.at(nxt)
            nexts = [nxt] + ([c2[2]] if c2 else [])
        else:
            nexts = [nxt]
        todo.extend(reversed(nexts))
    out.sort()
    return out


def money(ops):
    names = ['copper', 'silver', 'electrum', 'gold', 'platinum', 'gems', 'jewelry']
    parts = []
    for o, nm in zip(ops[:7], names):
        if o.kind in (0, 2) and o.v:
            parts.append('%d %s' % (o.v, nm))
        elif o.kind not in (0, 2):
            parts.append('some %s' % nm)
    it = ops[7]
    if it.kind in (0, 2) and it.v:
        parts.append('items')
    return ', '.join(parts)


def facts(sc, side, cmds):
    """Turn a walk into the facts a reader wants."""
    f = collections.OrderedDict(text=[], menu=[], fight=[], treasure=[], damage=[], password=[],
                                exit=[], npc=[], rob=[], glyphs=0, picture=0, program=[])
    last_input = None
    for a, cmd, ops in cmds:
        if last_input is not None:
            last_input += 1
        if cmd == 2 and (ops[0].v in sc.shared or ops[0].v in sc.common):
            sub = shared_facts(sc, side, ops[0].v)
            if sub is None:
                continue
            # a routine several events share: what it does, not what it says
            for k in ('fight', 'treasure', 'damage', 'password', 'exit', 'npc', 'rob', 'program'):
                for v in sub[k]:
                    if v not in f[k]:
                        f[k].append(v)
            f['glyphs'] += sub['glyphs']
            continue
        if cmd in (17, 18) and ops and ops[0].kind == 0x80:
            t = ops[0].v.strip()
            if t and t not in f['text']:
                f['text'].append(t)
        elif cmd in (21, 43):
            labels = [o.v for o in ops[3:] if o.kind == 0x80] if cmd == 21 else [o.v for o in ops[2:] if o.kind == 0x80]
            if cmd == 21 and ops[1].kind == 0x80:
                labels = [ops[1].v] + labels
            labels = [l for l in labels if not ('PRESS' in l and 'CONTINUE' in l)]
            if labels and labels not in f['menu']:
                f['menu'].append(labels)
        elif cmd == 11 and ops[0].kind == 0:
            nm = monster_name(ops[0].v, side) or 'monster %d' % ops[0].v
            cnt = ops[1].v if ops[1].kind in (0, 2) else None
            item = (nm, cnt)
            if item not in f['fight']:
                f['fight'].append(item)
        elif cmd == 39:
            m = money(ops)
            if m and m not in f['treasure']:
                f['treasure'].append(m)
        elif cmd == 46:
            how, cnt, sides, bonus = [o.v if o.kind in (0, 2) else None for o in ops[:4]]
            if how is None:
                continue
            dice = ('%dd%d' % (cnt, sides) if cnt and sides and sides > 1 else str(cnt or 0)) if cnt is not None and sides is not None else '?'
            if bonus:
                dice = dice + '+%d' % bonus if dice != '1' else str(1 + bonus)
            if how & 128:
                who = 'everyone' if how & 64 else 'one member'
                save = 'no save' if how & 32 else 'a saving throw avoids it'
                d = '%s loses %s hit points, %s' % (who, dice, save)
            else:
                d = '%d blow%s of %s hit points' % (how & 127, '' if (how & 127) == 1 else 's', dice)
            if d not in f['damage']:
                f['damage'].append(d)
        elif cmd == 16:
            last_input = 0
        elif cmd == 3 or (cmd == 9 and last_input is not None and last_input < 6):
            # the word a typed answer is held to, kept or compared just after it
            for o in ops:
                if o.kind == 0x80 and o.v.strip() and o.v not in f['password']:
                    f['password'].append(o.v)
        elif cmd == 32 and ops[0].kind == 0:
            if ops[0].v not in f['exit']:
                f['exit'].append(ops[0].v)
        elif cmd == 54 and ops[0].kind == 0:
            nm = monster_name(ops[0].v, side)
            if nm and nm not in f['npc']:
                f['npc'].append(nm)
        elif cmd == 40:
            f['rob'].append(1)
        elif cmd == 60:
            f['glyphs'] += 1
        elif cmd == 14:
            f['picture'] += 1
        elif cmd == 56 and ops[0].kind == 0:
            f['program'].append(ops[0].v)
    return f


def shared_facts(sc, side, a):
    memo = sc.__dict__.setdefault('memo', {})
    if a in memo:
        return memo[a]
    memo[a] = None                      # a routine that reaches itself again adds nothing more
    memo[a] = facts(sc, side, describe(sc, side, a, sc.starts))
    return memo[a]


def map_events(mapno, e=None):
    sc, side, sq, area = starts_for_map(mapno, e)
    starts = sorted({a for h in sq.values() for a in h} | set(area))
    sc.starts, sc.common = set(starts), set()
    # code that two events or more reach belongs to none of them
    reach = collections.Counter()
    for a in starts:
        for b, _, _ in describe(sc, side, a, sc.starts):
            reach[b] += 1
    sc.common = {b for b, k in reach.items() if k >= 2} - sc.starts
    events = []
    for a in starts:
        walk = describe(sc, side, a, sc.starts, sc.common)
        events.append((a, facts(sc, side, walk)))
    # what a square's part of the script holds besides what a first visit
    # meets: other times of day, later in the story, after an alarm
    handlers = set(sc.handler.values())
    sc.later = {}
    for h in sorted(handlers):
        if h in sc.starts:
            continue
        walk = describe(sc, side, h, (handlers - {h}) | sc.starts, sc.common)
        f = facts(sc, side, walk)
        if any(f[k] for k in ('text', 'fight', 'treasure', 'damage', 'password', 'exit', 'npc')):
            sc.later[h] = f
    sc.area = area
    return sc, side, sq, events


def readable(t):
    """A text worth showing a reader: not a fragment the script joins to a name."""
    t = t.strip()
    return len(t) >= 5 and (t[0].isalpha() or t[0] in "'\"") and not t.endswith(' A') and t not in ('YOU SEE A', 'THE')


def record(f, cap=60):
    """An event as the page keeps it."""
    r = {}
    texts = [t.strip() for t in f['text'] if readable(t)]
    if texts:
        r['t'] = texts[:cap]
        if len(texts) > cap:
            r['more'] = len(texts) - cap
    if f['menu']:
        r['m'] = f['menu'][:4]
    if f['fight']:
        r['f'] = ['%s%s' % (n, ' \u00d7 %d' % c if c and c > 1 else '' if c == 1 else ' (some)') for n, c in f['fight']]
    for k, kk in (('treasure', 'r'), ('damage', 'd'), ('password', 'p'), ('npc', 'n')):
        if f[k]:
            r[kk] = f[k]
    if f['exit']:
        r['x'] = [PLACES.get(x, 'script %02X' % x) for x in f['exit']]
    if f['glyphs']:
        r['g'] = 1
    if f['rob']:
        r['rob'] = 1
    if 8 in f['program']:
        r['end'] = 1
    return r


def export(maps):
    """Every map's layers as the Maps tab draws them."""
    out = {}
    for m in maps:
        layers = []
        for e in LAYERS.get(m, [SCRIPT_OF_MAP.get(m, m)]):
            sc, side, sq, events = map_events(m, e)
            idx, evs = {}, []

            def add(key, f, later=False):
                rec = record(f)
                if not rec:
                    return None
                if later:
                    rec['l'] = 1
                if key not in idx:
                    idx[key] = len(evs)
                    evs.append(rec)
                return idx[key]

            squares = {}
            for a, f in events:
                if a in sc.area:
                    continue
                i = add(a, f)
                if i is None:
                    continue
                for n, h in sq.items():
                    if a in h:
                        squares.setdefault(n, []).append([i, note(h[a]).strip('[]')])
            for h, f in sc.later.items():
                # only what a first visit to those squares does not show already
                seen = collections.defaultdict(set)
                for a, f0 in events:
                    if any(a in sq.get(n, {}) for n, x in sc.handler.items() if x == h):
                        for k, v in f0.items():
                            if isinstance(v, list):
                                seen[k] |= {json.dumps(x) for x in v}
                f = collections.OrderedDict((k, [x for x in v if json.dumps(x) not in seen[k]] if isinstance(v, list) else v)
                                            for k, v in f.items())
                if not any(f[k] for k in ('text', 'fight', 'treasure', 'damage', 'password', 'exit', 'npc')):
                    continue
                i = add(('later', h), f, True)
                if i is None:
                    continue
                for n, x in sc.handler.items():
                    if x == h:
                        squares.setdefault(n, []).append([i, 'l'])
            area = []
            for a, f in events:
                if a in sc.area:
                    i = add(a, f)
                    if i is not None:
                        area.append(i)
            hl = []
            for hm, hs, frag, kind, title, text in highlights.H:
                if hm != '%02X' % m or hs != '%02X' % e:
                    continue
                hit = {n for n, v in squares.items() for i, _ in v if frag in json.dumps(evs[i])}
                if not hit and not any(frag in json.dumps(evs[i]) for i in area):
                    raise SystemExit('highlight %r on GEO%s (ECL%s) matches no event' % (frag, hm, hs))
                hl.append({'k': kind, 'h': title, 'd': text, 'sq': sorted(hit)})
            layers.append({'s': '%02X' % e, 'place': PLACES.get(e, ''), 'sq': {str(n): v for n, v in sorted(squares.items())},
                           'ev': evs, 'area': area, 'hl': hl})
        out['%02X' % m] = layers
    return out


def note(keys):
    """How a square's event is met: s with Search only, ? by chance, a facing."""
    searches = {k[0] for k in keys}
    full = {(k[0], k[1]) for k in keys if all((k[0], k[1], r) in keys for r in (0, 1, 2))}
    t = ''
    if searches == {1}:
        t += 's'
    if not full:
        t += '?'
    facings = {k[1] for k in keys}
    if len(facings) < 4:
        t += ''.join('NESW'[f] for f in sorted(facings))
    return t and '[' + t + ']'


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--map', help='one map, in hex')
    ap.add_argument('--json', help='write the events of every map here')
    ap.add_argument('--dump', action='store_true', help='print every event')
    ap.add_argument('--page', help="write the events into this page's por-events block (levels.html)")
    a = ap.parse_args()
    maps = [int(a.map, 16)] if a.map else sorted(int(os.path.basename(p)[3:], 16) for p in glob.glob(os.path.join(FILES, '*', 'GEO*')))
    if a.page:
        data = export(maps)
        page = open(a.page).read()
        head, tail = '/* por-events */\n', '// end of por-events'
        i, j = page.index(head) + len(head), page.index(tail)
        block = ('// What each square of each map does, by the script that runs it, from areas/events.py:\n'
                 '// per map a layer for each script that loads it; sq: square -> [[event, how]], how holding\n'
                 '// s (Search on only), ? (by chance), l (another time or later), N E S W (facings);\n'
                 '// ev: t texts, m menus, f fights, r treasure, d damage, p words checked, x exits, n joins,\n'
                 '// g runes shown, rob, end; area: events met anywhere on the map; hl: highlights.\n'
                 'const POR_EVENTS = ' + json.dumps(data, separators=(',', ':')) + ';\n')
        open(a.page, 'w').write(page[:i] + block + page[j:])
        print('%s: %d bytes of events' % (a.page, len(block)))
        return
    if a.json:
        data = export(maps)
        with open(a.json, 'w') as fh:
            json.dump(data, fh, separators=(',', ':'))
        print('%s: %d maps, %d bytes' % (a.json, len(data), os.path.getsize(a.json)))
        return
    for m in maps:
        sc, side, sq, events = map_events(m)
        print('GEO%02X (%s): %d squares with events, %d events, %d area-wide' % (m, disk_label(side), len(sq), len(events), len(sc.area)))
        if a.dump:
            for h, f in sc.later.items():
                where = sorted(n for n, x in sc.handler.items() if x == h)
                print('  LATER $%04X squares %s' % (h, ' '.join('%d,%d' % (n & 15, n >> 4) for n in where[:16])))
                for k, v in f.items():
                    if v:
                        print('     %s: %s' % (k, v if k != 'text' else ' | '.join(t[:70] for t in v[:6])))
            for addr, f in events:
                where = sorted(n for n, h in sq.items() if addr in h)
                tag = ' AREA-WIDE (%d squares)' % len(sc.area[addr]) if addr in sc.area else ''
                print('  $%04X%s squares %s' % (addr, tag, ' '.join('%d,%d%s' % (n & 15, n >> 4, note(sq[n][addr])) for n in where[:16])))
                for k, v in f.items():
                    if v:
                        print('     %s: %s' % (k, v if k != 'text' else ' | '.join(t[:70] for t in v[:6])))


if __name__ == '__main__':
    main()
