---
name: tool-regen2000
description: How to drive regenerator2000 on a BBC Micro game. Starting it on the kit's jsbeeb snapshot in its BBC Micro mode, how the BBC's text, the MOS's names and SHEILA's registers come through to symbols.json and the listing, and the traps that are the BBC's. The rest is the C64's skill.
---

# regenerator2000 on the BBC Micro

The disassembler is the one the C64 uses, installed once for both:
regenerator2000 0.9.20 from crates.io (`kit/c64/INSTALL.md`, "Get the
disassembler"). The client, the annotation log, `--apply`, `--replay`, the
tools that matter and most of the traps are the same on every machine, and
`kit/skills/c64/tool-regen2000` has them; read it first. This file is what
is different on the BBC.

## Start

```
python3 kit/scripts/tools.py r2000 games/bbc/<slug>/work/<state>.json.gz
python3 kit/bbc/r2000.py --game games/bbc/<slug> r2000_read_region '{"start_address": 8192, "end_address": 8447}'
python3 kit/scripts/symbols_export.py games/bbc/<slug>
```

regenerator2000 cannot open a jsbeeb snapshot, so the launcher always
builds a project first (`kit/bbc/project.py`): the snapshot's memory, the
annotations of the last export (none in a game's first session), and the
machine named as `"system": "BBC Micro"`, which makes the disassembler
comment the MOS's calls, its vectors and SHEILA's registers as the BBC's
and not the C64's. It says so as it starts. Use `kit/bbc/r2000.py`, the
C64's client with the BBC's reading of a session, for every call and for
`--apply`; `symbols_export.py` and `coverage.py --live` load it for a
BBC game themselves.

**Install the crates.io release.** A build of the project's main branch,
which also called itself 0.9.20 on 13 October 2026, answered
`r2000_get_blocks` and `r2000_set_data_type` with `-32603 Failed to parse
tool result`. `kit/bbc/r2000.py` stops on such an answer and says so.

## What comes through, and how

- **Text is ASCII, typed as PETSCII.** regenerator2000 has no ASCII type.
  Type the BBC's text `petscii`: the session shows it as text, and
  `symbols.json` and the listing call it ASCII. A game that prints through OSWRCH keeps
  its strings in ASCII, often ending in `&0D`; Mode 7's screen is ASCII
  too, with the teletext codes 128 to 159 between the words. A string in
  an alphabet of the game's own is typed `byte`, its text in the comment.
- **A BASIC program is typed as screencode.** `screencode` is the C64's
  character order and means nothing on the BBC, so the kit gives it to
  BBC BASIC: type PAGE to TOP `screencode` and `symbols.json` and the
  listing call it BASIC, one line of the program to an item, as LIST
  prints it (`kit/bbc/basic.py`). The session itself shows the bytes as
  C64 screen codes, which read as nonsense: read the program with
  `python3 kit/bbc/basic.py list <snapshot>` beside it. A label goes on a
  line's first byte, its `&0D`; the label names the line, and its comment
  says what the line does. Machine code in the same file is typed `code`
  as usual.
- **The MOS's names come from the export.** In BBC mode the session shows
  `JSR $FFF4 ; OSBYTE - ...` and gives the MOS's entry points and vectors
  no label of their own, not even an automatic one, though a vector's
  second byte gets an automatic label (`a_0221`). `kit/bbc/r2000.py`
  names each the game refers to in `symbols.json` (`OSBYTE`, `IRQ1V`,
  `IRQ1V_hi` for a vector's second byte, `XEVNTV` for an extended vector),
  from `kit/bbc/mos.py`, and the listing shows `jsr OSBYTE`. Where a game
  that has taken the machine over keeps its own code or data in page 2 or
  at &0D9F-&0DEF, that name is wrong: give the address a label of your
  own, which wins.
- **SHEILA is named by the listing.** The session mints automatic labels
  such as `a_FE40` on the chips' addresses. Leave them: no RAM lies under
  &FC00-&FEFF, so `listing.py` names every operand there after the
  register (`sysvia_orb`, `crtc_address`, `ula_palette`) from
  `kit/bbc/registers.py`, whatever the session called it.

## Traps

- **The snapshot holds no ROM.** &C000-&FFFF is zero in the image, and so
  is &8000-&BFFF unless the bank paged in was sideways RAM
  (`kit/bbc/snapshot.py`). A `JSR` into the MOS makes the flow tracer
  decode those zeros: after `JSR $FFF4` a session typed &FFF4-&FFFF as code.
  Both areas are excluded from coverage and the listing leaves them out,
  so this costs nothing; set them back to `undefined` if the block list
  is to be read by eye. A game kept in sideways RAM is a part of its own,
  read with `bank=n` (`kit/scripts/parts.py`).
- **Page 2 and the MOS's workspace are the game's once the MOS is gone.**
  Many games keep using the MOS for the keyboard, the sound queue or the
  vertical sync event, so its vectors and workspace (pages 2 and 3, and
  the extended vectors at &0D9F) stay its own; a game that switches the
  MOS off can use all of it.
  Read what the code does before trusting a name from `mos.py`.
- **The Master's extra instructions come out as data.** 0.9.20 decodes the
  NMOS 6502 only, and the listing's decoder is the same (`kit/cpu/m6502.py`).
  A game written for the Master's 65C12 (`BRA`, `PHX`, `STZ`, `TSB` and the
  rest) needs them added to `kit/cpu/` before its code can be read. The
  Model B's CPU is the NMOS 6502, whose undocumented opcodes come out as
  data just as on the C64 (its skill, Traps).
