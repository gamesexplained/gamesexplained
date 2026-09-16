# Choplifter — kit feedback

Written in the retrospective (`skills/core/re-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Environment

- macOS 25.5.0 (Darwin), Apple silicon.
- VICE 3.10 (`x64sc`, C64SC, PAL, 6569 VIC-II, 6581 SID) with the vice-mcp
  server, from the self-contained GUI build.
- regenerator2000 0.9.20 from cargo.
- Python 3.9.6, the system one. No packages.
- Nine annotation subagents on the same Opus-class model as the run.

## Changed, with the reason

### `kit/scripts/r2000.py` — `--log`

`skills/core/re-coverage` tells you to give every parallel agent its own
`work/annotations-<n>.jsonl`, and the client could not do it: the log path
was hard-coded to `work/annotations.jsonl`. Nine agents appending to one
file would have interleaved into something no replay could use. There is
now a `--log` argument and an `ANNOTATION_LOG` environment variable, and
the docstring says why.

### `kit/scripts/vice.py` — `stick_arm`, `stick`, `stick_release`

The emulator's `vice_joystick_set` reaches CIA1 port A only, which is
control port **2**. Asked for the other port it returns `{"status":"ok"}`
and changes nothing; `port` 0 and 3 are rejected outright. The keyboard
matrix tools behaved the same way: success reported, `$DC01` unchanged.
This game reads control port 1, so for a while there was no way to press
fire at all, and the title screen waits for fire.

What works is to stop treating `$DC01` as an input. Write `$1F` to `$DC03`
and CIA1 port B's low five bits become outputs, after which a plain memory
write to `$DC01` is what the game reads. Leaving bits 5 to 7 as inputs
keeps the keyboard columns alive for a game that shares that read. That is
now three functions in the client and a paragraph in
`skills/c64/tool-vice-mcp`.

This was the single biggest time sink in the run and it was all in
orientation, before any analysis had started.

### `skills/core/re-coverage` — inline parameters, and how far a comment reaches

Two additions.

**Inline parameters.** Control-flow disassembly stopped at 9,221 tracked
bytes and a scan of every `jsr`/`jmp` target inside the code it had found
turned up nothing new, which reads like "the rest is data". It was not.
Five routines here take their argument from the two bytes after the `jsr`
that calls them, and a flow disassembler walks into the argument and
decodes it as an instruction. Finding the call sites, typing the argument
bytes as data and restarting at the resume point took the tracked image to
16,348 in one pass. The skill now describes the idiom, the stack-unwinding
shape to look for, and the warning that a family of such wrappers can eat
different numbers of inline bytes.

**Span caps.** `ledger.py` caps a symbol's span at 1024 bytes for code and
user-defined symbols and at 64 for other data symbols, and nothing said so
outside the source. An agent that writes one excellent description of a
600-byte table scores 64 bytes for it. The rule is now in the skill, where
the people writing the descriptions will read it.

### `skills/c64/tool-vice-mcp` — three behaviours

The joystick and keyboard failure above; the six-entry resource whitelist
in `vice_machine_config_set` (which rules out fixing the joystick mapping
with a resource); and the fact that registers a raster interrupt rewrites
cannot be sampled at all. Reading `$D018` and `$DD00` from a script gave a
different answer every time and cost a false start on where the character
set lived. Consecutive reads disagreeing looks like a flaky tool and is
not; the fix is to read the interrupt handler.

### `skills/c64/c64-reference` — cartridge images, invisible RAM, snapshot noise

Three platform facts this run needed and had to derive.

- The `CBM80` signature and what it means for a disk release of a
  cartridge game, including why the cartridge's own cold start does
  `IOINIT`/`RAMTAS`/`CINT` and the loader's entry point does not.
- In VIC banks 0 and 2 the video chip sees the character ROM at `$1000`
  within the bank, so the RAM under it is free and a game can hide
  kilobytes of tables there. The corollary explains why a byte-for-byte
  copy of the character ROM turns up in RAM in the other bank.
- VICE fills unwritten RAM with a repeating `00 00 00 00 FF FF FF FF`
  pattern. Half an hour went on trying to work out what the "data" filling
  `$C000`-`$FFFF` was before recognising it. Also a quicker way to find
  colour RAM in a snapshot file: scan for the single 1024-byte run of
  bytes all under 16.

### `kit/INSTALL.md`

One paragraph pointing at the joystick workaround, since that is where
somebody stuck at "fire does nothing" will look.

## Would change, but it needs a maintainer's call

- **`new_game.py` leaves `{{title}}` in `index.html`.** It substitutes
  `{{title}}` in the `.md` files but not in the template article, and
  `build.py` only substitutes into the generated tabs, so an article
  published straight from the template has `<title>{{title}}</title>`. One
  line in either script fixes it. Left alone because it touches the shared
  template and the fix belongs with whoever owns the build.
- **`levels.html` and `index.html` must be self-contained, and nothing
  enforces it.** `build.py` copies exactly `index.html`, `levels.html`,
  `play.html`, `listing.json`, `symbols.json` and `reference/`. A page that
  pulls in a sibling `.js` file builds without error and 404s in the
  browser. A check, or a line in `re-article`, would catch it.
- **The tier table has a requirement an agent cannot meet.** Gold needs a
  human to have read the copy. This run met every other Gold requirement,
  so `game.json` says `silver` and `TODO.md` records that one line. That is
  the honest reading of the rule as written, but a run that lands there
  every time might want a word for it.

## What took longest

1. Getting fire into the machine. About an hour of orientation, all of it
   before any code had been read.
2. The inline-parameter idiom. Half the program looked like data until it
   was found.
3. Waiting on nine annotation agents. They ran 19 to 35 minutes each and
   the useful figure is the total: about 2.1 million subagent tokens for
   23,661 bytes at 100 %.

## What worked

Splitting the burn-down across nine agents on disjoint ranges did what the
skill says it does. The spot-checks earned their keep twice: one agent's
"shapes 14 and 15 are shapes 5 and 11 with one row deleted" was wrong (they
are the same drawings one row shorter with the undercarriage redrawn) and
another's "the engine sound is a triangle" was corrected by the agent
itself on a live read before it reached anything. Both were caught by
diffing bytes rather than by reading prose.

Cross-agent messages were worth more than expected. Two agents found the
fifth inline-parameter routine independently within a minute of each other,
and the agent that owned the call site had already fixed it by the time the
message arrived.
