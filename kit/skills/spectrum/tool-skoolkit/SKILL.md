---
name: tool-skoolkit
description: How to drive SkoolKit 10.1 for ZX Spectrum disassembly — the control file that is the annotation surface, the directives the kit writes, the round trip through symbols.json, and the traps. The kit's own Z80 decoder and snapshot reader mean a listing never depends on it. The machine facts it needs are in zx-spectrum-reference.
---

# SkoolKit

SkoolKit is the open-source ZX Spectrum disassembly toolkit (GPLv3,
`https://github.com/skoolkit/skoolkit`, docs at `https://skoolkit.ca`). The
kit uses exactly two of its commands, `sna2skool.py` and `skool2ctl.py`,
and only to render and exchange annotations. It is installed under
`tools/skoolkit/`:

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

Addresses are written `$XXXX`. When you hand-write one, `$` or `0x` means
hex; a bare number is **decimal** — SkoolKit's own default. A line starting
`;`, `#` or `%` is a comment. A block of a type the kit does not track
(`i`, `u`, `s`, `g`) is a boundary but not a block.

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
- **A control file with no block directive leaves everything as data.**
  SkoolKit disassembles what a `c` block tells it to; without one,
  `sna2skool.py` shows bytes. Start from `symbols_import.py`, which writes
  a `c` block for every code symbol already in `symbols.json`.
- **`sna2skool.py` writes to stdout.** There is no `-o`; `skoolkit.py`
  captures it. Do not expect a file from the bare command.
- **The `.sna` is a 48K snapshot.** SkoolKit's `-p` page flag is for 128K
  only; the kit reads no 128K snapshot yet (`kit/spectrum/snapshot.py`).
- **The first directive starts the real map.** Everything before it is
  ignored, so a control file that begins at `$8000` never tries to
  disassemble the ROM the .sna does not hold.
