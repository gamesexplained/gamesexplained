# Karateka — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Sweep the whole input space, not a few plausible values": the guards' brain was ported and run against the game's routine over every random number at every distance in every stage, and over 100,000 random zero pages, which showed the page's figure of 72 in 256 was 183.
- `70-minisite`: "Draw from the memory the game draws from": the stages on the Maps / levels tab start from the zero page, `$0D5E` and `$0F00`-`$0F0F` that each stage's snapshot held at its entry, which no listing holds, rather than from the listings alone.
- `70-minisite`: "Read each heading for a list": two headings that named their section's contents were rewritten as its finding, and a discovery that held two findings became two sections.

## What was changed in the kit

- `site/lib/apple2-speaker.js`: `notes(log, voices)`, and `voices` on `mount`'s tunes, read a player that clicks two voices at one pitch, whose click spacings alternate as the voices drift; the one-voice rule cut each of Karateka's notes into scraps. `kit/apple2/test_speaker.js` holds the two-voice rule.
- `site/lib/apple2.js`: `Apple2.monitor`, hooks for the kit's 6502 that stand in for the Monitor's WAIT (`$FCA8`) with its measured cycles, so a game's sound that times itself with WAIT clicks when the game's does. `kit/apple2/test_monitor_hooks.js` holds it to the timings in `apple2-reference`, "Timing".
- `kit/skills/apple2/steps/SKILL.md`: the `simulator` row names `Apple2.monitor`, and the `sound` row names `voices: 2`, so the next Apple II run finds both.
- `kit/lessons/2026-10-24-karateka.md`: take a mechanic's figures for the copy from the tested port.

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

Each widget's test against Apple2TS (the demo, the tunes, the sounds and the stages) needed its own recorder in `work/`, and a kit script that runs a part from its entry in Apple2TS and records the page shown and the clicks at each flip would have saved the most.

## Operating system and tools

As in `game.json`: Apple2TS 3.7.0 in the kit's server and regenerator2000 0.9.20 on Linux 6.18 x86_64 in a hosted session, with nothing the install notes do not already say. A snapshot taken with the joystick chosen (`$C4` = 0) ignores the arrow keys, and Apple2TS centres the paddles, so the hero stands still; writing 1 to `$C4`, as the K key does, gives the keys back.
