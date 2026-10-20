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

## Candidates

- `lo_hi_address` on a split pointer table that has a label on its second half: regenerator2000 0.9.20 paired each half with its own label rather than with the other half and minted addresses in the middle of routines (`a_C096` inside the NMI handler, `a_E3AB` inside `draw_actor`). The tell was the coverage queue showing bare runs inside described routines. The tables went back to `byte` with the pairing in the comment. The next run on a 6502 game with split tables that meets it should add the case to `tool-regen2000`'s trap on `lo_hi_address`.

## Maintainer asks

- **NesCartDB, StrategyWiki and The Cutting Room Floor refuse the agent's fetch.** Each is named by `nes-reference`, "Where to read about a game first", and each answered 403, a bot check, or a decoy page on 19 October 2026; StrategyWiki's MediaWiki API (`/w/api.php?action=parse`) still answered. The reference should name the API, and the other two should be marked as sites to read by hand until a way in is found.
- **Chrome in headless mode as a page check on macOS.** No Firefox was installed, so the pages were checked with the Chrome already on the Mac, started with a profile under `tools/chrome-profile` and `--headless=new --screenshot`; it rendered every widget. `kit/INSTALL.md`'s "Browser checks" could say so beside the Firefox launcher.

## What cost the most time

Reading the whole 16 KB listing before writing a comment was right, but naming the sound effects from their callers rather than from the driver's dispatch cost a recording session and five corrections; the lesson file says to read the taker first.

## The run

macOS 27.0.1 on Apple silicon, Python 3.9.6, Node 24.18.0, jsnes 2.1.0 in the kit's server (36 of 36 checks), regenerator2000 0.9.20 in its NES mode. The emulator's `sound` capture, the `codemap`, write checkpoints with `when` and `load` of snapshots all behaved as `tool-jsnes` says. One wrong turn in the tool: the server's `screenshot` and `sound` refuse a path outside the repository, which the skill does not say; the scratch files went under `work/`.
