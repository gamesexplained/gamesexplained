# Balloon Fight — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A number handed through a request byte": the sound effects had been named from the bits the game sets, and reading the driver's dispatch the other way round found five of them answered by other routines, and one bit answered by none.
- `50-coverage`: "Never bulk-disassemble every labelled address": the tracer had decoded a palette block as code; the undocumented opcodes it showed were the tell, and the block went back to bytes instead of being traced further.
- `nes/tool-regen2000`: "An NROM-128 cartridge is in the image twice": the $8000 half was excluded in `game.json` before the first annotation, so no routine was counted twice.
- `60-verify`: "Both the sample and the audit are done by checkers: agents that wrote none of the comments": a fresh agent found 13 of 60 wrong, three of them beliefs I would not have questioned.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the flight port's first version matched the game's arithmetic and failed the lockstep by ignoring the three-frame input cycle; the test found it before the page said it.

## What was changed in the kit

- `site/lib/apu.js`: new, a model of the 2A03's APU with a player, a piano roll and a recorder for a driver run once a frame; `kit/nes/test_apu.js` checks it. It is the NES's `sound` row, which was "none yet" when this run started.
- `kit/skills/nes/steps/SKILL.md`: the `sound` row names `apu.js` and the way this game's page drives the game's own driver on `cpu6502.js` with a hook at every store to the APU; the `page` row names `apu.js`.
- `kit/lessons/2026-10-19-balloon-fight.md`: the lesson on request bytes and on typing split pointer tables.

- `kit/nes/machine.js`, `kit/nes/lockstep.js`, `kit/nes/check_machine.js`, `kit/nes/test_machine.js`, `kit/nes/test_lockstep.js`, `kit/nes/fixtures/machine.json`: the NES's `machine` and `lockstep` rows, which were "none yet". The machine is checked against jsnes on a program of its own in CI (the fixture jsnes recorded) and by hand on a game's snapshots.
- `site/lib/nes.js`: `NES.ppu`, the PPU's registers and memory as the CPU reaches them, one model for the page's port and the kit's machine.
- `site/lib/apu.js`: `live` and `host`, the chip fed a frame of writes at a time in an AudioWorklet built from the file's own text, for a Play tab. Its queue holds half a second of frames and makes an older frame's writes rather than dropping them, as `kit/scripts/test_live_sound.js` asks of the other chips; `kit/nes/test_apu.js` checks it.
- `kit/cpu/cpu6502.js`: `romPages`, pages read from memory whose writes go to `io`, beside the `ioPages` the Commodore 16 added: the NES passes its RAM's mirrors and its registers as `ioPages` and its cartridge's ROM as `romPages`.
- `kit/skills/nes/steps/SKILL.md`: the `machine` and `lockstep` rows filled.
- `kit/lessons/2026-10-19-balloon-fight.md`: three more lessons, from the port.

## Candidates

- **A per-routine check against a pool of real call states.** `work/port/pool.js` records, at every entry to a named routine during a long session on the kit's machine, the registers, the RAM and the chips (reservoir sampling, 150 a routine), and `work/port/check.js` runs the port's routine and the game's on each and compares memory, chips and the registers the callers read. It found every mistake in a plain routine before the lockstep ran, with the routine named, and it needs nothing a platform does not already have. It could be `kit/scripts/port_pool.js`, with the game's part a list of routine addresses.
- **A pilot for the lockstep.** `test_play.js`'s pilot reads the game's stage from hooks on the machine and plays every mode with scripted and random input; `70-minisite/play.md` could say that a run of short games moved between layouts covers more than one long one.

- `lo_hi_address` on a split pointer table that has a label on its second half: regenerator2000 0.9.20 paired each half with its own label rather than with the other half and minted addresses in the middle of routines (`a_C096` inside the NMI handler, `a_E3AB` inside `draw_actor`). The tell was the coverage queue showing bare runs inside described routines. The tables went back to `byte` with the pairing in the comment. The next run on a 6502 game with split tables that meets it should add the case to `tool-regen2000`'s trap on `lo_hi_address`.

## Maintainer asks

- **NesCartDB, StrategyWiki and The Cutting Room Floor refuse the agent's fetch.** Each is named by `nes-reference`, "Where to read about a game first", and each answered 403, a bot check, or a decoy page on 19 October 2026; StrategyWiki's MediaWiki API (`/w/api.php?action=parse`) still answered. The reference should name the API, and the other two should be marked as sites to read by hand until a way in is found.
- **Chrome in headless mode as a page check on macOS.** No Firefox was installed, so the pages were checked with the Chrome already on the Mac, started with a profile under `tools/chrome-profile` and `--headless=new --screenshot`; it rendered every widget. `kit/INSTALL.md`'s "Browser checks" could say so beside the Firefox launcher.

- **A page's library tested as a window property.** `window.BalloonFight` is undefined for a script's top-level `const`; the Play page took its fallback path with every library loaded, until the test was `typeof`. `70-minisite`, "Check it in a browser", could say so beside the fallback it asks for.
- **A check that a page carries no program.** The levels page had embedded the whole PRG ROM as `game_rom` and nothing caught it; `check_docs.py` or a new script could take each page's base64 blocks and refuse one that holds a run of the listing's code bytes longer than a routine. The pages now carry an image with every code byte zero but the sound driver.

- **The pictures on a Play tab.** `70-minisite`, "Play", says how a port is written and checked, and nothing about the game's pictures, so a Play tab shows them as the game does. A playable recreation with the original's look is what publishers that enforce, Nintendo among them, have taken down even when it held none of their code. Balloon Fight's Play tab draws made-up tiles in the slots the game draws from (`work/art/`), which leaves the play exact. The maintainers could decide whether a Play tab for such a publisher should always do that, and say so in the skill.

## What cost the most time

Reading the whole 16 KB listing before writing a comment was right, but naming the sound effects from their callers rather than from the driver's dispatch cost a recording session and five corrections; the lesson file says to read the taker first.

The port: the 6502's flags. Four routines add with a carry their caller left (a spark's bolt, a balloon's timer, a bird's next decision, a spark's speed), and the lockstep showed each as a one-byte difference thousands of frames apart; a port's routines return the carry where the game's leave one that matters, and the callers pass it on. The register side effects the callers never read were left out of the per-routine check instead of being tracked.

## The run

macOS 27.0.1 on Apple silicon, Python 3.9.6, Node 24.18.0, jsnes 2.1.0 in the kit's server (36 of 36 checks), regenerator2000 0.9.20 in its NES mode. The emulator's `sound` capture, the `codemap`, write checkpoints with `when` and `load` of snapshots all behaved as `tool-jsnes` says. One wrong turn in the tool: the server's `screenshot` and `sound` refuse a path outside the repository, which the skill does not say; the scratch files went under `work/`. The Play tab's run: the lockstep runs 100,000 frames in about 75 seconds with `irqBytes` on, 20 without; the page was checked in the Mac's Chrome through its DevTools protocol (`work/port/chrome.js`: navigate, keys, screenshots, the console), which is how the keys were shown to reach the port.
