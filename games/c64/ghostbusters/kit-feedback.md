# Ghostbusters — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## What the kit got wrong or left out, and what was changed

- **A test with nothing that must pass** (`60-verify`). The port of the
  account-number checker read the number's four bytes (`$23`-`$26`) in
  reverse order and agreed with the game on 20,000 random cases, since
  nearly every random name and number is refused by both. Feeding back
  numbers the game had printed failed at once. `60-verify` now has a
  paragraph, "A test must contain cases that have to succeed".
- **Pacing** (`70-minisite`). The skill describes a per-routine cost fit.
  This game's pass cost follows its state byte `$3A`, and measuring the
  median cycles per state on `kit/c64/machine.js` (hooks where a pass
  begins and ends, the raster handler's own cycles left out) got the page
  to within about 1 % of the original's passes per frame with no fit. A
  first cost worked out from the lockstep's counts left the game stuck in
  one state. The skill now gives the measured way beside the fit.
- **The page's own chips** (`70-minisite`, `c64-reference`). The page
  runtime raised the raster interrupt only when its line was reached; the
  game's start-up enables it after the line has passed and the VIC raises
  it at once from the latch in `$D019`. The reference says so now, and
  `70-minisite` says to run the page's runtime in node from the cold
  start before opening a browser.
- **A level select for a game with no levels** (`70-minisite`). The start
  buttons are a scripted player that plays the game's own start (F1, a
  name, a car, the shop) without drawing, setting by hand only what keys
  cannot reach. Added as a paragraph under the level picker.
- **`kit/c64/machine.js`** (committed earlier on this branch): CIA timers
  (opt-in), the NMI and joystick port 1, which the speech player and the
  controls need. `test_machine.js` covers them.
- **`site/lib/c64.js`**: `renderFrame` can keep its chip state and take
  the memory directly, so a live page draws a frame in one pass (4.3 ms
  instead of 16.7 ms, the same pixels).
- **`site/lib/sid.js`**: an `onFrame` option, so a page can follow the
  frames the SID model has played.
- **Merging main**: upstream's `irqBytes` (0.0.42) arrived after this
  port was finished. The one byte of that kind here, the random number
  `$06`, is left as a race and described on the Play tab; a later pass
  could move it to `irqByte`.

## Operating system and tools

Linux 6.18 x86_64, Ubuntu 24.04 cloud container with four cores and no
display; VICE release v3.13.1 (`v3.13.1-linux-x86_64-gui.zip`),
regenerator2000 0.9.20, Python 3.11.15, node 22.22.2, Playwright with
Chromium 1194. Nothing to add to the install notes. The container
stopped once for about four hours during `60-verify` and killed the
background agents; `work/` survived, and the agents were restarted with
briefs saved in the scratch folder.

## Maintainer asks

This session could reach only the contributor's fork, so no issues were
filed. The asks are in the pull request's description under
"Maintainer asks".

- `models.py` rejects the model id as the session names it,
  `claude-opus-5-5[1m]` (the 1M-context form); the run records
  `claude-opus-5-5`, with a note in `timings.json`.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 44 | claude-opus-5-5 | 1 |  |
| 20-features | 7 | claude-opus-5-5 | 1 |  |
| 40-sweep | 32 | claude-opus-5-5 | 1 |  |
| 50-coverage | 314 | claude-opus-5-5 | 1 |  |
| 60-verify | 263 | claude-opus-5-5 | 2 | verify: 20 simulator scripts in work/verify; no single feature dominated; the account-number and Marshmallow tests took longest; includes a pause of about four hours (16:13-20:20Z) when the container stopped; the session names the model claude-opus-5-5[1m], its 1M-context form |
| 70-minisite | 330 | claude-opus-5-5 | 1 | the Play tab: the whole game ported in five groups, checked in lockstep, then paced by costs measured on the machine |
| 80-retro | 3 | claude-opus-5-5 | 1 | kit-feedback, skill edits, merge of main |
| total | 996 | claude-opus-5-5 | | 16.6 h of work, over 16.7 h |

The one change to the kit that would have saved the most minutes:
measuring a Play port's pass costs per game state on the machine from the
start, instead of deriving them, which would have saved the time spent
finding why the page stalled.
