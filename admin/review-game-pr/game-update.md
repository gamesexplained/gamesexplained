# Checklist: a pull request that updates a game

Lighter than `new-game.md`, since the game passed that review when it
first merged. Most updates merge as they are; look for what would make
the page wrong, broken or unowned.

## State

1. **Merges with `main`, and the checks pass on the merged tree**
   (`SKILL.md`, section 1).
2. **No standing block.** Any "changes requested" review, and whether
   its asks are done.

## Scope

3. **It stays in its game's folder.** Anything outside it goes through
   `new-game.md` items 17 to 23.
4. **The game's steward agrees.** When `game.json` names a `steward`
   (the tier is `silver-claimed` or `gold`) and the author is someone
   else, the steward should agree before it merges. When the author did
   not make the game (`git log --reverse --format='%an' --
   games/<p>/<slug> | head -1`), say so; it is usually welcome, but the
   maintainer should know.

## What changed

5. **Symbols and listing move together.** If `symbols.json` changed,
   the listing was rebuilt (`check_listing.py`), and
   `coverage_percent` is what `coverage.py` prints.
6. **A higher tier meets the bar.** If `tier` rises, `new-game.md`
   items 9 to 11 apply, and `step_models` names the models of the steps
   that were run again.
7. **New claims rest on something checked.** What the new page text
   says is in `facts.md` or the listing (AGENTS.md, "Verify before
   publishing"). Corrections are made in place; the story goes in
   `agent-history.md`.
8. **New pages are on the site.** In a game that lists its `tabs` in
   `game.json`, a page no tab names is left out of the build with a
   warning: check the build output, and that each new page appears.
9. **New files in `reference/` are shown or loaded by a page**, with no
   audit evidence and no binaries (`new-game.md` items 5 to 8).
10. **The copy follows `kit/style.md`** (no list-shaped headings, #222;
    no claims about the present). If a person rewrote the copy,
    `copy` says `human-edited` or `human`.
11. **The changed pages load cleanly.** `smoke.js` on the game, and a
    look at the screenshots of the pages that changed.
12. **The title says what changed** (`AGENTS.md`, "Titling a pull
    request"); if not, suggest one for the squash merge.
