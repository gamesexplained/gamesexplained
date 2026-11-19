# Summer Games II — kit feedback

Written in the retrospective of a run on claude-opus-5-5 (17 November
2026, cloud container, Linux x86_64, no display, vice-mcp release v4.0.0
with VICE 3.10, regenerator2000).

## Skill text that changed what I did

- `70-minisite`: "a viewer that asks for every frame finds the shapes the listing missed": drawing every pointer of High Jump's sprite area showed 24 shapes at `$AB00-$B0FF` that no frame table reaches.
- `60-verify`: "every other comment that says the same thing": the one Fencing comment the sample caught calling a bitmap cell "a row" led to 19 more with the same mistake.
- `15-parts`: "with its snapshot taken while it is there": the swimming events build their pictures over the code they copied away, so their listing came from a snapshot taken during a race rather than at the entry.

## What was changed in the kit

- `kit/scripts/new_game.py`: the title made from the slug keeps a Roman numeral in capitals ("Summer Games II", not "Summer Games Ii"). `str.title()` lowercased it, and the wrong title sat in every template file's heading until each was rewritten by hand. Checked on the slugs of this game, Rambo, Fist II, Ghostbusters 2 and X-Out.

## Candidates

None.

## Maintainer asks

- **Say in `kit/skills/core/15-parts` that a change to a part's `build` in `game.json` needs every listing rebuilt.** Adding the build to `game.json` made `check_listing.py` fail on all thirteen built parts with "no longer rebuilds from its own bytes"; `listing.py <part> --rebuild --write` on each fixed it. The message names the command, but a run that edits `game.json` late, as most do, meets thirteen failures at once and has to work out that one edit caused them all.

## What cost the most time

A music driver for each of the eleven parts with sound had to be found and written by hand; a helper that took a part's tune-start and play-step labels and built the driver would have saved most of an hour.
