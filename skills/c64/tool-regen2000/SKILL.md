---
name: tool-regen2000
description: How to drive regenerator2000, the recommended disassembler, through its MCP server with the kit's client script. Starting it on a snapshot, the tools that matter, the annotation log, and the traps.
---

# regenerator2000

An interactive 6502 disassembler with an MCP server. It loads `.vsf`
snapshots directly, which is how it is used here: start it on the
steady-state snapshot from `re-orient`.

## Start and drive

```
script -q /tmp/r2000.log regenerator2000 --mcp-server games/<platform>/<slug>/work/<state>.vsf &
python3 kit/scripts/r2000.py --list
python3 kit/scripts/r2000.py --game games/<platform>/<slug> r2000_disassemble '{"address": 57399}'
```

It binds port 3000 with no option to change it; one instance at a time;
it needs a pseudo-terminal even headless. Addresses in arguments are
decimal integers.

The client script logs every mutating call to
`games/<platform>/<slug>/work/annotations.jsonl`. That log is crash
insurance: `r2000.py --replay <log>` rebuilds a fresh session. Run it from
the game folder, or pass `--game`, so the log lands in the right place.

## Tools that matter

| Tool | Use |
|---|---|
| `r2000_disassemble` `{address}` | mark and decode code from an address |
| `r2000_read_region` `{start_address, end_address}` | show a region; **disassembles as a side effect**, which the log does not capture unless you also log a disassemble |
| `r2000_set_label_name` `{address, name}` | name a routine, variable or table |
| `r2000_set_comment` `{address, type: "line"|"side", comment}` | a line comment on the entry is the description that coverage counts |
| `r2000_set_data_type` `{start_address, end_address, data_type}` | type a data block (byte, word, address, text, undefined) |
| `r2000_get_cross_references` `{address}` | who reads, writes, calls or jumps to an address; the fastest way to attribute a table |
| `r2000_get_address_details` `{address}` | semantics, xrefs, labels and comments at one address |
| `r2000_search_memory`, `r2000_search_disassembly` | bytes or text in memory; a string or regex over the listing (register census in one call) |
| `r2000_get_blocks`, `r2000_get_symbols`, `r2000_get_comments` | state; what the coverage and export scripts read |
| `r2000_undo` | undo the last operation; note that the log does not record undos |
| `r2000_unpack_binary` | **destructive**: wipes all annotations. Do not use on an annotated session |
| `r2000_batch_execute` `{calls: [...]}` | many calls in one round trip |
| `r2000_save_project` | only works for sessions loaded from a project file; use `symbols_export.py` instead |

## Traps

- **Never bulk-disassemble every labelled address** to recover coverage.
  Labels sit on data tables too; disassembling them corrupts the display.
  Undo with `r2000_set_data_type` to `undefined`.
- The project file (`.regen2000proj`) embeds the memory image. It stays in
  `work/` and is never committed. `symbols_import.py` rebuilds it from
  `symbols.json` plus a snapshot.
- After any bulk recovery, verify with a clean process, a full replay and
  a block-count check, not "the replay didn't error".
- Auto-generated symbols (branch targets) are minted on every load; the
  export keeps them because the coverage denominator uses them, and the
  import drops them because the tool regenerates them.
