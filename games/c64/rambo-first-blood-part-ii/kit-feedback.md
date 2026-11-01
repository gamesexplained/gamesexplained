# Rambo: First Blood Part II — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/50-coverage`: "Look for a routine that takes its own return address off the stack, reads what follows the call through it": found the text printer at $C077 and its 18 inline script addresses, typed them as data and restarted the disassembly after each.
- `kit/skills/core/50-coverage`: "makes the disassembler mint a symbol": explained the nine symbols the music driver's BIT skips minted in other routines and tables, instead of describing them as variables.
- `kit/skills/c64/tool-vice-mcp`: "reach the monitor only through `codemap.py`": did not, at first; a raw socket to the monitor wedged the emulator twice before the run went back to `codemap.monitor()`.

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
