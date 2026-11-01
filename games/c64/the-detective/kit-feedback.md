# The Detective — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

The run went to Bronze and then on to Silver in one session
(1 November 2026).

## Skill text that changed what I did

- `10-orient`: "A checkpoint on an address that a ROM covers at that moment fires while the ROM runs there": a stop at `$BD0A` inside BASIC's number parser read as the unpacker's exit; stopping first on `$0812` fixed it.
- `50-coverage`: "Inline parameters: the reason a flow disassembler stalls": three routines print the text after their call; typing those strings and tracing past them recovered most of the module.
- `50-coverage`: "Interpreted programs and code loaded as level data": the cast's behaviour is byte code for an interpreter with 27 opcodes; it was parsed with the interpreter's own length table instead of being disassembled.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the room builder, the music player and the script decoder each got a test against the game's own code, and writing the room test found two wrong comments of mine on the unpacker.
- `10-orient`: "Compare it with the play snapshot byte for byte": showed the title's character set and a buffer that play overwrites, so the listing is built from the hand-over.

## What was changed in the kit

Nothing.

## Candidates

A packed program that unpacks itself through several stages, each
jumping back through code the stage before has just written, hides its
entry point from a reading of any one stage. An execute checkpoint over
the program's whole range, re-armed around each stub it stops on, found
this game's entry (`$2000`) in one pass where reading the stages one by
one had taken half an hour. `10-orient` could say so for a packed
program. Only this game is known to have needed it.

## Maintainer asks

- **Name headless Chrome as a fallback for the browser check in `kit/INSTALL.md`.** With no browser extension connected and no Firefox or Playwright in WSL, `70-minisite`'s "Check it in a browser" had no tool the kit names; Chrome on the Windows host, run as `chrome.exe --headless=new --virtual-time-budget=15000 --dump-dom <url>` and `--screenshot`, showed whether each widget filled in and what drew. A line in "Browser checks" saying that this works, and what it cannot do (press buttons, hear sound), would save the next Windows contributor the search.

## What cost the most time

Writing annotation files through `wsl.exe` from Git Bash: every `$` in a heredoc or an inline script was eaten by one shell or the other, so the reliable route was writing each script with the Write tool and running it by name, which a note in `kit/c64/INSTALL.md`'s WSL section would have said up front.

## Things that showed themselves

- `vice_snapshot_save` refuses a name that already exists in the shared
  `tools/vice-home/config/vice/mcp_snapshots/`, and another game's
  `entry.vsf` was there; `snapshot_load()` in `vice.py` caught the clash
  on loading. Name snapshots by game.
- Non-stopping checkpoints on `$2067` and `$222D` counted 0 across a
  warm restart that plainly ran (the title came back); they were not
  quoted.
- A script in the working folder named `dis.py` shadowed Python's `dis`
  module, which `vice.py`'s imports load.
- Follow-up session, driving the menus by stick input. We pressed fire
  with `joy()` while the machine was stopped at a stopping checkpoint and
  then ran frames. We expected the game to see the press. It did not:
  `$DC00` never showed fire. The same press set after a
  `vice_execution_step` was seen. We did not find out why; a state set
  after a step, or at a pause from `pause()`/`frames()`, worked every
  time we checked.
- Presses set between two `frames()` calls always begin at the same
  point of the frame, the vertical sync. In this game the interrupt at
  line 10 reads the stick too. A press seen first by the interrupt can
  be lost, so presses made that way failed far more often than presses
  at random moments. Stepping a random 50 to 6,000 instructions into the
  frame before the press made the bot behave like a player.
- `vice.key()` is a context manager: called as a plain function it
  presses nothing and raises no error. `with key(rpc, "SPACE"):` works.

## Candidates (follow-up session)

A bot that steers a game's own cursor from memory, frame by frame, with
real stick input, turned "traced" claims about the endings into live
ones without a recorded route. Pressing at the vertical sync made it
unreliable in a way that looked like a bug in the bot and was partly a
bug in the game. `kit/skills/core/65-inputs` could say that input given
by the frame starts every press at the same point of the frame, and that
a game reading its controls from an interrupt can treat such presses
differently from a player's. Only this game is known to have needed it.

## System

Windows 11 Pro with WSL2 Ubuntu 26.04; the emulator built from source
(vice-mcp v3.13.2, commit 1e83aab134), 57 of 57 checks passed;
regenerator2000 0.9.20; node v24.21.0 in `tools/node`; headless Chrome on
the Windows host for the page checks.
