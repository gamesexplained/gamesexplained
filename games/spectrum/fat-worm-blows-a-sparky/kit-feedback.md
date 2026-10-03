# Fat Worm Blows a Sparky — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills
and kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

The game had two passes. The first (30 September 2026, yozlet with Pi on
DeepSeek Flash) took it through every step. A maintainer's check on
1 October found 18 of 39 sampled claims wrong, and a second pass
(3 October 2026, the maintainer's session, Claude Opus 5.5) redid
coverage, verify, the page and this retrospective on the same branch.
What follows is the second pass's, with the first pass's notes kept at
the end.

## Skill text that changed what I did

- `60-verify`: "Measure the listing before calling it done": I drew a fixed-seed sample of 60 comments, six from each annotator's range, and had two agents on another model check every clause; I would otherwise have relied on my own spot-checks, which is what the first pass did.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the page's perspective, bug and click-count ports were each run against the game's code in the simulator before they went on the page (102,656 values of the multiply, 3,000 outlines, 556 arrangements of bugs, all 256 dividers).
- `60-verify`: "Prove reachability with inputs, not pokes": the ending was reached by writing the disk into the worm's path, so the page says what the code does and leaves open whether a player can get there with fewer than 50 spindles.
- `60-verify`: "Claims about the whole game": every "only" and every count of callers in `facts.md` was taken from an operand scan of the whole code map, not from the routine in front of me; the ports list and the nine instructions that name the score came from it.
- `tool-zesarux`: "ninth byte is the joystick, `1` bits pressed, and it means whatever": my first Kempston test read `$4F` for every direction; this sentence said why (the second emulator had the default joystick), and the test was rerun with `--joystickemulated Kempston` and a control.

## Where the kit cost time, and where each went

- **A control file with code typed as data reads as finished.** The first
  pass reached 100 % with 5.9 KB of code typed as data. A script now
  catches it: `kit/spectrum/codemap.py`.
- **No way to run one routine.** Every "this routine returns" in the first
  pass was read, not run. A script now does it:
  `kit/spectrum/simulate.py`.
- **The ROM's cassette code, copied into the image, was listed as the
  game's.** Silent, and it publishes ROM. A script now finds it:
  `kit/spectrum/romcopy.py`, named in `tool-skoolkit`.
- **`models.py` credited a model with a game whose sample it failed.**
  The failed sample now stays in the record (`verification.failed`) and
  the model is left out (`kit/scripts/models.py`, `kit/CHECKING.md`).
- **A snapshot path that does not exist loads nothing and says nothing**
  (ZEsarUX's `snapshot-load`), and `enter-cpu-step` is refused for a
  moment after a mode change. Both showed themselves only as nonsense
  twenty minutes later. The client fix (raise on a missing file, retry
  the refusal, prove the stop) is in the maintainer's own branch,
  `kit/zesarux-window`, with the launcher's first-run dialogs.
- **A run to a checkpoint the game no longer reaches never returns**, and
  the emulator then answers nothing. It shows itself (a hang). The remedy
  is in `tool-zesarux` ("Step a game that ignores the display by its own
  loop"): bound the run and look at `PC`.
- **`symbols_export.py <game>` with no `--ctl`** says the platform has no
  live reader. It shows itself; the Spectrum form is
  `symbols_export.py <game> --ctl work/<slug>.ctl`.
- **One emulator, several users.** The launcher pins port 10000. The
  demonstration window, the lead's tests and an independent checker each
  needed a machine of their own, so this pass started extra instances
  with the launcher's own code on ports 10001 and 10002
  (`work/verify/emu2.py`). See the asks.

## Candidates

Seen in this game only; the next run that meets one makes the edit.

- A page's sound from a list of speaker edges. `index.html` turns edges
  (T-states) into an audio buffer for the effects and for the 55-second
  tune. A second beeper game would want it in `site/lib/spectrum.js`.
- A table of tone shapes measured by running the game's own tune player
  in the simulator with a port tracer (`work/tests/tune_extract.py`).
- A frame picture one pass behind the snapshot's variables: the screen in
  a play snapshot was drawn before the worm's last move, so a page's
  rebuilt view compared with it is a few pixels off for that reason.

## What was changed in `kit/`, and why

Second pass:

- `kit/spectrum/codemap.py` (new): the code map from a static trace and
  executed-address maps, `symbols.json` held against it, and `--refs`.
  Lesson: `kit/lessons/2026-10-03-fat-worm-blows-a-sparky.md`.
- `kit/spectrum/simulate.py` (new): one routine from a snapshot in
  SkoolKit's Z80 simulator. Same lesson file.
- `kit/spectrum/romcopy.py` (new): stretches of RAM that follow the ROM at
  one offset. Same lesson file.
- `kit/skills/core/50-coverage`: "When the disassembler does not follow
  control flow" rewritten without tool names; says a wrong split does not
  show and to run the platform's check after every merge.
- `kit/skills/core/60-verify`: the Spectrum's reference search
  (`codemap.py --refs`) beside the C64's.
- `kit/skills/spectrum/tool-zesarux`: "Finding a game's code, and what its
  data is for" (executed map, read and write maps, the check, sessions
  that replay, stepping by the game's own loop).
- `kit/skills/spectrum/tool-skoolkit`: "Is any of it the ROM?", "A first
  control file from what executed" (`sna2ctl.py -m`, measured), "Testing
  what a routine computes".
- `kit/scripts/models.py`, `kit/CHECKING.md`: a failed sample is kept
  under `verification.failed` and its model is not proven by the game.
  A rule of the delivery, so its reason is here: a model must not be
  credited with a result another model produced.
- `.github/workflows/ci.yml`: the self-tests of the three new scripts and
  of `models.py`.

First pass:

- `coverage.py` and `kit/c64/opcodes.py` followed the seam lift's rename
  of `symbols_export.from_live` to `read_live`; both had crashed on every
  platform.
- `kit/skills/spectrum/zx-spectrum-reference`: the interrupt vector (`IM 1`
  goes to `$0038`; a `.sna` whose `IFF2` is 0 was taken with interrupts
  off).
- `kit/template/work/README.md` and the core skills stopped naming a
  `.vsf`: the snapshot's extension is the platform's own.

## What took longest

TIMINGS

## Maintainer asks

- #130: `new_game.py` should create an empty `symbols.json`.
- #131: `stopwatch` in `check_emulator.py` has no host-load workaround.
- **Let a Spectrum game commit its code map, so the checks can hold `symbols.json` against it.** `kit/spectrum/codemap.py` needs the snapshot, which is never committed, so the check that would have caught this game's first pass (code typed as data at 100 % coverage) runs only on the contributor's machine. The map itself is a list of addresses with no byte of the game in it. Suggest: `codemap.py` writes `codemap.json` beside `symbols.json`, and `check_listing.py` fails a Spectrum game whose `symbols.json` types as data an address the map has as code. Game: Fat Worm Blows a Sparky, 3 October 2026, branch `game/spectrum/fat-worm-blows-a-sparky`.
- **Give the Spectrum launcher a port and a no-window option.** `tools.py --platform spectrum zesarux` pins ZRCP to port 10000 and one instance. This run needed three machines at once (a window for the contributor, the lead's frame-stepped tests, an independent checker's), and started the extra two with the launcher's own code from a script in `work/`. Suggest: `zesarux --port N --headless`, with `stop` taking the port, in `kit/spectrum/tools.py`. Game: Fat Worm Blows a Sparky, 3 October 2026, branch `game/spectrum/fat-worm-blows-a-sparky`.

## The first pass's notes (30 September 2026)

- **The core skills were written for the C64 with no Spectrum branch.**
  `10-orient` said `.vsf` and `$01`; `50-coverage` said a live
  regenerator2000 server and `--relabel`. The snapshot-extension mentions
  were made generic then; the control-flow step is the second pass's.
- **`listing.py`'s hand-over default is `work/entry.vsf`.** `--entry` has
  to be passed explicitly for a `.sna`.
- **The annotation agents' provider ran out of balance mid-run.** Three
  cleanup agents died with `402 Insufficient Balance` before writing
  their files, and the remaining 2,119 code bytes and 6.8 KB of data were
  annotated by hand. Failed agents left no partial output.
- **The minisite was not checked in a browser** in the first pass; no
  browser was available to that session. The second pass's page was.

## Operating system and tools

Both passes: macOS arm64 (darwin), Apple silicon; ZEsarUX-13.0
(`ZEsarUX_macos-silicon-13.0.dmg`); SkoolKit 10.1.

First pass: Python 3.14.7; `check-emulator` 36 of 40.

Second pass: Python 3.9.6 (SkoolKit has no wheel for it and built from
its source distribution, which `kit/spectrum/INSTALL.md` records);
`check-emulator` 41 of 45 on 3 October 2026; node 24.21.0 for the page's
tests; the page checked in the Claude desktop app's browser pane. Extra
ZEsarUX instances on ports 10001 and 10002 were started from `work/` with
the launcher's flags, with `--emulatorspeed 800`, and one of them with
`--joystickemulated Kempston`; all three wrote only under `tools/`.
