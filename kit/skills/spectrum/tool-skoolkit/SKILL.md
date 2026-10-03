---
name: tool-skoolkit
description: How to drive SkoolKit 10.1 for ZX Spectrum disassembly — the control file that is the annotation surface, the directives the kit writes, the round trip through symbols.json, and the traps. The kit's own Z80 decoder and snapshot reader mean a listing never depends on it. The machine facts it needs are in zx-spectrum-reference.
---

# SkoolKit

SkoolKit is the open-source ZX Spectrum disassembly toolkit (GPLv3,
`https://github.com/skoolkit/skoolkit`, docs at `https://skoolkit.ca`). The
kit runs one of its commands, `sna2skool.py`, and only to render
annotations; `kit/spectrum/skoolkit.py` writes and reads the control file
itself. It is installed under `tools/skoolkit/`:

```
python3 kit/scripts/tools.py --platform spectrum get-skoolkit   # install or upgrade (PyPI)
python3 kit/scripts/tools.py --platform spectrum status         # which version is installed
```

## What the kit does with it

The annotation surface is a **control file** (`.ctl`): plain text, one
directive per line, no memory image in it. `kit/spectrum/skoolkit.py` carries
annotations between that file and the shared `symbols.json`, and renders it
through SkoolKit when you want to read the code.

```
python3 kit/spectrum/skoolkit.py --list
python3 kit/spectrum/skoolkit.py disassemble '{"sna": "work/game.sna", "ctl": "work/game.ctl", "out": "work/game.skool"}'
python3 kit/spectrum/skoolkit.py ctl-from-symbols '{"game": "games/spectrum/<slug>", "sna": "work/game.sna"}'
python3 kit/spectrum/skoolkit.py symbols-from-ctl '{"ctl": "work/game.ctl"}'
python3 kit/spectrum/skoolkit.py --test
```

The shared scripts reach the same two directions by platform:

```
python3 kit/scripts/symbols_import.py <game dir> <snapshot.sna>   # symbols.json + .sna -> work/<slug>.ctl
python3 kit/scripts/symbols_export.py <game dir> --ctl <file>     # control file -> symbols.json
```

A committed `symbols.json` plus the contributor's own `.sna` rebuild the
control file, and the control file rebuilds `symbols.json`; neither holds
the memory image, so both are safe to commit.

## The first control file, from an execution map

Before any of the above can run, a whole-image game has to have its code
separated from its data: `sna2skool.py` disassembles the bytes a `c` block
tells it to, and nothing mints those blocks for you (`50-coverage`, "When the
disassembler does not follow control flow"). SkoolKit will do it from a
**code execution map**:

```sh
tr ' ' '\n' < work/cov-play.txt | sed 's/^/\$/' > work/map.txt
python3 tools/skoolkit/bin/sna2ctl.py -m work/map.txt work/entry.sna > work/from-map.ctl
```

`-m` takes one `$XXXX` address per line. The map comes from the emulator
(`kit/skills/spectrum/tool-zesarux`, "Finding a game's code", says how to
record one). Two traps in the output: its addresses are written in **decimal**
unless `-l` is passed, so comparing against the kit's own `.ctl` needs a
conversion; and it emits `t` (text) blocks where the bytes look printable,
which is the tool's guess about your game rather than a fact, so check each
one before keeping it.

**Run it more than once, and let each pass feed the next.** The map marks
the code that ran, and the walk from it follows what it decodes - so a
stretch filed as data also hides every routine that stretch calls, in the
map sweep and in any trace that trusts the same typing. Rebuild the map from
the control file's `call`/`jp`/`jr` targets, run `sna2ctl.py` again, and
repeat until a pass changes nothing. Measured on the first game this was
done to: one pass found **3,320** bytes of reachable code typed as data and
the fixpoint found **5,934**, the whole 2,600-byte difference hidden behind
stretches the first pass still called data - a 13-byte region held a `CALL`
into a 611-byte routine that neither the map nor the walk could see until
those 13 bytes were retyped.

## The control file, as far as the kit writes it

Full syntax: the "Control files" chapter of the manual. The subset
`skoolkit.py` emits, and reads back:

| Line | Means |
|---|---|
| `c $ADDR title` | a code block starts here; the block runs to the next directive |
| `b $ADDR title` | bytes | 
| `w $ADDR title` | words; a pointer is a word |
| `t $ADDR title` | text in the machine's alphabet |
| `i $ADDR` | ignore from here: the kit's way to close a block exactly where its symbol ends |
| `@ $ADDR label=NAME` | a label at ADDR |
| `N $ADDR text` | a line comment above the instruction at ADDR |

Addresses are written `$XXXX`. When you hand-write one, `$` means hex and a
bare number is **decimal**, SkoolKit's own default. `0x` is not hex in a
control file: `sna2skool.py` ignores the whole line with a warning
("invalid address"), and so does the kit's reader, so a block written
`b 0x8010` exists in neither the render nor `symbols.json` (measured on
SkoolKit 10.1, 3 October 2026). A line starting `;`, `#` or `%` is a
comment. A block of a type the kit does not track (`i`, `u`, `s`, `g`) is
a boundary but not a block.

`skool2ctl.py` goes the other way, from a `.skool` back to a `.ctl`, if you
ever work from a rendered file. The kit does not: the `.ctl` is the source,
and `disassemble` only renders it.

## Traps

- **Annotations outside the RAM image are refused on the way back.** A
  control file may name `$0038` (the ROM's RST), a ROM routine or a
  hardware entry point, and `sna2skool.py` will label it. `symbols_from_ctl`
  drops anything below `$4000`, so a ROM address never becomes a symbol in
  the ledger and never covers a byte the game does not own. Keep a ROM
  reference as a comment, or put it in `features.md`, not in a `@` line.
- **A control file with no block directive renders nothing.** SkoolKit
  disassembles what the directives cover: with none, `sna2skool.py` prints
  an empty disassembly and no error (measured on 10.1). Start from
  `symbols_import.py`, which writes a `c` block for every code block
  already in `symbols.json`.
- **`sna2skool.py` writes to stdout.** Its `-o` is the origin address of a
  raw binary, not an output file; `skoolkit.py` captures stdout. Do not
  expect a file from the bare command.
- **The `.sna` is a 48K snapshot.** SkoolKit's `-p` page flag is for 128K
  only, and `kit/spectrum/snapshot.py` refuses a 128K snapshot.
- **The first directive starts the real map.** Everything before it is
  ignored, so a control file that begins at `$8000` never tries to
  disassemble the ROM the .sna does not hold.
