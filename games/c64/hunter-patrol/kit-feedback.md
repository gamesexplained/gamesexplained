# Hunter Patrol: kit feedback

Written in the retrospective of a run on claude-sonnet-5-5 (13 November 2026, cloud container, Linux x86_64, no display, vice-mcp v3.14.0 release, regenerator2000 0.9.20).

## Skill text that changed what I did

- `10-orient`: "Take the snapshot at a moment you have *looked at*": I saved the first play snapshot without looking and it held the plane exploding, so every control test on it gave nothing until I took a second one with the crash variable at 0.
- `10-orient`: "Save the hand-over too": the hand-over could not be the first instruction of the game, because the cracker's menu runs after the game is unpacked, so `entry.vsf` is the machine waiting at the menu's last question.
- `tool-vice-mcp`: "`vice_keyboard_matrix` (row and column, or a key name)": the key for RUN/STOP is named `STOP`; `RUN/STOP` is refused with "Unknown key name".

## What was changed in the kit

Nothing.

## Candidates

None.

## Maintainer asks

- **Say in `kit/skills/c64/tool-vice-mcp` which key names `vice_keyboard_matrix` takes.** `RUN/STOP` failed with "Unknown key name" and `STOP` worked. A game that starts on RUN/STOP, as this disk's documents do, loses a minute to it. Add the list of names, or the one for RUN/STOP, to the "Keys" paragraph.

## What cost the most time

Reaching the game from a crack that has a scrolling intro, text pages, a loading picture and two menus in a row took six separate steps with waits between them, and the kit has no helper that records such a route once and replays it.

## Second run, on claude-opus-5-5 (13 November 2026)

### Skill text that changed what I did

- `50-coverage`: the 64-byte cap on auto-named data symbols explained why commented tables still counted as bare; renaming them fixed it.
- `60-verify`, `checker.md`: "a comment corrected for one wrong detail often has another" made the settle step search for the same belief elsewhere, and two more comments held it.
- `70-minisite`, "Graphics": "a viewer that asks for every frame finds the shapes the listing missed" — drawing every pointer showed the filled blocks `$B2-$BF` and `$D2-$DF` and the formula that would reach `$D2`.
- `kit/skills/c64/steps`, "The sound": passing the timer's period to `mount` kept each tune at its own rate; two tunes on two timers needed two players.

### What was changed in the kit

- `kit/scripts/listing.py`: the warning "byte(s) with no type between code" now skips a stretch whose every byte `game.json` excludes with a reason. Such bytes are padding the run has looked at and decided no instruction reaches; the warning told the next run to type them, which would count them as code. Checked by rebuilding this game's listing: the warnings for its excluded padding went, and no other warning changed.

### Maintainer asks

- **Say in `kit/CHECKING.md` what a run does when an unproven model made only the start of the coverage and a proven model rewrote every comment after it.** This run rewrote all 48 of the first run's comments and sampled the result on a proven model, and `models.py` still asks for a maintainer's sample, because `step_models` names the unproven model under `50-coverage`. That may be the rule's intent (its labels and types stayed), but the text does not say so, and a run could be tempted to leave the first model out of `step_models`.

## Play tab run, on claude-opus-5-5 (18 November 2026)

### Skill text that changed what I did

- `70-minisite/play.md`, "Pace it by the machine's clock": "measure each routine's own cycles instead" with `kit/cpu/profile.js`. The least-squares fit left the page 2.8 % slow and gave a loop turn of nine cycles a cost of 1,450; the profiler brought it within 1 %.
- `kit/c64/lockstep.js`, irqBytes: "the port reads each through `P.io.irqByte(a)` and gets, in turn, the values the game's main program read" — the collision latches only agreed once the port made one read for each of the game's LDAs.

### Where the kit fell short

- A polling loop on an address that is not the raster's (the fire button at `$DC01`), yielded as bare turns, let the port leave the loop on input the game had not reached; the lockstep then ran the game for `maxFrames` and reported only that no checkpoint came. Naming the loop's head as a checkpoint at every turn fixed it. `play.md` could say so where it describes bare yields.
- A `{ cycles, at }` yield followed by the same yield with no checkpoint between counts as one stop, so a loop whose only yield is its delay loses every other turn; the loop's head needs a checkpoint of its own.
- `kit/cpu/profile.js`'s `perCall` charges a generator routine (one that yields across many stretches, such as a main loop) all its own cycles per call, which made one stretch cost minus a million cycles. Leaving such routines' code out with `place` (returning null) and not counting their calls fixed it; the profiler's header could say so.
