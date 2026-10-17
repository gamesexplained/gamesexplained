# Where Time Stood Still — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": the view's renderer and the area maps are held to the game's own `$87CF` and `$A012` run on the kit's Z80 (`test_maps.js`), and the first run of that test showed the block split the annotation had read as the constant `$80` is rewritten for each area.
- `zx-spectrum-reference`: "If a fact you need is not here, say so in the game's": the AY's levels and pitch were measured from ZEsarUX's own WAV rather than recalled, and the name "Fuller" for the joystick on port `$7F`, which came from memory, was taken out of the listing and the pages.
- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": of the checker's 18 marks, 17 held and one was a unit left unsaid, and one comment it passed was wrong.

## What was changed in the kit

- `kit/spectrum/snapshot.py`: reads the 128K `.sna` (131,103 or 147,487 bytes); `read(path, bank=n)` gives RAM bank n at `$C000`, and `banks(path)` every bank with the paging. The self-test covers both forms. The reader refused the only snapshot a 128K game can be analysed from.
- `kit/spectrum/banks.py` (new): reports a 128K snapshot's paging and makes a part (`bank-0N`, `"bank": N`) for each bank the CPU did not see, with the snapshot in its `work/`, and a blank bank excluded as blank.
- `kit/spectrum/bankmap.py` (new): records which bank each address ran in, from ZEsarUX's transaction log through a named pipe, as `BANK:ADDR` tokens; it opens the pipe for writing for a moment, since ZEsarUX 13.0 hangs on it otherwise (#411).
- `kit/spectrum/codemap.py`: reads `BANK:ADDR` tokens, gives a bank's part its own bank at `$C000` (`image`, `owns`), and with a banked map follows a call into `$C000` only into the bank that ran there, listing the targets it did not follow.
- `kit/spectrum/zesarux.py`: `frames` steps the frame of the machine running (70,908 T-states on a 128K, where it stepped 69,888), and says to call `enter_step` when `run` is refused, rather than retrying twenty times. `kit/spectrum/test_zesarux.py` covers both.
- `kit/spectrum/test_banks.py` (new): `banks.py`, `codemap.py`'s banked tokens, image, trace and owns, and `bankmap.token`, on a 128K snapshot the test makes.
- `site/lib/ay.js` (new): the site's AY-3-8912 and beeper, with a player; `kit/spectrum/test_ay.js` (new) holds it to ZEsarUX's measured pitch, levels, noise and beeper. The site had no AY.
- `kit/scripts/build.py`: versions every script and stylesheet in `lib/` for the cache, where a list of names had left out `sn76489.js` and `listing-reads.js`, so their pages could keep a stale copy after a deploy.
- `kit/skills/spectrum/zx-spectrum-reference/SKILL.md`: the 128K `.sna` is read; the AY's clock, pitch and noise formulas and ZEsarUX's measured levels; an address at `$C000` names no code without its bank.
- `kit/skills/spectrum/tool-zesarux/SKILL.md`: `get-io-ports` for the AY's registers, `--aofile` to record the sound, and the banked map (`bankmap.py`, `banks.py`, `codemap.py`).
- `kit/skills/core/50-coverage`, the loop's step 2: a value read off the snapshot, an operand included, is what the last store left, so search for stores before building on it. Until now only `brief.md`, which a single agent never reads, said so; `games/c64/wasteland` met it first (map 49's poisoned ground). The lesson: `kit/lessons/2026-10-17-where-time-stood-still.md`.

## Candidates

The AY's envelope (registers 11 to 13, bit 4 of a volume) is not in
`site/lib/ay.js`. This game never uses it: in every recording the page
plays, no volume has bit 4 set and the envelope's registers are never
written. A game whose music does use it would play wrong with nothing to
say so. `test_ay.js` would say: a recording that sets bit 4 of a volume
fails until the envelope is modelled and measured. No other game folder
has AY music yet.

The sample was drawn before four of the six parts had comments. The
Codex usage limit held the checker for 40 minutes, and the 60 were drawn
from `main` and bank 3 while the data banks were being annotated, so
those banks' comments have not been sampled. The skill would say, in
`60-verify`: draw the sample from every part's comments, after the last
part is annotated, even when the checker is ready sooner. No other game
folder shows the same order.

## Maintainer asks

- #320: the 128K snapshot and the bank parts are done; check-emulator's 128K checks (paging, the AY's registers, contended-bank timing) remain.
- #411: report ZEsarUX's transaction log hanging on a named pipe upstream.

## What cost the most time

A recorder of which bank each address ran in (`kit/spectrum/bankmap.py`), which a 128K game cannot be mapped without, and which took most of the orientation to build and get past the emulator's hang on a pipe.

## Versions

ZEsarUX 13.0 (release, `ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz`) as a Spectrum 128 (`--machine 128k`), SkoolKit 10.1, the Codex CLI 0.163.0, Python 3.13.16 and Node 22.22.0, on Linux x86_64 (Ubuntu 24.04, no display) in a hosted session. The tape loads in about nine minutes at normal speed; ZEsarUX needs the SDL 1.2 library, as `kit/spectrum/INSTALL.md` says.
