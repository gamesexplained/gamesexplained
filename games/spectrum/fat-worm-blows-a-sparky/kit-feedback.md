# Fat Worm Blows a Sparky — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills
and kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

The game had three passes. The first (30 September 2026, yozlet with Pi on
DeepSeek Flash) took it through every step. A maintainer's check on
1 October found 18 of 39 sampled claims wrong. On 3 October the
contributor's session reworked those 18 and the typing, and could not run
the independent sample the check asks for (its provider refused the
agents). The same day the maintainer's session (Claude Opus 5.5) redid
coverage, verify, the page and this retrospective on the same branch, and
ran that sample on a second proven model.
Each section says whose notes it holds.

## Skill text that changed what I did

- `60-verify`: "Measure the listing before calling it done": the contributor's rework could not run it (its provider refused the agents) and said so in `TODO.md`; the maintainer's session drew a fixed-seed sample of 60 comments, six from each annotator's range, and had two agents on another model check every clause, where it would otherwise have relied on its own spot-checks, as the first pass did.
- `70-minisite`: "A widget that runs a mechanic is a claim too": in the rework this is why the perspective widget was run against `$811E` over 789 inputs, which found a lost carry (29 where the routine returns 285); in the maintainer's session every port (the multiply, the outlines, the bug rule, the click count) was run against the game's code in the simulator before it went on the page.
- `60-verify`: "The emulator is a second opinion, not an oracle.": when the review said `$D37D` fills 4 KB and `facts.md` said 1 KB, the rework did not pick one: it ran the routine in the simulator and read the stack pointer, and its own count from the loop's immediates turned out wrong as well.
- `60-verify`: "Prove reachability with inputs, not pokes": the ending was reached by writing the disk into the worm's path, so the page says what the code does and leaves open whether a player can get there with fewer than 50 spindles.
- `60-verify`: "Claims about the whole game": every "only" and every count of callers in `facts.md` was taken from an operand scan of the whole code map, not from the routine in view; the list of ports and the nine instructions that name the score came from it.

## Skill text, two more

Outside the five above. In the rework, `50-coverage`'s brief ("Distrust
your own negative results") made it read two stretches its retype had
exposed instead of calling them an artefact: both were further mistypings.
In the maintainer's session, `tool-zesarux`'s sentence on what the ninth
input byte means under each `--joystickemulated` setting explained a
Kempston test that read `$4F` for every direction, and the test was rerun
with Kempston emulation and a control.

## Maintainer asks

- #130: `new_game.py` should create an empty `symbols.json` (done: it writes one).
- #131: `stopwatch` in `check_emulator.py` has no host-load workaround.
- #178: `check-emulator`'s `cheap-loop` check fails on a loaded host, and the Spectrum half of #131 is unfixed.
- #179: the kit has no answer for a provider that runs out of credit mid-run.
- #180: `sna2ctl.py -m <map>` belongs in a SkoolKit tool skill (closed: the step is in `tool-skoolkit`).
- **Let a Spectrum game commit its code map, so the checks can hold `symbols.json` against it.** `kit/spectrum/codemap.py` needs the snapshot, which is never committed, so the check that would have caught this game's first pass (code typed as data at 100 % coverage) runs only on the contributor's machine. The map itself is a list of addresses with no byte of the game in it. Suggest: `codemap.py` writes `codemap.json` beside `symbols.json`, and `check_listing.py` fails a Spectrum game whose `symbols.json` types as data an address the map has as code. Game: Fat Worm Blows a Sparky, 3 October 2026, branch `game/spectrum/fat-worm-blows-a-sparky`.
- **Give the Spectrum launcher a port and a no-window option.** `tools.py --platform spectrum zesarux` pins ZRCP to port 10000 and one instance. This run needed three machines at once (a window for the maintainer, the lead's frame-stepped tests, an independent checker's), and started the extra two with the launcher's own code from a script in `work/`. Suggest: `zesarux --port N --headless`, with `stop` taking the port, in `kit/spectrum/tools.py`. Game: Fat Worm Blows a Sparky, 3 October 2026, branch `game/spectrum/fat-worm-blows-a-sparky`.

## What took longest

```
| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 23 | deepseek-flash | 1 | booted the tape, reached play, took entry and play snapshots, wrote orientation |
| 20-features | 6 | deepseek-flash | 1 | features.md from the inlay, CRASH review, Wikipedia and the author's own page; reference screenshots saved |
| 30-text | 0 | deepseek-flash | 1 | no custom charset: the game uses the ROM font, text is plain ZX codes |
| 40-sweep | 0 | deepseek-flash | 1 | I/O census (ULA $FE, Kempston $1F); ZX-code string sweep found the forgery, menu and redefine text |
| 50-coverage | 622 | deepseek-flash, claude-opus-5-5 | 3 | layout from a recursive trace plus the emulator's executed-address map; 7 agents over disjoint ranges, then the bare runs and untracked data by hand after the cleanup agents failed on a provider balance error; 100% coverage; paused: the maintainer session went back to PR 127; code map from a static trace plus an executed-address map; a second pass on a proven model: the code map rebuilt from a static trace and four recorded sessions (24,147 bytes of code against 18,094 typed), then nine agents on disjoint ranges re-deriving every name and description from the bytes, a tenth range by the lead; 100 % of 39,631 tracked bytes |
| 60-verify | 66 | deepseek-flash, claude-opus-5-5 | 4 | perspective multiply, the $6300 curve and the draw-list quirk read from the image; sparkie count, firing and the HUD counters observed live; Blocked: OpenRouter credits exhausted (402 payment_required, in_flight_budget_exhausted) three children failed at dispatch; independent verification sample deferred pending the contributor's decision. Byte checks against the maintainer's own citations done so far: $D6AE is the high byte of $D6AC JP Z,$DB0C; curve $6300-$637F is 128 bytes $00->$FA; mulScale(191,63)=285 by simulation; $FF00-$FF3F unchanged and $FFC0 scaled (not '$C0-$FF unchanged').; lead's part of verify: nine range reports checked and merged, live tests frame-stepped, facts.md and features.md rewritten; three independent checkers on claude-fable-5-1 still running; Redid the 2026-10-01 review's verify pass: all 18 contradicted claims re-read against the image (listing.json + SkoolKit 10.1's simulator), the retyping pass rebuilt layout.json -> merge.py -> ctl -> symbols.json + listing.json (5,934 bytes of code rescued, routines 230->349, coverage 100% with 0 bare bytes), and the page's mulScale port differential-tested against $811E (789 cases, 0 mismatches). Four read-only verification children on claude-opus-5.5 never ran: OpenRouter 402 payment_required, so no independent sample - recorded in TODO.md. Dominated by the manual byte reads; no single claim took long. |
| 70-minisite | 31 | deepseek-flash, claude-opus-5-5 | 2 | index.html with the rebuilt screen, a port of the perspective curve and multiply, the board map, controls, boot and the draw-list quirk; page rebuilt from the bytes: a view on a port of the projection, the board map from its 129 cells, six sound lists and the menu tune played from simulator-measured tone shapes, a stepper for the bug rule; each port tested against the game's code in the simulator; checked in a browser; three checkers on claude-fable-5-1 ran alongside |
| 80-retro | 3 | deepseek-flash, claude-opus-5-5 | 2 | retro: kit edits made, kit-feedback written, game.json complete; retro for the maintainer's pass: kit feedback for three passes, one lesson file, the contributor's parallel rework merged, the independent check's caveats folded in, verification recorded |
| total | 750 | deepseek-flash, claude-opus-5-5 | | 12.5 h of work, over 87.5 h |

Portable figures:
  minutes to play : 22.6
  min per KB      : 16.1  (621.7 min for 39,631 tracked bytes, 10 agents)
  hours           : 12.5
```

The table adds all three passes together, and it is wall clock. The 543
minutes of the first `50-coverage` were mostly annotation agents running
and re-running after their provider's balance ran out. The maintainer's
session's own steps were 78 minutes of coverage (nine agents in parallel),
26 of verify, 31 on the page and 3 on this retrospective; the three
checking agents ran for about half an hour each alongside the page work,
and a first stretch of that session, on the platform's own pull request,
was not on this game's clock.

**The one change to the kit that would have saved the most minutes:**
`kit/spectrum/codemap.py` at the first pass's coverage step. A check that
fails while code is typed as data would have stopped the first annotation
in its first hour, before nine hours of descriptions were written on a
wrong split and then written again.

## Where the kit cost time, and where each went

The maintainer's session:

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

The maintainer's session:

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

The contributor's rework:

- `kit/skills/core/50-coverage`: the control-file step made
  platform-neutral, with the rule that a code/data sweep is repeated until
  a pass adds nothing, because a wrong type hides what it calls (3,320
  mistyped bytes on one pass, 5,934 at the fixpoint). The two passes' text
  is merged there. Lesson: the same file.
- `kit/skills/spectrum/tool-skoolkit`: "The first control file, from an
  execution map" (`sna2ctl.py -m`, the conversion from
  `cpu-code-coverage get`, decimal addresses unless `-h` or `-l`, guessed
  `t` blocks, the fixpoint). `tool-zesarux` keeps the emulator's half.
- `kit/skills/core/70-minisite`: a widget's port is swept over every
  boundary value of each input, with the case count in the caption.

First pass:

- `coverage.py` and `kit/c64/opcodes.py` followed the seam lift's rename
  of `symbols_export.from_live` to `read_live`; both had crashed on every
  platform.
- `kit/skills/spectrum/zx-spectrum-reference`: the interrupt vector (`IM 1`
  goes to `$0038`; a `.sna` whose `IFF2` is 0 was taken with interrupts
  off).
- `kit/template/work/README.md` and the core skills stopped naming a
  `.vsf`: the snapshot's extension is the platform's own.

## The first pass's notes (30 September 2026)

- **The core skills were written for the C64 with no Spectrum branch.**
  `10-orient` said `.vsf` and `$01`; `50-coverage` said a live
  regenerator2000 server and `--relabel`. The snapshot-extension mentions
  were made generic then.
- **`listing.py`'s hand-over default is `work/entry.vsf`.** `--entry` has
  to be passed explicitly for a `.sna`.
- **The `--live` paths assume a live disassembler.** For the Spectrum there
  is no live reader, so only the `--ctl` form works.
- **The annotation agents' provider ran out of balance mid-run.** Three
  cleanup agents died with `402 Insufficient Balance` before writing
  their files, and the remaining 2,119 code bytes and 6.8 KB of data were
  annotated by hand. Failed agents left no partial output.
- **The minisite was not checked in a browser** in the first pass; no
  browser was available to that session.

## The contributor's rework (3 October 2026): what it met

- **A subagent fan-out that cannot start is an unrecorded step.** Four
  verification agents on a proven model failed on `402 payment_required`
  before their first token, and the run had to decide by itself what that
  means for `60-verify` and for `tier`. Filed as #179.
- **`60-verify`'s "measure the listing" rule has no cheap form.** With the
  provider unusable, the choices were to skip the sample or to take it
  with the model whose work was in question, which proves nothing. The
  maintainer's session took the sample on a second proven model.
- **Counting a loop's passes from its immediates went wrong twice on one
  routine** (the halt screen's backdrop, `$D37D`); running the routine in
  the simulator settled its extent in one call.
- **`sna2ctl.py -m` writes decimal addresses by default and guesses `t`
  blocks.** Both are in `tool-skoolkit`.
- **The seam between two stacked pull requests made a kit ask
  unanswerable for an hour**: the step had nowhere to live until the
  platform's pull request merged (#180).

## Operating system and tools

All passes: macOS arm64 (darwin), Apple silicon; ZEsarUX-13.0
(`ZEsarUX_macos-silicon-13.0.dmg`); SkoolKit 10.1.

The contributor's passes: Python 3.14.7; `check-emulator` 36 of 40 (the
three with workarounds plus `stopwatch` under host load). Commit signing
uses that machine's SSH key.

The maintainer's session: Python 3.9.6 (SkoolKit has no wheel for it and
built from its source distribution, which `kit/spectrum/INSTALL.md`
records); `check-emulator` 41 of 45 on 3 October 2026; node 24.21.0 for
the page's tests; the page checked in the Claude desktop app's browser
pane. Extra ZEsarUX instances on ports 10001 and 10002 were started from
`work/` with the launcher's flags, with `--emulatorspeed 800`, and one of
them with `--joystickemulated Kempston`; all three wrote only under
`tools/`.
