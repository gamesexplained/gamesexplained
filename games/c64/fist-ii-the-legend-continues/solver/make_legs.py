"""Turn the search's hops into drivable legs: add the walks that touch each scroll.

  python3 make_legs.py [hops.json] [legs.json]
      defaults: work/solver/hops.json -> work/solver/legs.json

A leg is [scroll number or 'final', hops]: the route to the scroll's room,
two walk-only hops (type 0) that pass over the scroll, then the route to
its chamber. Walk targets were found live for rooms 44, 84 and 102; the
others use position + 8 then position - 5, which is untested.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), 'work', 'solver')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'hops.json')
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(OUT, 'legs.json')
POS = {1: (102, 180), 2: (91, 152), 3: (114, 110), 4: (84, 124), 5: (107, 143), 6: (110, 140), 7: (118, 212), 8: (44, 175)}
LIVE = {102: (190, 150), 44: (195, 170), 84: (144, 124)}     # walk targets that picked the scroll up
H = json.load(open(src))
legs = []
for sn, p1, p2 in H['legs']:
    r, p = POS[sn]
    a, b = LIVE.get(r, (p + 8, p - 5))
    legs.append([sn, p1 + ([[r, a, 0, r], [r, b, 0, r]] if p1 else []) + p2])
if H.get('final'): legs.append(['final', H['final']])
for leg in legs:      # arriving in room 84 from room 4 carries the hero on to 87: walk right to let it
    out = []
    for i, x in enumerate(leg[1]):
        out.append(x)
        if x[:2] == [4, 128] and i + 1 < len(leg[1]) and leg[1][i + 1][0] == 87: out.append([84, 110, 0, 87])
    leg[1] = out
json.dump(legs, open(dst, 'w'))
for l in legs: print(l[0], len(l[1]), 'hops')
