"""Decode Pool of Radiance ECL scripts (port of the How it works page's porDecode)."""
import sys, os, glob

NAMES = ['EXIT', 'GOTO', 'GOSUB', 'COMPARE', 'ADD', 'SUBTRACT', 'DIVIDE', 'MULTIPLY',
  'RANDOM', 'SAVE', 'LOAD CHARACTER', 'LOAD MONSTER', 'SETUP MONSTER', 'APPROACH', 'PICTURE',
  'INPUT NUMBER', 'INPUT STRING', 'PRINT', 'PRINT CLEAR', 'RETURN', 'COMPARE AND', 'VERTICAL MENU',
  'IF EQUAL', 'IF NOT EQUAL', 'IF LESS', 'IF GREATER', 'IF LESS OR EQUAL', 'IF GREATER OR EQUAL',
  'CLEAR MONSTERS', 'PARTY STRENGTH', 'CHECK PARTY', 'ADDRESS OF', 'NEW ECL', 'LOAD FILES',
  'PARTY SURPRISE', 'SURPRISE', 'COMBAT', 'ON GOTO', 'ON GOSUB', 'TREASURE', 'ROB', 'ENCOUNTER MENU',
  'GET TABLE', 'HORIZONTAL MENU', 'PARLAY', 'CALL', 'DAMAGE', 'AND', 'OR', 'SPRITES OFF', 'FIND ITEM',
  'PRINT RETURN', 'CLOCK', 'SAVE TABLE', 'ADD NPC', 'LOAD PIECES', 'PROGRAM', 'WHO', 'DELAY', 'SPELL',
  'PRINT GLYPHS', 'CLEAR BOX']
COUNTS = [0, 1, 1, 2, 3, 3, 3, 3, 2, 2, 1, 3, 2, 0, 1, 2, 2, 1, 1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 2, 1, 3, 2, 4, 0, 0, 0, 8, 3, 13, 3, 0, 6, 1, 5, 3, 3, 0, 1, 0, 1, 3, 1, 3, 1, 1, 0, 3, 1, 0]

def text(b):
    s = ''
    i = 0
    while i + 6 <= len(b) * 8:
        hi = b[i >> 3]; lo = b[(i >> 3) + 1] if (i >> 3) + 1 < len(b) else 0
        c = (((hi << 8) | lo) >> (10 - (i & 7))) & 63
        if c == 0: break
        s += chr(c + 0x40 if c < 32 else c)
        i += 6
    return s

class Op:
    def __init__(s, kind, v): s.kind, s.v = kind, v
    def __repr__(s):
        if s.kind == 0: return str(s.v)
        if s.kind == 0x80: return '"%s"' % s.v
        if s.kind == 1: return '[$%04X]' % s.v
        if s.kind == 2: return '#%d' % s.v
        if s.kind < 0x80: return '[$%04X]w' % s.v
        return '$%04X' % s.v

def decode(b, base=0x9900, start=0, stop_at_bad=True):
    out = []
    i = start
    def operand():
        nonlocal i
        k = b[i]
        if k == 0:
            v = b[i+1]; i += 2; return Op(0, v)
        if k == 0x80:
            n = b[i+1]; v = text(b[i+2:i+2+n]); i += 2 + n; return Op(0x80, v)
        v = b[i+1] | b[i+2] << 8; i += 3; return Op(k, v)
    while i < len(b):
        at = i; cmd = b[i]
        if cmd >= 62:
            if stop_at_bad: break
            i += 1; continue
        i += 1
        ops = []
        n = COUNTS[cmd]
        if cmd == 12: n = 3
        if cmd == 41: n = 14
        if cmd == 54: n = 2
        try:
            if cmd in (21, 43, 37, 38):
                for _ in range(2 if cmd == 21 else 1): ops.append(operand())
                c = operand(); ops.append(c)
                n = c.v if c.kind == 0 else 0
            for _ in range(n): ops.append(operand())
        except IndexError:
            break
        if i > len(b): break
        out.append((base + at, cmd, ops))
    return out

def load(path):
    d = open(path, 'rb').read()
    return d[0] | d[1] << 8, d[2:]

if __name__ == '__main__':
    for p in sys.argv[1:]:
        _, b = load(p); base = 0x9900
        cmds = decode(b, base)
        end = cmds[-1][0] if cmds else base
        print('; %s base $%04X len %d, decoded to $%04X' % (os.path.basename(p), base, len(b), end))
        for at, cmd, ops in cmds:
            print('$%04X  %s %s' % (at, NAMES[cmd], ', '.join(map(repr, ops))))

def flow(b, base=0x9900):
    """Decode by following control flow from the five entries. Returns {addr: (cmd, ops, next)}."""
    import collections
    seen = {}
    todo = collections.deque([base + 4*k for k in range(5)])
    while todo:
        a = todo.popleft()
        if a in seen or not (base <= a < base + len(b)): continue
        off = a - base
        r = decode(b, base, off)
        if not r or r[0][0] != a:
            seen[a] = None; continue
        at, cmd, ops = r[0]
        nxt = r[1][0] if len(r) > 1 else None
        # compute next by re-decoding length
        seen[a] = (cmd, ops)
        tgt = []
        if cmd in (1, 2): tgt.append(ops[0].v)
        if cmd in (37, 38): tgt += [o.v for o in ops[2:]]
        for t in tgt: todo.append(t)
        term = cmd in (0, 1, 19, 32, 56)
        if not term:
            # next address: length of this command
            ln = cmd_len(b, off)
            todo.append(a + ln)
            if 22 <= cmd <= 27:
                ln2 = cmd_len(b, off + ln)
                if ln2: todo.append(a + ln + ln2)
    return {k: v for k, v in seen.items() if v}

def cmd_len(b, off):
    r = decode(b, 0, off)
    if not r: return 0
    if len(r) > 1: return r[1][0] - r[0][0]
    # last command: compute by brute force
    for L in range(1, 300):
        r2 = decode(b[:off+L], 0, off)
        if r2 and r2[0][0] == off: return L
    return 0

def listing(path):
    _, b = load(path)
    f = flow(b)
    lines = []
    prev_end = None
    for a in sorted(f):
        cmd, ops = f[a]
        if prev_end is not None and a != prev_end:
            lines.append('        ; ...')
        lines.append('$%04X  %s %s' % (a, NAMES[cmd], ', '.join(map(repr, ops))))
        prev_end = a + cmd_len(b, a - 0x9900)
    return lines
