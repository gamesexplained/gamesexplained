# Fat Worm Blows a Sparky — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/60-verify/SKILL.md`: "The emulator is a second opinion, not an oracle.": when the review said `$D37D` fills 4 KB and the committed `facts.md` said 1 KB, I did not pick one. I ran the routine in SkoolKit's simulator and watched the stack pointer. The review was right (lowest SP `$F000`) and my own count of the loop's bodies was wrong (`DJNZ` with `B=$07` runs its body eight times, so 1,842 pushes became 2,048). Without that sentence I would have published a contradiction of the maintainer built on an off-by-one.
- `kit/skills/core/70-minisite/SKILL.md`: "A widget that runs a mechanic is a claim too.": this is why the perspective widget was ported and then *run against* `$811E` over 789 inputs, rather than read beside the disassembly. It is the only reason the port's lost carry was found: it agreed with the routine on the page's own inputs and returned 29 where the routine returns 285.
- `kit/skills/spectrum/tool-zesarux/SKILL.md`: "finds the code that runs": the executed-address map is what made a whole-image analysis tractable, but the passage described one sweep. Measuring it against a fixpoint showed a single pass finds 3,320 of the 5,934 mistyped bytes, and the 2,600-byte difference is behind stretches the first pass still called data. The fixpoint requirement is now in this skill and in `50-coverage`.
- `kit/skills/core/50-coverage/brief.md`: "Distrust your own negative results": applied to my own work mid-task. The `$8F00` and `$B719` stretches that the retype exposed as "data the ledger does not count" looked like an artefact of my change; reading them showed `$8F34` is a real entry into a patched `JP` chain and `$B719` is a quadrant variant of the code around it, so both were further mistypings rather than a regression.
- `kit/skills/core/60-verify/SKILL.md`: "Measure the listing before calling it done": it asks for about 60 comments checked by an agent that wrote none of them. That did not happen (see "Where the skills and tools misled this run"), and naming it here is the record: the listing's comments carry the same unproven-model risk as the page, and `TODO.md` says so.

## Maintainer asks

The contributor then asked for the pull requests to be opened, and the asks
below were filed as `kit-ask` issues for this second pass:

1. **#178 — `check-emulator`'s `stopwatch` check is host-load dependent.** It
   reads 0.22-0.41x of 3.5 MHz under load and fails its 0.5x floor, so the
   "36 of 40" in `game.json` is partly an artefact of the host. (An earlier
   ask, that `new_game.py` create an empty `symbols.json`, is **done**:
   `new_game.py:41` writes one.)
2. **#179 — the kit has no answer for a provider that runs out of credit
   mid-run.** Four verification children could not start at all
   (`402 payment_required`, "requested up to 128000 tokens, but can only
   afford 115058"), and nothing in the kit says to check a balance before a
   fan-out, to lower `max_tokens`, or what a `60-verify` should do when its
   independent sample cannot run.
3. **#180 — `sna2ctl.py -m <map>` belongs in a SkoolKit tool skill.** Filed
   when `kit/spectrum/tool-skoolkit/SKILL.md` was #127's unmerged file and
   #128 therefore had nowhere to put the step. **#127 merged during this
   pass**, the step moved into `tool-skoolkit` ("The first control file, from
   an execution map"), and `tool-zesarux` now keeps only the emulator's half
   and points at it. Ask closed.

## What took longest

```
| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 23 | deepseek-flash | 1 | booted the tape, reached play, took entry and play snapshots, wrote orientation |
| 20-features | 6 | deepseek-flash | 1 | features.md from the inlay, CRASH review, Wikipedia and the author's own page; reference screenshots saved |
| 30-text | 0 | deepseek-flash | 1 | no custom charset: the game uses the ROM font, text is plain ZX codes |
| 40-sweep | 0 | deepseek-flash | 1 | I/O census (ULA $FE, Kempston $1F); ZX-code string sweep found the forgery, menu and redefine text |
| 50-coverage | 543 | deepseek-flash | 1 | layout from a recursive trace plus the emulator's executed-address map; 7 agents over disjoint ranges, then the bare runs and untracked data by hand after the cleanup agents failed on a provider balance error; 100% coverage |
| 60-verify | 40 | deepseek-flash | 3 | the original pass read the perspective multiply, the $6300 curve and the draw-list quirk off the image, and observed the sparkie count, firing and the HUD counters live. The 2026-10-01 review then found 18 of 39 sampled claims wrong, so this pass re-read all 18 against the image, re-did the typing (see below), and differential-tested the page's `mulScale` against `$811E` on 789 inputs. 27 of the 40 minutes were the blocked attempt whose four `claude-opus-5.5` children never started (OpenRouter `402`), stopped and restarted while the contributor decided |
| 70-minisite | 0 | deepseek-flash | 1 | index.html with the rebuilt screen, a port of the perspective curve and multiply, the board map, controls, boot and the draw-list quirk |
| 80-retro | 0 | deepseek-flash | 1 | retro: kit edits made, kit-feedback written, game.json complete |
| total | 612 | deepseek-flash | | 10.2 h of work, over 86.8 h |
```

The 543 minutes in `50-coverage` is wall clock, most of it the annotation
agents running (and re-running after the provider balance ran out), not the
agent's own tool calls. The run's own active work was nearer one hour. The 40
minutes in `60-verify` include 27 minutes stopped on the clock while the
contributor decided what to do about the second provider failure of the run.

**The one change to the kit that would have saved the most minutes:** a
named step, in `50-coverage`, for separating a whole-image game's code from
its data when the disassembler does not follow control flow. This run spent
its first coverage hour working that out (a recursive tracer plus ZEsarUX's
`cpu-code-coverage`); the step is now in the skill, so the next control-file
platform starts with it. What the review added is that the step must
**iterate**: see the 3 October entry in `kit/lessons/`.

## What was changed in `kit/`, and why

- **`coverage.py` and `kit/c64/opcodes.py` followed the seam lift.**
  Both imported `symbols_export.from_live`, which the listing/symbols seam
  lift renamed to `read_live`. Both crashed on every platform, C64
  included; the seam lift's checks did not run `coverage.py`. Pointed at
  `read_live`.
- **`50-coverage` gained a step for control-file platforms** ("When the
  disassembler does not follow control flow"), naming the executed-address
  map and the recursive trace.
- **`kit/skills/spectrum/tool-zesarux` gained `cpu-code-coverage`** in its
  command table and a "Finding a game's code" section, with the traps: it
  must be enabled while the machine is *running*, and a `snapshot-load`
  can switch it off.
- **`kit/skills/spectrum/zx-spectrum-reference` gained the interrupt
  vector**: `IM 1` vectors to `$0038` in ROM, the handler only scans the
  keyboard and bumps `$5C78`, and a `.sna` whose `IFF2` is 0 was taken with
  interrupts disabled.
- **`kit/template/work/README.md` and the core skills** stop naming a
  `.vsf`: the snapshot's extension is the platform's own.
- **`kit/CHANGELOG.md`** has what this game taught the kit: a control file
  is not a flow tracer, and a game that overwrites its own screen makes the
  hand-over snapshot the disassembly base.

### Changed in the second pass (3 October 2026)

- **`50-coverage`'s control-file step is now platform-neutral and says to
  iterate.** It had named SkoolKit, `sna2skool.py` and ZEsarUX's
  `cpu-code-coverage`, which is platform fact in a core skill
  (`PLATFORMS.md`'s second rule, and what the review asked to move out), and
  it described a single sweep. It now states the rule - map plus recursive
  trace, everything else is data unless a reference reads it - and the
  finding that makes the difference: **a wrong type hides what it calls**, so
  the sweep must repeat until a pass adds nothing. Measured here: one pass
  found 3,320 mistyped bytes, the fixpoint 5,934.
- **`kit/skills/spectrum/tool-skoolkit` gained "The first control file, from
  an execution map"**: the `tr`/`sed` one-liner that turns
  `cpu-code-coverage get` output into `sna2ctl.py`'s one-address-per-line
  map, the trap that its addresses are **decimal** unless `-l` is passed,
  the trap that its `t` (text) blocks are the tool's guess and must be
  checked, and the fixpoint requirement. `tool-zesarux` keeps the emulator's
  half - the coverage command and the map's format - and points at it. This
  is where the review asked for the step to live; it could not go there
  until #127 merged, which it did during this pass (#180, closed).
- **`70-minisite` gained the boundary-value sweep** for widget ports: every
  boundary value of each input register plus random cases, with the case
  count in the caption, and the example of a port that agreed with the game
  on the page's own inputs and returned 29 where the routine returns 285
  because it masked the accumulator before taking the carry out of the top.
- **`kit/lessons/2026-10-03-…-the-typing-pass.md`** is this pass's lesson
  entry: the fixpoint, the fill extent settled by simulation rather than by
  counting loop bodies, and the port checked by sweep.
- **`game.json`** — `kit_version` 0.0.44 to 0.0.66, and the `tools` note
  records that SkoolKit's simulator and `sna2ctl.py` were used, not just its
  disassembler. `tier` stays **bronze**: the model is unproven *and* the
  review's independent sample could not be run (see below).

## Where the skills and tools misled this run

- **The core skills are written for the C64 with no Spectrum branch.**
  `10-orient` said `.vsf` and `$01`; `50-coverage` said
  `work/<state>.vsf`, a live regenerator2000 server, `--relabel` and
  `tools.py stop vice`. The platform skills cover the machine and the
  tools, but no core skill pointed at them. The snapshot-extension mentions
  are now generic.
- **No bootstrap for `symbols.json` on a fresh game.** `new_game.py` does
  not create one and `symbols_import.py` reads it, so a first run has to
  invent the first control file. Asked for as a maintainer ask.
- **`listing.py`'s hand-over default is `work/entry.vsf`.** `--entry` has
  to be passed explicitly for a `.sna`; two tools (`listing.py`,
  `symbols_import.py`) share the assumption.
- **A whole-image game needs a code/data layout step.** SkoolKit's
  `sna2skool.py` disassembles linearly and does not follow control flow,
  so the eight-figure coverage queue `50-coverage` assumes never appears.
  Now a named step.
- **The `--live` paths assume a live disassembler.** `symbols_export.py`
  and `coverage.py` dispatch `read_live` per platform; for the Spectrum
  there is no live reader, so only the non-live form works. The command
  line does not say so.
- **The annotation agents' provider ran out of balance mid-run.** Three
  cleanup agents died with `402 Insufficient Balance` after doing their
  reading and before writing their files, forcing the remaining 2119 code
  bytes and 6.8 KB of data to be annotated by hand. Not a kit bug, but the
  kit has no way to resume a failed agent's work except a fresh run with a
  new prompt, and the failed agents left no partial output.

- **The minisite was not checked in a browser.** No browser or headless
  browser was available to this session, so `index.html` was checked only
  by `node --check` on its script and by the `build.py` link check. The
  `70-minisite` browser pass (every canvas drawn, every control clicked,
  the rebuilt screen compared to a reference) was not done and is in the
  game's `TODO.md`. A hosted agent with a browser is the next step.

### Met in the second pass (3 October 2026)

- **A subagent fan-out that cannot start is not a blocked step, it is an
  unrecorded one.** Four verification children on a proven model failed on
  `402 payment_required` before their first token, and the run then had to
  decide by itself what that means for `60-verify` and for `tier`. The kit
  asks for a proven-model redo of `60-verify`; it says nothing about the
  case where the sampling cannot happen. Filed as #179, and `TODO.md` now
  records the gap where the next reader will find it.
- **The `60-verify` step's "measure the listing" rule has no cheap form.**
  It asks for a sample of about 60 comments checked by an agent that wrote
  none of them; with the provider unusable, the only options were to skip it
  or to sample with the model whose work is in question, which proves
  nothing. The rule needs a fallback that a run can execute by itself (a
  byte-search check for the commonest comment errors, perhaps), or a
  sentence saying what to do instead.
- **Counting a loop's bodies from its immediates is one off, every time.**
  `DJNZ` with `B=n` runs the body `n+1` times, and `C=$07` with `DEC C / JR
  NZ` runs seven. Two counts, both wrong, on the same routine, and the
  simulation that settled it took one call. Worth a line in the ZX Spectrum
  reference's "mistakes that bite", where a run would meet it before
  spending the time.
- **`sna2ctl.py -m` has two traps the review's suggestion did not
  mention**: it writes addresses in decimal unless `-l` is passed, and it
  emits `t` (text) blocks on its own guess about printable bytes. Both are
  now in the `tool-zesarux` step.
- **The seam between #127 and #128 made the review's kit ask unanswerable
  for an hour.** "Rewrite `50-coverage` around `sna2ctl.py`" needs a
  SkoolKit skill to live in, and `tool-skoolkit` was #127's unmerged file, so
  #128 put the step in `tool-zesarux` and filed #180. #127 merged while the
  pass was running; the step moved and the ask closed, but a run cannot
  know when to wait for a stacked PR and when to place something
  temporarily.

## Operating system and tools

macOS arm64 (darwin), Apple silicon, Python 3.14.7. ZEsarUX-13.0
(`ZEsarUX_macos-silicon-13.0.dmg`), `check-emulator` 36 of 40 (the three
with workarounds plus `stopwatch` under host load). SkoolKit 10.1. Commit
signing uses this machine's SSH key; every commit is signed.
