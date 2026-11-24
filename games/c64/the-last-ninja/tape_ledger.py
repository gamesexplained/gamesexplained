#!/usr/bin/env python3
"""Rebuild media.json for the two supplied tapes, without exporting their payloads."""

import argparse
from functools import reduce
from hashlib import sha256
import json
from operator import xor
from pathlib import Path
import sys

GAME = Path(__file__).resolve().parent
sys.path.insert(0, str(GAME.parents[2] / "kit/c64"))
from tap import kernal_items, kernal_blocks, kernal_runs, waves

CHAPTERS = dict(zip("ABCDEF", ("wastelands", "wilderness", "palace-gardens",
                             "dungeons", "palace", "inner-sanctum")))
IMAGES = (
    "888b55a124e501c9546d4f0848b1980e97944a2d19547b16d4f1a65a3a700196",
    "2cff613d5a3e70c75218658c372df95d4d6dd235b5d1d62204e4e378ab189ef1",
)


def shifted_bytes(pulses):
    """Every eight-bit window, indexed by the pulse that supplies its last bit."""
    value = 0
    windows = bytearray()
    for pulse in pulses:
        value = ((value << 1) | (pulse >= 660)) & 255
        windows.append(value)
    return windows


def checksum(data):
    return reduce(xor, data, 0)


def syncs(windows, start, stop, sync, pilot_bytes):
    for end in range(start, min(stop, len(windows))):
        if windows[end] == sync and all(
            windows[end - distance] == 0x0F for distance in range(8, 8 * (pilot_bytes + 1), 8)
        ):
            yield end


def block_bytes(windows, last, count):
    return bytes(windows[last + 8:last + 8 * (count + 1):8])


def initial_pages(windows):
    """Cyberload F3. The header checksum covers both header and payload."""
    previous_end = 0
    for sync in syncs(windows, 62633, 619031, 0xCC, 8):
        start = sync - 71
        if start <= previous_end:
            continue
        head = block_bytes(windows, sync, 8)
        count = head[2] or 256
        end = sync + 8 * (8 + count)
        data = block_bytes(windows, sync + 64, count)
        if len(data) == count and checksum(head + data) == 0:
            yield (start, end, int.from_bytes(head[:2], "little"), data)
            previous_end = end


def named_files(windows, start):
    """Cyberload F4 type 1. Its header and every page have separate XOR bytes."""
    previous_end = start - 1
    for sync in syncs(windows, start + 31, len(windows), 0xAA, 3):
        if sync <= previous_end:
            continue
        head = block_bytes(windows, sync, 21)
        if len(head) < 21 or checksum(head):
            continue
        name = head[:16].rstrip(b" \0").decode("ascii", errors="replace")
        if len(name) != 2 or name[0] not in "01234567" or name[1] not in CHAPTERS:
            continue
        address = int.from_bytes(head[16:18], "little")
        length = int.from_bytes(head[18:20], "little")
        data = bytearray()
        end = sync + 8 * 21
        while len(data) < length:
            count = min(256, length - len(data))
            page = block_bytes(windows, end, count + 1)
            if len(page) != count + 1 or checksum(page):
                raise ValueError(f"{name}: invalid data page after pulse {end}")
            data.extend(page[:-1])
            end += 8 * (count + 1)
        pilot = sync - 7
        while pilot > start + 7 and windows[pilot - 1] == 0x0F:
            pilot -= 8
        previous_end = end
        yield pilot, end, name, address, data


def item(side, label, format_name, start, end, address, data, **answer):
    return dict(image=side, label=label,
                place={"file": label, "type": format_name, "pulses": [start, end]},
                load=f"${address:04X}", bytes=len(data), sha256=sha256(data).hexdigest(),
                **answer)


def boot_items(side, pulses, windows):
    items = kernal_items(kernal_blocks(kernal_runs(pulses)))
    for entry in items:
        yield dict(image=side, label=entry["label"], place=entry["place"],
                   load=f'${entry["load"]:04X}', bytes=len(entry["data"]),
                   sha256=sha256(entry["raw"]).hexdigest(), answer="loader",
                   why="The KERNAL loads the bootstrap and its header before Cyberload runs.")

    cursor = 47556 + 8 * 129
    first = bytearray()
    while cursor < 51791:
        cursor += 8  # The address delta precedes each successive run.
        while pulses[cursor + 8] >= 660:
            first.append(windows[cursor + 7])
            cursor += 9
        cursor += 9  # The last flagged byte contains no payload.
        more = pulses[cursor] >= 660
        cursor += 1
        if not more:
            break
    if cursor != 51783 or len(first) != 343 or windows[cursor + 7] != 0:
        raise ValueError("Unexpected Cyberload F1 chain")
    yield item(side, "Cold-boot control chain", "Cyberload F1", 47556, 51790, 2, first,
               answer="loader", why="The first turbo chain installs the next tape reader. The payload is the concatenation of its six runs.")
    for label, start, stop, description in (
        ("Cold-boot page reader", 51792, 62632, "The loader for the cold-boot F3 pages."),
        ("Chapter tape reader", 619032, 637760, "Installs the reader used at $0403 and the low RAM setup present at the Wastelands handover."),
    ):
        sync = next(syncs(windows, start + 31, stop, 0xF0, 3))
        header = block_bytes(windows, sync, 4)
        decoded = bytes(value ^ header[0] for value in header)
        address = int.from_bytes(decoded[:2], "little")
        count = int.from_bytes(decoded[2:], "little")
        encoded = block_bytes(windows, sync + 32, count)
        if len(encoded) != count:
            raise ValueError(f"{label}: truncated F2 body")
        yield item(side, label, "Cyberload F2", start, stop - 1, address, encoded,
                   answer="loader", why=description + " The hash covers the encoded body.")

    pages = list(initial_pages(windows))
    if len(pages) != 257:
        raise ValueError(f"Expected 257 checksum-verified F3 pages, found {len(pages)}")
    groups = (
        (62633, 95823, "Wastelands loading tune", "data", None,
         "Music player and track loaded into $B000 while the first chapter loads."),
        (95823, 165679, "Boot bitmap and vectors", "data", None,
         "Initial bitmap at $E000 and its high-memory tail, including the bytes at the hardware vectors."),
        (165679, 183783, "Boot screen and colour staging", "data", None,
         "Screen bytes for the VIC at $C000 and staged colours copied to the colour chip RAM by $5434."),
        (183783, 227483, "Wastelands room records and under-I/O data", "data", None,
         "The first chapter's records start at $CC00. The stream also fills the authored RAM beneath the I/O registers."),
        (227483, 382619, "Wastelands chapter data", "part", "wastelands",
         "The tape supplies these Wastelands bytes directly to their chapter window."),
        (382619, 544309, "Shared engine", "part", "resident",
         "The bytes at $5400–$9DFF are identical at all six handovers."),
        (544309, 583638, "Wastelands upper chapter tables", "part", "wastelands",
         "The first chapter's $9E00–$AFFF window, replaced by segment 5 of each later chapter."),
        (583638, 618598, "Wastelands gameplay music and code", "part", "wastelands",
         "The final $B000–$BFFF image holds the gameplay track, driver and chapter startup code."),
        (618598, 619031, "Cold-boot handover stub", "loader", None,
         "The final F3 block replaces the short handover stub at $0A96."),
    )
    for lo, hi, label, answer, part, why in groups:
        run = [(start, end, address, data) for start, end, address, data in pages if lo <= start < hi]
        if not run:
            raise ValueError(f"{label}: no F3 pages")
        fields = {"answer": answer, "why": why}
        if part:
            fields.update(part=part, at=f"${run[0][2]:04X}")
        yield item(side, label, "Cyberload F3", run[0][0], run[-1][1], run[0][2],
                   b"".join(data for _, _, _, data in run), **fields)


def ledger(paths):
    images, entries = [], []
    for side, (path, digest) in enumerate(zip(paths, IMAGES), 1):
        raw = path.read_bytes()
        if sha256(raw).hexdigest() != digest:
            raise ValueError(f"{path}: this ledger is for the supplied tape revision")
        name = f"side{side}"
        images.append(dict(name=name, file=path.name, what="tape", sha256=digest))
        pulses = waves(raw, str(path))
        windows = shifted_bytes(pulses)
        if side == 1:
            entries.extend(boot_items(name, pulses, windows))
        files = list(named_files(windows, 637761 if side == 1 else 0))
        expected = [f"{segment}{letter}" for letter in ("BC" if side == 1 else "DEF") for segment in range(8)]
        if [f[2] for f in files] != expected:
            raise ValueError(f"{name}: does not have the expected named files")
        for start, end, label, address, data in files:
            segment = int(label[0])
            if segment < 2:
                why = ("The loading tune and driver, replaced by the chapter's gameplay tune."
                       if segment == 0 else "The loading picture drawn from the temporary $0800 buffer.")
                fields = dict(answer="data", why=why)
            else:
                fields = dict(answer="part", part=CHAPTERS[label[1]])
                if segment == 2:
                    fields.update(at="$DF00", why="Copied to $DF00–$DFFF and $FF40–$FFF7 before handover.")
                elif segment == 3:
                    fields.update(at="$D800", why="Copied to $D800–$DC7F in RAM below the I/O registers.")
                else:
                    fields.update(at=f"${address:04X}", matched=len(data))
            entries.append(item(name, label, "Cyberload F4", start, end, address, data, **fields))
    entries.sort(key=lambda entry: (
        entry["image"],
        entry["place"].get("pulse", entry["place"].get("pulses", [0])[0]),
    ))
    return dict(schema=1, images=images, items=entries)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("side1", type=Path)
    parser.add_argument("side2", type=Path)
    args = parser.parse_args()
    result = ledger([args.side1, args.side2])
    print('{"schema": 1,\n "images": [')
    print(",\n".join("  " + json.dumps(row, ensure_ascii=False) for row in result["images"]))
    print(' ],\n "items": [')
    print(",\n".join("  " + json.dumps(row, ensure_ascii=False) for row in result["items"]))
    print(" ]\n}")
