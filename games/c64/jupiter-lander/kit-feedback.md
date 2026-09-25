# Jupiter Lander — kit feedback

Written in the retrospective (`skills/core/re-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Environment

- macOS 25.5.0 (Darwin), Apple silicon.
- VICE 3.10 (`x64sc`, C64SC, PAL, 6569 VIC-II, 6581 SID) with the vice-mcp
  server, from the self-contained GUI build.
- regenerator2000 0.9.20 from cargo.
- Python 3.9.6, the system one. No packages.
- The sandbox shell has no `timeout` command. Noted in `kit/INSTALL.md`.

## Changed, with the reason

### `kit/scripts/vice.py` — new

The kit had a scripted client for the disassembler and none for the
emulator, and the emulator is where the verification time goes. A live test
is a loop: halt, poke, run a fixed number of passes, read back. Done as
individual tool calls that is a dozen round trips per data point and the
machine runs on between each one; done in a script it is one call. Every
measurement in `facts.md` came out of a twenty-line script built on this.

It also wraps the two behaviours that cost the most time this run (below):
`halt_at` uses a checkpoint rather than `vice_execution_pause`, and the
docstring says not to trust the program counter after a break.

### `kit/scripts/r2000.py` — two fixes

- **Response parsing.** It only understood server-sent events. vice-mcp
  replies with a plain JSON body, so the same transport code could not be
  reused for the emulator. Both clients now accept either.
- **Failed calls were logged.** Every mutating call went into
  `annotations.jsonl` whether or not the server accepted it, so a replay
  faithfully reproduces your mistakes. The first data-typing pass here put
  35 rejected calls into the log and the log had to be truncated by hand.
  Errors are no longer logged. A batch is still logged whole, because the
  batch result does not say which member failed; that is noted in the
  docstring and is the remaining hole.

### `skills/c64/tool-regen2000/SKILL.md`

The `data_type` list was wrong. The skill said `byte, word, address, text,
undefined`; the tool takes twelve lower-case values and `text` is not one of
them. Every call in the first pass was rejected with "Unknown data_type:
'Byte'". Added the real list, the fact that the names going in are lower
case while the names coming back out of `get_blocks` are capitalised, the
difference between `address` and `lo_hi_address` (getting that wrong minted
five auto symbols in regions the game never touches and inflated the
coverage denominator), and a note that a custom alphabet has no text type.

### `skills/c64/tool-vice-mcp/SKILL.md`

Five behaviours, four of them discovered the expensive way:

- `vice_execution_pause` reports success and does not stop the CPU. Only a
  checkpoint with `stop` set does. This is the single most expensive thing
  in the file: while the machine is running, every poke is overwritten
  before it is read and every experiment gives a different answer.
- After a checkpoint stops the machine, `vice_registers_get` returns a
  program counter from inside the wait loop rather than the checkpoint
  address. Four tests were abandoned on the strength of that number, each
  time concluding that a routine "is never reached", before the hit counts
  showed the breaks had been happening all along.
- The joystick tools change nothing observable at `$DC00`/`$DC01`, on either
  port, with or without fire, and the server exposes no joystick device
  resource to enable one. The joystick half of this game's input routine is
  therefore traced and not observed.
- `vice_cycles_stopwatch` returned 19,656 cycles between two interrupts a
  CIA latch of `$411B` says are 16,668 apart. 19,656 is exactly one PAL
  frame, so it looks frame-quantised. Timing was taken from checkpoint hit
  counts instead.
- The skill said the tools are unavailable if the emulator was not running
  when the session began. That is not so over HTTP: VICE died on the second
  call of this session, was restarted from `INSTALL.md`, and the tools
  answered again without touching the session.

Also added: a loaded snapshot resumes immediately, snapshot names cannot be
reused, memory reads restart the machine, and a key a game polls rarely may
need the KERNAL buffer rather than the key matrix.

### `skills/c64/c64-reference/SKILL.md`

- The snapshot offset note now says which bytes **not** to confirm it with.
  The reference says to check two known bytes; the two most obvious choices
  are both wrong. `$0000`/`$0001` are the processor port, stored separately
  in the module header, with unrelated values in the RAM underneath. Screen
  memory has moved on since the save. Both were tried, both failed, and the
  offset was right the whole time.
- Added the twin of that trap: a string found in the snapshot file may be
  the game's own copy of the status line rather than the screen, which gives
  an offset wrong by the distance between them.
- Added that the character set and the sprite shapes can share one 2 KB
  block, and that glyphs `$80` and up then render as noise that is not a
  second alphabet.
- Added that several sprites at one position are one picture, and that a
  sprite switched on only sometimes is a part of the object that is only
  sometimes there.
- Added that a game may have no tick at all: count the `cli` and `sei`
  instructions before assuming the interrupt you found drives play.

### `skills/core/re-verify/SKILL.md`

Added a section on measuring without fooling yourself: the machine that
never stopped, the update that ran between the poke and the read, and the
instrument that was not measuring. The middle one is the subtle one. Poking
a velocity and reading back the needle position gave numbers one step away
from the arithmetic, which reads exactly like a misread of the code; it was
one frame of gravity applied between the poke and the draw. The section also
says what to do when code and measurement disagree, which is to find what
would make both true rather than to pick a winner.

### `skills/core/re-orient/SKILL.md`

Save snapshots without ROMs; a loaded snapshot resumes at once; take the
snapshot at a moment you have looked at. The last one cost an hour: the
first steady-state snapshot was captured during an explosion without my
noticing, which made the sprite data say the game has no lander.

### `kit/INSTALL.md`

The emulator can be restarted mid-session without restarting the agent. The
two MCP servers reply in different formats. macOS has no `timeout`.

## Would change, needs a maintainer's call

Filed on 25 September 2026: near-duplicate descriptions, as #29 (identical ones have counted once since). The others have been done in the kit since (#25 says where).

- **`coverage.py` counts what the disassembler will say, not what a reader
  gets.** It is a good metric and I would not weaken it, but two things
  about it surprised me. Placing a labelled, commented symbol every 64 bytes
  over a 2 KB character set takes it from 0 % to 100 % for that region, and
  the honest version of that work (a description per functional group of
  glyphs) and the dishonest version (thirty-two identical comments) score
  the same. Something that compared comment texts for near-duplicates would
  close it cheaply.
- **There is no way to declare a region as "authored data the game reads
  through a hardware register".** `coverage.extra` in `game.json` does the
  job, but the character set is only in the denominator because I put it
  there. Two contributors will make different choices and their percentages
  will not be comparable. A platform default for "the charset block named by
  the video chip's pointer register" would fix it for this machine.
- **`check_copy.py` flags `landscape` as a hype word.** For a game with a
  landscape in it, that is a false positive, and the fix was to write around
  it. Consider allowing a word list per game, or dropping `landscape`.
- **`new_game.py` creates `reference/` with a `.gitkeep`** but nothing tells
  you the article should refer to images by relative path from the game
  folder; I inferred it from the template. One line in `re-article` would
  do.
- **Nothing in the kit says what to do when a documented feature can be
  neither confirmed nor refuted because the tool is broken.** I marked the
  joystick **confirmed** rather than **live** and wrote down exactly what
  was tried, which felt like the right reading of `re-features`, but the
  status table has no word for "the code is clear, the instrument is not
  available".

## What took longest

1. **The thruster flames**, by a wide margin. The code says plainly that
   sprites 2 and 3 are enabled while a thruster is held. Four attempts to
   see it live all failed, for three different reasons at once: the pause
   that does not pause, the program counter that lies after a break, and
   reads that restart the machine. Each failure looked like evidence that
   the flames do not exist, which is precisely the negative result
   `AGENTS.md` warns about. What settled it was patching two bytes so the
   game enables all three sprites every pass, letting it run one frame, and
   taking a screenshot.
2. **The velocity gauge**, for the subtler reason above.
3. **Getting into the game at all.** A cracked release with a trainer, a
   second trainer answer that the key matrix could not deliver, and a start
   key that has to be held for three seconds because only the interrupt
   watches it.

Reading the engine, by contrast, was quick. `$E000`–`$F450` is five
kilobytes; reading all of it before writing a single label meant the names
did not need changing later.

## What I would tell the next contributor

Read the whole engine before you name anything. Then write the live tests as
scripts, not as tool calls. Then, before you believe any live result, prove
the machine actually stopped.

## Second session: the sideways landing

Changed in `kit/` while turning a poked result into a flown one:

- `kit/skills/core/60-verify`: a poke proves a routine accepts a state; an
  input movie from a legitimate state proves a player can reach it. The
  skill now says which claim each one supports and how to build the movie.
- `kit/skills/c64/tool-vice-mcp`: the control-read patch as the way to
  replay inputs deterministically, and three traps met on the way: `run`
  after a stopping checkpoint not resuming, alternating checkpoints skipping
  passes, and an attract-mode game swallowing the first input.
- `kit/CHANGELOG.md`, `kit/VERSION` 0.0.8.
