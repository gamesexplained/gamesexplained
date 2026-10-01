"""Lay Fist II's rooms out as one drawn map, for the Maps and solution tab.

The game has no world map: each room is a strip of columns, and its exits
say where they lead and at which column you arrive. The coordinates do not
agree across rooms (a ladder at column 98 can arrive at column 54), so the
map is a drawing, not a survey. This script places every room the way a
hand-drawn map would: rooms joined by walking off an edge sit side by side
on one row; a ladder or stairs up puts the room above, down or a fall puts
it below, with the two exits' columns lined up where there is room. When
the spot is taken it moves the room sideways or a row further on, whichever
is the smaller change.

Reads ../listing.json. Prints the layout as JSON, {room: [x, row]}: x is
the world column of the room's column 0, row 0 holds room 94 and rows
above it are negative. levels.html carries a copy as LAYOUT.

  python3 maplayout.py > layout.json
"""
import json, os
from collections import deque, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
d = bytearray(65536)
for r in json.load(open(os.path.join(HERE, '..', 'listing.json')))['records']:
    if r.get('b'): d[r['a']:r['a'] + len(r['b'])] = bytes(r['b'])

a = 0x4AEC; ex = {}
for s in range(123):
    L = []
    while d[a]: L.append(tuple(d[a:a + 4])); a += 4
    a += 1; ex[s] = L
area = lambda r: d[0x4A71 + r]
ptr = [d[0x501E + 2 * i] | d[0x501F + 2 * i] << 8 for i in range(105)]
def items(r):
    i = r if r < 0x3C else area(r) + d[0x501D]
    a, e = ptr[i], ptr[i + 1]; out = []
    while a < e:
        if d[a] & 0x40: out.append((d[a], d[a + 1])); a += 2
        else: out.append((d[a], d[a + 1])); a += 3
    return out
BWL = list(d[0xABD:0xAC7])   # barrier_width_l: how far the view reaches past a wall
def bounds(r):
    # the columns the screen can show: walls stop the scroll (find_room_barriers, $087A)
    ws = [(c, b & 15) for b, c in items(r) if b & 0x80]
    cols = [e[1] for e in ex[r]] or [20]
    L = [c - BWL[t] for c, t in ws if c <= min(cols)]
    R = [c + BWL[t] for c, t in ws if c >= max(cols)]
    return max(max(L) if L else 0, 0), (min(R) if R else max(cols) + 21)

EDGE = {18: 1, 19: -1, 12: -1}          # walk off the right or the left edge
UP = {2, 4, 10, 14, 20, 3, 5}           # stick up (ladders, stairs); the rest go down or fall
links = [(r,) + e for r in range(123) for e in ex[r] if e[2] < 123]

# chains of rooms joined edge to edge, each with its own column offset
adj = defaultdict(list)
for r, t, c, v, dc in links:
    if t in EDGE:
        dx = c - dc + 3 * EDGE[t]
        adj[r].append((v, dx)); adj[v].append((r, -dx))
chain, off, members = {}, {}, defaultdict(list)
for s in range(123):
    if s in chain: continue
    chain[s] = s; off[s] = 0; members[s].append(s); q = deque([s])
    while q:
        u = q.popleft()
        for v, dx in adj[u]:
            if v not in chain: chain[v] = s; off[v] = off[u] + dx; members[s].append(v); q.append(v)
B = {r: bounds(r) for r in range(123)}
def span(ch): return min(off[m] + B[m][0] for m in members[ch]), max(off[m] + B[m][1] for m in members[ch])

pos, occ = {}, defaultdict(list)
def free(ch, X, row):
    a, b = span(ch); a += X - 6; b += X + 6
    return all(b <= c or a >= e for c, e in occ[row])
def put(ch, X, row):
    pos[ch] = (X, row); a, b = span(ch); occ[row].append((a + X, b + X))

put(chain[94], 0, 0); q = deque([chain[94]])
vert = [l for l in links if l[1] not in EDGE]
while q:
    cu = q.popleft()
    for r, t, c, v, dc in vert:
        if chain[r] == cu and chain[v] not in pos: a, b, sgn = r, v, (-1 if t in UP else 1)
        elif chain[v] == cu and chain[r] not in pos: a, b, sgn = v, r, (1 if t in UP else -1); c, dc = dc, c
        else: continue
        X = pos[chain[a]][0] + off[a] + c - off[b] - dc; row = pos[chain[a]][1] + sgn
        best = None
        for k in range(12):                       # a row further costs as much as 120 columns sideways
            for dx in sorted(range(-400, 401, 4), key=abs):
                if best and k * 120 + abs(dx) >= best[0]: break
                if free(chain[b], X + dx, row + sgn * k): best = (k * 120 + abs(dx), X + dx, row + sgn * k); break
        put(chain[b], best[1], best[2]); q.append(chain[b])

# rooms 37, 66 and 67 have no exits in or out, so they are not on the map
print(json.dumps({r: [pos[chain[r]][0] + off[r], pos[chain[r]][1]] for r in range(123) if chain[r] in pos}, separators=(',', ':')))
