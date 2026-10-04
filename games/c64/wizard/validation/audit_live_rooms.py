#!/usr/bin/env python3
"""Repeat prepared pickup tests and Madhouse's scan bounds in this clone's VICE.

Usage: KIT_VICE_PORT=6511 python3 .../validation/audit_live_rooms.py [private-dir]
Requires a paused, qualified VICE with no checkpoints. Saves/restores its state.
Private fixture JSON is generated from original code, never committed; no disk I/O
is executed. These are prepared states, not joystick routes or physical collisions.
"""
import json
from pathlib import Path
import subprocess
import sys
import time

GAME = Path(__file__).resolve().parent.parent
ROOT = GAME.parents[2]
WORK = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else GAME / 'work'
sys.path.insert(0, str(ROOT / 'kit/c64'))
from vice import connect, ask, read_mem, snapshot_load, pause


def check(condition, description):
    if not condition:
        raise AssertionError(description)


def main():
    subprocess.run(['node', str(GAME / 'validation/live_room_fixtures.js'), str(WORK)], check=True)
    fixtures = json.loads((WORK / 'audit-live-room-fixtures.json').read_text())
    rpc = connect()
    check(ask(rpc, 'vice_ping', {})['execution'] == 'paused', 'Pause VICE before this test')
    check(not ask(rpc, 'vice_checkpoint_list', {})['checkpoints'], 'Remove existing checkpoints before this test')
    before_pc = ask(rpc, 'vice_registers_get', {})['PC']
    saved = ask(rpc, 'vice_snapshot_save', {'name': 'wizard_audit_restore_' + str(time.time_ns()),
                'include_roms': False, 'include_disks': True})
    results = []

    def write(address, data):
        ask(rpc, 'vice_memory_write', {'address': f'${address:04X}', 'data': list(data)})

    def run(entry, a=0, x=0):
        # Scratch trampoline, original game instructions unchanged; IRQs suppressed.
        write(0x600, [0x20, entry & 255, entry >> 8, 0x4c, 3, 6])
        for register, value in [('PC', 0x600), ('SP', 255), ('A', a), ('X', x), ('Y', 0), ('C', 0), ('D', 0), ('I', 1)]:
            ask(rpc, 'vice_registers_set', {'register': register, 'value': value})
        ask(rpc, 'vice_run_until', {'address': '$0603'})
        end = time.monotonic() + 15
        while ask(rpc, 'vice_ping', {})['execution'] != 'paused' and time.monotonic() < end:
            time.sleep(.02)
        check(ask(rpc, 'vice_ping', {})['execution'] == 'paused', 'Routine did not stop')
        check(ask(rpc, 'vice_registers_get', {})['PC'] == 0x603, 'Unexpected stop')

    try:
        for case in fixtures:
            snapshot_load(rpc, str(WORK / 'play-round1.vsf'))
            check(ask(rpc, 'vice_ping', {})['execution'] == 'paused', 'Snapshot did not remain paused')
            check(ask(rpc, 'vice_registers_get', {})['PC'] == ask(rpc, 'vice_registers_get', {})['PC'], 'Unstable PC')
            initial = case['before']
            write(0xc000, initial['ram']); write(0xd000, initial['vic']); write(0xd800, initial['colors'])
            if case['kind'] == 'pickup':
                address = 0xc400 + case['offset']
                for _ in range(case['repeats']):
                    glyph = read_mem(rpc, address, 1)[0]
                    check(28 <= glyph <= 31, 'Missing regenerated treasure')
                    write(0xfb, [address & 255, address >> 8]); write(0xc031, [0x12, 0x12]); write(0xc02a, [0])
                    run(0x7ace, glyph)
            else:
                run(0xc376, x=case.get('index', 0))
            after = case['after']
            for key, address, size, mask in [('screen', 0xc400, 880, 255), ('font', 0xc800, 2048, 255),
                    ('colors', 0xd800, 880, 15), ('actors', 0xc370, 6, 255), ('header', 0xc300, 118, 255),
                    ('actorColors', 0xd027, 6, 15)]:
                check([x & mask for x in read_mem(rpc, address, size)] == after[key], f"room {case['n']} {key}")
            check(read_mem(rpc, 0xc02a, 1)[0] == after['dead'], 'Death state')
            if case['n'] == 33:
                screen = read_mem(rpc, 0xc400, 840)
                check(screen[0x300] == 0x6e, 'Madhouse skipped cell')
                check(sum(v == 0x71 for v in screen) == 839, 'Madhouse rotated cells')
            results.append({'room': case['n'], 'kind': case['kind'], 'passed': True})
            print(json.dumps(results[-1]), flush=True)
        native_cases = [
                (0x6c77, [], [(0xd016, 0xc8), (0xd018, 0x13)]),
                # Let the sound rejoin the final renderer iteration, then return.
                (0x839a, [(0x96, 0xc4)], [(0xd404, 0x15), (0xd40b, 0x15), (0xd412, 0x15)]),
                (0x982f, [], [(0xd40b, 0x13)])]
        native_cases.extend((0x841c, [(0xb1, a)], [(0xb1, b)])
                            for a, b in [(0x0c, 0x10), (0xfc, 0xfc), (0x0f, 0x0b), (0xef, 0xeb)])
        for entry, inputs, expected in native_cases:
            snapshot_load(rpc, str(WORK / 'play-round1.vsf'))
            for address, value in inputs:
                write(address, [value])
            run(entry)
            for address, value in expected:
                check(read_mem(rpc, address, 1)[0] == value, f'Native ${entry:04X} result at ${address:04X}')
            results.append({'entry': f'${entry:04X}', 'kind': 'native', 'passed': True})
            print(json.dumps(results[-1]), flush=True)
        (WORK / 'audit-live-rooms-result.json').write_text(json.dumps(results, indent=2) + '\n')
    finally:
        pause(rpc)
        # run_until uses temporary checkpoints; leave any persistent ones untouched.
        snapshot_load(rpc, saved['name'])
        check(ask(rpc, 'vice_registers_get', {})['PC'] == before_pc, 'Original state was not restored')
    print(json.dumps({'cases': len(results), 'restored': True}))


if __name__ == '__main__':
    main()
