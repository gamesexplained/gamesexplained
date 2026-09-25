---
name: tool-regen2000
description: How to drive regenerator2000, the recommended disassembler, through its MCP server with the kit's client script. Starting it on a snapshot, the tools that matter, the annotation log, and the traps.
---

# regenerator2000

An interactive 6502 disassembler with an MCP server. It can load `.vsf`
snapshots directly, but a session started that way cannot be saved, so
the launcher does not: it starts the disassembler on the snapshot's
project file, and the steady-state snapshot from `10-orient` is read
through that.

## Start and drive

```
python3 kit/scripts/tools.py r2000 games/<platform>/<slug>/work/<state>.vsf
python3 kit/c64/r2000.py --list
python3 kit/c64/r2000.py --game games/<platform>/<slug> r2000_disassemble '{"address": 57399}'
```

It binds port 3000 with no option to change it; one instance at a time;
it needs a pseudo-terminal even headless. Addresses in arguments are
decimal integers.

**The project file is the save.** Given a snapshot in a game's `work/`,
the launcher starts on `work/<state>.regen2000proj`: the snapshot's
memory image with the annotations. When there is none it builds one
first with `symbols_import.py`, from `symbols.json`, or with no
annotations at the start of a run. When there is one it starts on it as
the last save left it, after checking that it holds the same memory image
as the snapshot. `r2000_save_project` writes the session back to that
file, and `symbols_export.py` calls it before every export. After a
crash, `tools.py r2000` on the same snapshot starts where the last save
stopped.

The client script logs every mutating call to
`games/<platform>/<slug>/work/annotations.jsonl`: what came after the last
save is in there. `r2000.py --replay <log>` replays a log into the running
session. Run the client from the game folder, or pass `--game`, so the log
lands in the right place.

## Tools that matter

| Tool | Use |
|---|---|
| `r2000_disassemble` `{address}` | mark and decode code from an address |
| `r2000_read_region` `{start_address, end_address}` | show a region; **disassembles as a side effect**, which the log does not capture unless you also log a disassemble |
| `r2000_set_label_name` `{address, name}` | name a routine, variable or table; an empty `name` removes the label |
| `r2000_set_comment` `{address, type: "line"|"side", comment}` | a line comment on the entry is the description that coverage counts |
| `r2000_set_data_type` `{start_address, end_address, data_type}` | type a data block. The values are **lower case**: `code`, `byte`, `word`, `address`, `petscii`, `screencode`, `lo_hi_address`, `hi_lo_address`, `lo_hi_word`, `hi_lo_word`, `external_file`, `undefined` |
| `r2000_get_cross_references` `{address}` | who reads, writes, calls or jumps to an address; the fastest way to attribute a table |
| `r2000_get_address_details` `{address}` | semantics, xrefs, labels and comments at one address; not on a snapshot (Traps) |
| `r2000_search_memory`, `r2000_search_disassembly` | bytes or text in memory; a substring, or a regex with `use_regex: true`, over each field of the listing (register census in one call) |
| `r2000_get_blocks`, `r2000_get_symbols`, `r2000_get_comments` | state; what the coverage and export scripts read |
| `r2000_undo` | undo the last operation; note that the log does not record undos |
| `r2000_unpack_binary` | **destructive**: wipes all annotations. Do not use on an annotated session |
| `r2000_batch_execute` `{calls: [{name, arguments}, ...]}` | many calls in one round trip; each entry names its tool as `name`, not `tool` |
| `r2000_save_project` `{}` | write the session to the project file it was started on (above); refused with "No active project path" on a session started on a snapshot or `.prg` |

## Traps

- **The type names going in are not the type names coming out.**
  `set_data_type` takes `byte` and `lo_hi_address`; `get_blocks` reports
  `Byte` and `Lo/Hi Address`. The export script maps between them. A
  capitalised value is rejected with "Unknown data_type".
- **`address` is for interleaved pointers, `lo_hi_address` for split
  tables.** A table of low-byte-then-high-byte pairs is `address`. Typing it
  as `lo_hi_address` reads the first half as low bytes and the second half as
  high bytes, invents addresses that are not there, and mints auto symbols
  all over the image. The tell is symbols appearing in regions the game never
  touches.
- **A custom alphabet has no data type.** `petscii` and `screencode` are the
  only text types; a game whose character set is in its own order has to be
  typed `byte` with the decoded text in the comment.
- **`search_disassembly` tests each field on its own.** The mnemonic, the
  operand, the label and the comments are separate strings, so a query
  that spans two of them (`jmp (`, `sta $d020`) finds nothing in the code,
  only comments that happen to quote it. Match the operand's shape with
  `use_regex: true` and `search_comments: false` (`^\([^,]*\)$` is every
  indirect jump) and filter the results by mnemonic. Once an address has a
  label the operand shows the label, not the address: search a named
  register by its name, or scan the snapshot for the opcode bytes.
- **`get_address_details` is no use on a snapshot.** With a whole 64 KB
  image loaded (a `.vsf`: `get_binary_info` says origin 0, size 65536),
  0.9.20 answers every address, `$0000` to `$FFFF`, with "Address is
  outside the loaded binary range", while `read_region` shows the same
  bytes. Ask `get_cross_references`, `get_symbols`, `get_comments` and
  `read_region` instead.
- **Never bulk-disassemble every labelled address** to recover coverage.
  Labels sit on data tables too; disassembling them corrupts the display.
  Undo with `r2000_set_data_type` to `undefined`.
- The project file (`.regen2000proj`) embeds the memory image. It stays in
  `work/` and is never committed. `symbols_import.py` rebuilds it from
  `symbols.json` plus a snapshot, and will not overwrite one without
  `--force`: the saved project can hold work that `symbols.json` does not.
- **A snapshot started on directly is traced from its program counter.**
  0.9.20 loading a `.vsf` disassembles from the saved program counter and
  labels it `start`; a project built from the snapshot starts with nothing
  traced and no labels. Trace from the interrupt handlers and the entry
  point `10-orient` found, not from wherever the CPU was waiting.
- **Retaking a snapshot under the same name** leaves its project holding
  the old image. The launcher refuses to start and says how to carry the
  annotations over; a new state is better saved under a new name.
- After any bulk recovery, verify with a clean process, a full replay and
  a block-count check, not "the replay didn't error".
- **The flow tracer can wander into text.** `$20` is `JSR`, so a run of
  PETSCII spaces decodes as `JSR $2020 / JSR $2020`, and a trace that
  reaches such bytes keeps going: one run minted code blocks inside a
  title scroller, reached from nothing but each other. After tracing, ask
  `get_cross_references` about every small code block, and set the ones
  only reached from inside themselves back to `undefined`.
- **A `JSR` into ROM traces the RAM underneath.** The snapshot holds the
  RAM below the BASIC and KERNAL ROMs, so a call to `$E544` or `$FFD2` makes
  the tracer disassemble whatever the game keeps there. Set those ranges
  back to `undefined`, and list the entry byte under `coverage.exclude` in
  `game.json`, so the auto symbol at it stops owning the RAM beneath (the
  ledger skips a symbol whose address is excluded).
- Auto-generated symbols (branch targets) are minted on every load; the
  export keeps them because the coverage denominator uses them, and the
  import drops them because the tool regenerates them.
- **Clearing a label removes the symbol under it.** `set_label_name` with
  an empty name on a renamed automatic symbol (0.9.20) deletes it
  outright: the address has no symbol until the code that names it is
  disassembled again, and the coverage denominator shrinks meanwhile.
  That is also the way to turn an automatic symbol into a user label with
  the longer span (`kit/scripts/ledger.py`): clear it and set the new name
  in the next call, never the one without the other.
- **A placeholder operand sends the tracer into zero page.** A `JSR` or
  `JMP` whose target the program writes before it runs is often assembled
  as `JSR $0000`; the flow tracer follows it and marks `$0000` onward as
  code. Set that range back to `undefined`, and find the real targets from
  whatever writes the operand (a table of routines, a display list).
- **Undocumented opcodes come out as data.** 0.9.20 decodes only the
  documented instruction set: `LAX`, `DCP`, `LXA` and the multi-byte `NOP`s
  show as `.byte` lines inside a code block, the bytes after them are
  sometimes decoded as instructions they are not (`STX $DF` inside
  `DCP $FF86,X`), and the cross-references miss what they touch. Type such
  a spot `byte` and write the real instructions in its comment
  (`c64-reference`, Undocumented opcodes). A search of the decoded code for
  readers of an address is incomplete until these gaps have been read.
  `python3 kit/c64/opcodes.py games/c64/<slug> [<snapshot.vsf>] [--live]`
  lists every undocumented opcode inside a code block, with what the
  disassembler shows there, and decodes the spots typed `byte` inside
  code; `--refs <address>` lists every instruction that can touch an
  address, documented or not: by name, as a pointer, or through an index,
  including one that wraps past `$FFFF`.
- **Code that indexes into I/O mints symbols in the RAM beneath.**
  `STA $D800,X`, `LDA $DDDD,X` (a placeholder operand) and the like leave
  automatic symbols at `$D000`-`$DFFF`. If that RAM holds the game's own
  data (`coverage.include`), type it, clear those symbols (an empty name)
  and label the data, or the listing names sprite rows after the chips'
  registers.
