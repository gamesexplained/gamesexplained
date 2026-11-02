"""Replay a recorded route (route-<name>.json) from its first snapshot and check every milestone:
at the same frame of the replay, the player must be in the same room at the same clock.
Milestones are checked by frame count: the driver merges runs of frames in the log, so a
milestone's log position can fall inside a merged run, while its frame cannot.
python3 route_replay.py [route.json]
It needs VICE started through kit/scripts/tools.py and the hand-over snapshot (work/entry.vsf)
in its snapshot folder as detective-entry; kit/c64/vice.py snapshot_load() copies it there."""
import sys, json
sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', '..', '..', 'kit', 'c64'))
import vice
from vice import connect, read_mem, call, pause, snapshot_load, clear_checkpoints, arm, hit_counts
rpc = connect()
import os
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'route.json')))
log = d['log']
mem = lambda a, n=1: bytes(read_mem(rpc, a, n, 'ram'))
seen, todo = set(), []
for m in d['milestones']:
    if m[2] not in seen: seen.add(m[2]); todo.append(m)
todo.sort(key=lambda m: m[0])
total = len(todo)
clear_checkpoints(rpc)
bad, fr = 0, 0

def check():
    global bad
    while todo and todo[0][0] == fr:
        m = todo.pop(0)
        r, c = mem(0x48)[0], mem(0x1EBD, 5).decode('latin1')
        good = (r, c) == (m[3], m[4]); bad += not good
        print('%-6s frame %6d  %-45s room %2d %s (recorded room %2d %s)' % ('ok' if good else 'DIFFER', m[0], m[2], r, c, m[3], m[4]), flush=True)

for op in log:
    k = op[0]
    if k == 'load':
        snapshot_load(rpc, op[1]); pause(rpc); clear_checkpoints(rpc); arm(rpc, 0xBCEB, stop=False)
    elif k == 'j': vice.joy(rpc, 2, op[1])
    elif k == 'f':
        n = op[1]
        while n:
            step = todo[0][0] - fr if todo and fr < todo[0][0] <= fr + n else n
            vice.frames(rpc, step); fr += step; n -= step
            check()
    elif k == 's': call(rpc, 'vice_execution_step', {'count': op[1]})
    elif k == 'kd': vice.key_down(rpc, op[1])
    elif k == 'ku': vice.key_up(rpc, op[1])
ev = [3, 4, 6, 7, 8, 12, 21, 29, 32, 49]
win = hit_counts(rpc).get(0xBCEB, 0)
print('evidence in the envelopes:', sum(mem(0x1DAC + o)[0] == 0xC0 for o in ev), 'of 10; the win branch $BCEB ran', win, 'times')
print('milestones differing:', bad, 'of', total, '; not reached:', len(todo))
sys.exit(1 if bad or todo or not win else 0)
