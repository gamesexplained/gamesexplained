# Jet Set Willy — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`) of the run on the
Berlin Cracking Service release, 16 and 17 October 2026, which took over the
game from an earlier run on another crack. Which skill text changed what the
run did, what the kit got wrong or left out, what was changed, what cost the
most time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "things a player who finished the game would not know, each verified live": I ran every bug and secret in VICE before writing its section, which turned the fall from the Watch Tower from a traced risk into nine lives lost on one jump, and showed that the bed Maria guards does nothing when Willy stands on it.
- `40-sweep`: "A claim the analysis makes is unverified until it is traced or observed here": the imported listing described another crack's boot, trainer and packer, so I rewrote every comment those had shaped from this release's own code instead of carrying them over.
- `50-coverage`: "Before calling 100 %, go through that list and say what each stretch is": the stretches between the tune, the rope sprites and the rooms held text, which turned out to be the programmers' own source for the rope code, climbing, Willy's shape and an initialiser, each matching the shipped code.
- `60-verify`: "Both the sample and the audit are done by checkers: agents that wrote none of the comments": the maintainer's sample went to a Codex checker, which marked seven wrong, and the audit to fresh agents, one range at a time.
- `60-verify`: "`reference/` is published as it stands, so it holds only what a page shows or loads": I removed the earlier run's import audit, its review script and an unused picture from `reference/`.

## What was changed in the kit

- `kit/CHECKING.md`, "Who checks": a maintainer's checkers are fresh agents on a proven model that wrote none of the listing, and the run's own model may check when it is proven. It said "Never the model that made the run", which sent this game's maintainer check to a second provider, whose sign-in and usage limit held the run up for hours, when a fresh agent on the run's own proven model was what the maintainer wanted (Aaron, 17 October 2026).

## What the run met

- The listing this run inherited was of a different crack, whose boot, trainer and packer leave other bytes in memory; the BCS release hands over at the title with none of them, so `orientation.md` and every comment about the start-up were written again.
- A Python script started in the background printed nothing until it ended; `python3 -u` shows its progress as it runs.
- `until ! pgrep -f <name>` never ends, because the pattern matches the loop's own command line.
- `vice_registers_set` takes `{"register": "PC", "value": ...}`.
- The Codex sign-in's one-time code lasts 15 minutes and expired while the contributor was away; a second code went through when they were back. Codex's usage limit then ran out after the zero-page audit, and the rest of the audit went to fresh Claude agents.

## Candidates

- `60-verify`, a restart point saved mid-fall: the game saves where Willy restarts after a death when he enters a room, fall count included, so a death after a long fall into a room replays the same fatal fall on every life. Entering a room in each state the player can be in (falling, jumping, on a rope) and dying there would find it. Only this game is known to have the shape; the next run that meets it adds the rule.

## Maintainer asks

None.

## What cost the most time

The line in `kit/CHECKING.md` that ruled out the run's own model as a checker, reworded on this branch: it put the maintainer's check on a second provider, and the run waited hours for a sign-in and then for a usage limit, where a fresh agent on the run's own proven model would have started at once.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04 container, no display); VICE v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`) under Xvfb, check-emulator 55 of 55; regenerator2000 0.9.20; Python 3.13.16; node 22.22.0; OpenAI Codex CLI 0.163.0 for the maintainer's sample; Chromium from Playwright for the browser checks.
