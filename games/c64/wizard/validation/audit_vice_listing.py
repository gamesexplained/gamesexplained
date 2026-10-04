#!/usr/bin/env python3
"""Compare the listing with VICE's disassembler, without writing emulator memory.

Restore the canonical entry snapshot in this clone's VICE and pause it first.
This verifies instruction bytes, mnemonics and boundaries, not label meanings.
"""
import json
import sys
from pathlib import Path

GAME = Path(__file__).resolve().parents[1]
ROOT = GAME.parents[2]
sys.path.insert(0, str(ROOT / 'kit/c64'))
from vice import connect, call, read_mem


def main():
    rpc = connect()

    def ask(name, **args):
        result = json.loads(call(rpc, name, args))
        assert 'error' not in result, result
        return result

    assert ask('vice_ping')['execution'] == 'paused', 'Pause VICE at the canonical entry snapshot first'
    records = json.loads((GAME / 'listing.json').read_text())['records']
    # Check the image before accepting the disassembler's output. Use raw RAM
    # for the sprite area beneath ROM, as the snapshot and listing do.
    ranges = [(0x0801, 0x4A89), (0x5800, 0x9F70), (0xC800, 0xD000), (0xE000, 0x10000)]
    memory = bytearray(65536)
    for low, high in ranges:
        memory[low:high] = read_mem(rpc, low, high - low, bank='ram')
    code = []
    total_bytes = 0
    for record in records:
        if 'b' not in record:
            continue
        address, raw = record['a'], bytes(record['b'])
        assert memory[address:address + len(raw)] == raw, f'Wrong image at ${address:04X}; restore entry snapshot'
        total_bytes += len(raw)
        if record['t'] == 'code':
            code.append(record)
    checked = 0
    batches = 0
    while checked < len(code):
        batch = [code[checked]]
        while len(batch) < 100 and checked + len(batch) < len(code):
            following = code[checked + len(batch)]
            if following['a'] != batch[-1]['a'] + len(batch[-1]['b']):
                break
            batch.append(following)
        decoded = ask('vice_disassemble', address=f"${batch[0]['a']:04X}", count=len(batch), show_symbols=False)['lines']
        assert len(decoded) == len(batch)
        for record, instruction in zip(batch, decoded):
            assert instruction['address'] == record['a'], f"Instruction boundary at ${record['a']:04X}"
            size = instruction['size']
            fields = instruction['instruction'].split()
            assert size == len(record['b'])
            assert [int(v, 16) for v in fields[:size]] == record['b']
            assert fields[size].lower() == record['m'].lower(), f"Mnemonic at ${record['a']:04X}"
        checked += len(batch)
        batches += 1
    assert ask('vice_ping')['execution'] == 'paused'
    print(json.dumps({'listing_bytes': total_bytes, 'vice_instructions': checked,
                      'batches': batches, 'passed': True}, indent=2))


if __name__ == '__main__':
    main()
