# Fire — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `steps`: "Drive that run with a player that can score, one that tries each press on copies of the machine": I wrote a look-ahead player before annotating the game's pages, and its coverage run reached the score's carries, 999 and the game over, which random presses never did.
- `50-coverage`: "search for writes to that address, the operand's byte included": before naming flags_0B bit 3 as never set, a test with the R3 keys held found arc4_move setting it.
- `gnw-reference`: "Run each helper once with the bit set and once clear": reading the skip helpers against the rule that TM skips when the bit is set caught that I had read them backwards.

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
