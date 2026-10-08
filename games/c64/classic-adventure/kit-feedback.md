# Classic Adventure — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `50-coverage`: "A comment a program writes is one claim made for every record": the 1,749 per-record descriptions of rooms, messages, objects, exits and rules are written by a script from each record's own bytes, with empty records named rather than given a sentence meant for full ones.
- `50-coverage`: "Resolve every pointer table before excluding a region": each stretch excluded (the wrapper's leftover copy, the fill before the dictionary, the RAM above the program) was checked with `opcodes.py --refs` first, and the one hit, a self-modified operand, was explained in the reason.
- `50-coverage`: "Know how far a description reaches": room 115's text crosses `$4000` and message 169's crosses `$8000`, so each got a second label at the edge.
- `tool-regen2000`: "A `JSR` into ROM traces the RAM underneath": the tracer marked `$FFBA`-`$FFFD` as code from the KERNAL calls, and it went back to undefined before the ROM range was excluded.
- `20-features`: "every documented feature you cannot find in the binary": the Pavloda fast loader the inlay names is not on this disk, and it stays open with what was looked at.

## What was changed in the kit

<one line per change: the file and what it now says. For a change that
carries a lesson, name its file in `kit/lessons/` and stop there: the
lesson is told once, in that file. Any other change (a script, a path,
the site) says why here. Text added to a core skill also names the other
game folder where it would have mattered, as games/<platform>/<slug>
(80-retro, step 3).>

## Candidates

<a silent failure no other game could be named for (80-retro, step 3),
one paragraph each: what went wrong unnoticed, how it was caught, and
what the skill would say. The next run that meets it makes the edit.
"None." if there were none.>

## Maintainer asks

<one bullet per ask. Filed: "- #123: the ask in one line". Not filed (no
yes, or no way to reach the repository): "- **The ask, in one line.** The
problem, what it cost, what to change and where", which the repository
files when the pull request merges. Prose around the bullets is free;
check_docs.py checks the bullets.>

## What cost the most time

<one sentence: the single change to the kit that would have saved the most time>
