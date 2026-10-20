# Choplifter — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Draw the play screen from memory": the How it works page runs the attract mode from the listing on the kit's 6502 instead of showing a recording, and holding its frames to Apple2TS's found the listing missing the graphics library's inline arguments.
- `60-verify`: "A wrong comment is usually one belief written down more than once": for each of the 13 wrong comments I searched the listing for the same belief and corrected 37 more with them, 30 of them a shape's pointer called the shape.
- `60-verify`: "Comments a program wrote, a decoder describing every record": the 202 comments a script wrote on the shape table got 20 draws of their own, and the rate is given weighted, 17.4 %, beside the plain 16.3 %.
- `50-coverage`: "Find every call site of every such routine": every call to the graphics library's ten inline-argument services was found and its argument typed as data before the disassembly was restarted.
- `70-minisite`: "Every `$XXXX` inside a `<code>` element on any tab": the world X values and the C64 version's addresses were moved out of code spans, where they had linked to unrelated records of this listing.

## What was changed in the kit

- `kit/apple2/apple2ts_server.mjs`, `apple2ts.py`, `tools.py`, `screen.py`, `snapshot.py`, `check_emulator.py` and their tests: the kit's Apple2TS server can be an Apple II Plus (`--model iiplus`, and `"model"` on reset and boot), and a snapshot records its model. check-emulator gains a fifth phase that tells the two models apart, 49 of 49 checks. Choplifter's original disk stops on the enhanced IIe, which shows itself, so no lesson.
- `kit/skills/apple2/apple2-reference`, `tool-apple2ts` and its `workarounds.md`, `kit/apple2/INSTALL.md`: what the II Plus differs in, and that Apple2TS's II Plus still runs the 65C02's extra opcodes. Facts about the machine and the tool.
- `kit/apple2/codemap.py` and `test_codemap.py`: turn the server's record of the instructions it ran into a game's `codemap.json`, so `check_listing.py` holds an Apple II game's code typed as data, as it does on the C64. A script, so no lesson.
- `site/lib/apple2-speaker.js` and `kit/apple2/test_speaker.js`: a player that turns a log of speaker clicks into sound and draws its notes, held to the speaker's rule by the test. No Apple II page could play a sound before.
- `kit/skills/apple2/steps`: the `sound` row names the player, its test, and a game's own `reference/` script run against the server's clicks by a `test_*.js`. A path.
- `kit/skills/core/50-coverage`, "Inline parameters": give each argument a label or a comment of its own, or the listing holds a gap where it is and a page running the code reads zeros, until #442. It would have mattered in `games/c64/choplifter`, whose listing leaves out 86 bytes of arguments after 43 calls, and in `games/c64/little-computer-people` (8 after calls). The lesson is `kit/lessons/2026-10-20-choplifter.md`.
- `kit/lessons/2026-10-20-choplifter.md`: the run's lessons.

## Candidates

- **Name a routine from its callers, not from what it sounds or looks
  like.** The noise routine's two comments called it an explosion's,
  because noise is what an explosion makes; its only callers are a tank
  firing and a jet firing. The checker's sample did not draw it, and
  building the sound player, which plays each effect from its call site,
  showed it. `60-verify` could say: for a routine whose comment names
  what it is for, read its callers before the sample, since the sample
  only checks what it draws. I could name no other game folder where it
  went wrong.

## Maintainer asks

- #442: Catch inline arguments the listing leaves out after a call, which `listing.py` only prints as "likely a missed instruction" and `check_listing.py` lets pass.

## What cost the most time

An Apple II Plus in the kit's emulator from the start would have saved
the most: the original disk stops on the enhanced IIe with a lone `M`,
and finding why and building the II Plus took the run's first 40 minutes.

## Operating system and tools

Linux 6.18 x86_64 (Ubuntu 24.04, no display), Node 22.22.0, Python
3.13.16. Apple2TS 3.7.0 (git c900979) in the kit's server, as an Apple
II Plus, 49 of 49 checks. regenerator2000 0.9.20 in its Apple II mode.
Chromium through Playwright for the page checks.
