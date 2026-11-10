# Super Wonder Boy in Monster Land — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

<up to five lines, the one that mattered most first, each written as
- `<skill folder>`: "<words copied exactly from the passage>": what you did, or did not do, because of it
or the one line "None." (80-retro, step 1). check_docs.py fails while this placeholder is here,
once game.json has a tier (80-retro, step 7) and on any pull request.>

## What was changed in the kit

- `kit/c64/project.py`: retain automatic labels when reconstructing a project, so a direct export does not lose them; `kit/c64/test_project_labels.py` covers the round trip.
- `kit/scripts/test_browser.py`: isolate the missing-browser test from installed macOS applications; `kit/c64/test_tool_isolation.py` resolves the temporary path before comparing it on macOS.

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
