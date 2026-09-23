# Little Computer People — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Environment

- macOS 26.5 (Darwin 25.5.0), Apple silicon.
- VICE 3.10 (`x64sc`, C64SC, PAL) with the vice-mcp server: the
  contributor's own build, `github.com/air/vice-mcp` branch `fixed` at
  `8a07b08d5c` (v3.11.0 with pull requests #6, #7, #11 and #14 to #24 of
  `barryw/vice-mcp`), linked with `tools.py use-vice`. `check-emulator`:
  56 of 56.
- regenerator2000 0.9.20, the contributor's existing cargo install in
  `~/.cargo/bin`, found on the `PATH`.
- Python 3.9.6, the system one. No packages.
- Claude Opus 5.5 (`claude-opus-5-5`) for every step and for the nine
  coverage subagents.

## Changed, with the reason

### `kit/c64/tools.py`

- **`use-vice` on a fresh clone.** It linked `tools/vice-mcp` into a
  `tools/` folder that did not exist yet and died with `FileNotFoundError`.
  It now creates the folder first.
- **One emulator per port.** When this run began, an emulator started from
  another clone of the kit on the same computer was answering on :6510,
  and `tools.py status` here said `up` beside a build it called `MISSING`.
  Every call this session made would have driven the other clone's
  machine, with its snapshots landing in that clone's `tools/`. The
  contributor closed it by hand. Now `status` names the owner of either
  port when it was started from another folder, `vice` and `r2000` refuse
  to start beside one, and `stop` kills only this clone's tools, so that
  stopping here cannot take down another run's emulator.

### `coverage.include`: `kit/scripts/symbols_export.py`, `coverage.py`, `kit/template/game.json`

The C64 defaults exclude `$D000`–`$DFFF` as I/O. This game banks the I/O
out (`$01` = `$34`) and runs its sound driver, dispatch tables and
scripts in the RAM beneath. There was no way to count them. `include` in
the `coverage` object now carves ranges back out of the exclusions; the
template carries the empty key and the coverage script's help says what
it does.

### `kit/skills/core/50-coverage/SKILL.md`

- **Inline jump tables that never come back.** The section on inline
  parameters described a call that eats an argument and returns after it.
  This game's state machines use a switch that pulls its return address,
  takes the n-th word of the table after the call and jumps there, never
  returning; 103 call sites, no stored lengths. Flow tracing stalled at
  every one. The new subsection says how to find the sites (a byte scan of
  the whole image), where a table ends, how to test a target (accepting a
  handler that opens with a switch call of its own, which the first,
  stricter test here rejected), and the trap that undoes the typing:
  disassembling a call site again sends the tracer back into its table.
  It also says to check the length of a behaviour table against the
  values its variable takes live; the one here was first read as 32
  entries, and it has 128.
- **A game can live under its I/O**, with how to spot it, and that the
  disassembler will name those addresses after the chip registers.
- **Is the picture loaded or drawn?** The house is an 8 KB bitmap that
  arrives with the program. A before-and-after pair of snapshots settles
  whether a picture is data to describe or output to exclude.

### `kit/skills/core/60-verify/SKILL.md`

A fourth way a live test lies: the effect was going to happen anyway. The
little person acts on his own, so a typed request followed by an action
proves nothing until the same snapshot has been run without the request.
The replay is exact, random numbers included, which makes that control
clean, and means one snapshot is one sample of any random choice.

### `kit/skills/c64/c64-reference/SKILL.md`

- **The keyboard matrix.** The game scans the keyboard itself with the
  KERNAL banked out, and the reference had no matrix. Added the table,
  checked twice: against the game's own 64-byte key table, printed as a
  grid, and live at the BASIC prompt, where the KERNAL's key number in
  `$CB` is 8 × row + column for every key tried. The game's table is in
  the transposed order, row + 8 × column, and the note says to expect
  that.
- **Main-loop scanners drop short presses**, keep one of two held keys,
  and ignore a repeat until a scan sees no key.
- **A note table is tuned for one clock.** This game's tables are exact
  for NTSC, so the PAL machine plays about 0.65 of a semitone flat, more
  than half a step: named with the PAL clock, every note rounds to the
  semitone below the one written.

### `kit/skills/c64/tool-vice-mcp/SKILL.md`

- The `pressed` and `hold_frames` arguments of `vice_keyboard_matrix`,
  and that keys with no name, such as `:`, take a row and column.
- **Typing into a game**: hold each key until a checkpoint on the
  game's store of a new key counts it, release, and wait for its last-key
  variable to clear. Fixed-length presses lost letters, and a request
  with a letter missing is a different request.
- **Recording what the SID plays**, with the three things that decide
  whether a recording is right (where to start, one gate is one note, the
  clock). Measured here: 13 frames a second, so a minute of PAL music
  takes four minutes to record.
- **One emulator answers on :6510, whoever started it.**

### `kit/skills/c64/tool-regen2000/SKILL.md`

`search_disassembly` tests the mnemonic, the operand, the label and the
comments as separate strings, so `jmp (` or `sta $dc0d` finds nothing in
the code; early in the run a script over the snapshot was needed to find
the indirect jumps. Checked live for this note: those queries return only
comments that quote the phrase, `use_regex: true` with
`search_comments: false` and `^\([^,]*\)$` returns the four indirect
jumps in the listing, and an operand shows its label rather than its
address once the address is named.

### `kit/c64/INSTALL.md`

`tools.py status` names an own build by its path on the contributor's
computer. The notes now say to record where its source is public, and
record this build: repository, branch, commit, what it contains, 56 of 56.

### `kit/CHANGELOG.md`, `kit/VERSION`

0.0.11: the non-returning jump tables, code under the I/O chips, the
control run from one snapshot, and recording the SID to check music.

## Would change, but it needs a maintainer's call

- **Reading the manual online.** `AGENTS.md` says manuals from the web
  are welcome after the contributor confirms. `20-features` and
  `c64-reference` tell the agent to read the wiki page and the manual
  first, and nothing in `START.md` asks. This run read four pages without
  asking (C64-Wiki, Wikipedia, Lemon64's copy of the manual, and the OCR
  text of the manual on archive.org), through a fetch tool, saving nothing
  to disk. Either reading a page is not downloading, and the rule should
  say so, or `START.md` should ask once, alongside the tier, whether the
  agent may read the game's pages online.
- **One address, two meanings.** `$D000`–`$D02E` is VIC-II registers with
  the I/O in and code with it out. The disassembler has one label per
  address, so a sprite position write at `$048A` shows in the listing as
  `sta snd_event,x`. The comments say which meaning is live where; a
  per-range "name the registers, not the RAM" choice in `listing.py`
  would say it in the code itself.
- **A local path in a committed file.** `game.json` carries the
  `tools.py status` line as the kit asks, and that line holds the
  contributor's home folder. The public repository and commit are the
  reproducible part; `status` could print them itself when the commit is
  on a remote branch, and leave the path out.
- **Port 8000 for the preview.** `AGENTS.md` names it, and another clone's
  preview server already held it. "Any free port" would do.
- **A contact sheet helper.** `work/sheet.py` here tiles PNG screenshots
  into one image in pure Python (no PIL), so forty poses or states can be
  looked at in one read. It is 72 lines; `kit/scripts/` may want it.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 9 | claude-opus-5-5 | 1 | emulator choice and verification (own build, 56/56), use-vice bug on a fresh clone, crack screen hands over by itself, keyboard matrix needed for the time prompt |
| 20-features | 12 | claude-opus-5-5 | 1 |  |
| 30-text | 7 | claude-opus-5-5 | 1 |  |
| 40-sweep | 4 | claude-opus-5-5 | 1 |  |
| 50-coverage | 73 | claude-opus-5-5 | 1 | nine Opus agents on disjoint ranges after the lead mapped the 103 inline switch tables; the lead ran live tests in parallel (CTRL keys, typed requests, activity timeline, piano pieces). Tracked image grew from 16 KB to 62 KB as switch tables, the RAM under I/O, the house picture and the packed sprites were brought in |
| 60-verify | 22 | claude-opus-5-5 | 1 | consolidating nine agents' reports into facts.md and features.md; live tests of each surprising claim (house tick, CTRL keys, illness and bed, faces, letters, piano pieces, inverted tune, talking sound, manners); the contributor's own observations (TV, turntable, talking) confirmed |
| 70-minisite | 14 | claude-opus-5-5 | 1 | house renderer with overlays, the 183-image cast decoder, a JS copy of the parser checked against live results, the activity timeline, a music player fed by frame-by-frame SID captures of all eight pieces (13 min of emulator time); copy draft and one rewrite pass |
| 80-retro | 11 | claude-opus-5-5 | 1 | skill edits checked live before writing them (the keyboard matrix against the game's key table and the KERNAL's key numbers; search_disassembly's field matching; SID recording speed); tools.py made to leave other clones' tools alone |
| total | 150 | claude-opus-5-5 | | 2.5 h of work |

Portable figures: 9.2 minutes to play; 1.2 min per KB (72.8 min for
61,815 tracked bytes, 9 agents); 2.5 hours.

The change that would have saved the most: the coverage skill's section
on jump tables that never return, because until the lead had found the
switch, mapped its 103 tables and stopped undoing them by re-tracing call
sites, the coverage could not be split across agents at all.
