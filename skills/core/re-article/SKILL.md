---
name: re-article
description: Build the interactive article, index.html, from symbols.json, facts.md and the reference images. The only page most readers will open. Interactivity first, evidence beside every claim, copy written last under the house style.
---

# The article

Audience: technical gamers who love game design and want to know how the
game works, and who do not read assembly. Assembly is evidence, shown
beside the claim; the explanation is in terms of what the player sees.

**Interactivity is the point.** A page you can play with beats a page you
read. Every section should have something to press: step a mechanic,
scrub a tune, flip through the level data, toggle an overlay on a
reconstructed screen.

## Sections

Not every game has every section. Order them to suit the game.

1. **One frame, rebuilt from memory.** Render the play screen from the
   snapshot's screen memory, colour memory and character set with your
   own code, not a screenshot. It proves the data is understood and it is
   the base for overlays.
2. **The player and the enemies.** What they are drawn with (character
   graphics, sprites, both), how they move, how they collide.
3. **Controls.** What the game reads and how, including anything the
   manual never mentioned.
4. **Levels and data.** Where the level lives, what format, a browser for
   it. If placement is procedural, show the rule and let the reader roll
   it.
5. **Enemy movement and AI.** The actual decision rule, steppable.
6. **Progression and difficulty.** The tables, as tables, and what they
   do to play.
7. **The sound.** The player for the stored tunes and effects, tied to
   the bytes that produce each note.
8. **Secrets, quirks and bugs.** The best part. Things a player who
   finished the game would not know, each verified live, with the
   evidence beside it.

## Building it

- One self-contained `index.html`. Inline CSS and JavaScript; no
  build step; external resources only for fonts. It must open from disk.
- Start from `kit/template/index.html` for the design tokens and layout.
  A finished example to borrow patterns from is any Gold game in `games/`:
  canvas renderers for character sets and screens, Web Audio note
  players, table explorers.
- Embed only the data you need: extracted character set, level data,
  tables, tune bytes. Small excerpts for commentary; never the program.
- Every claim shows its evidence: the table, the bytes, the register, the
  screenshot from `reference/`.
- Reference images go in `reference/`; the page refers to them by
  relative path.

## Copy

Write the copy **last**, as a separate pass, under `kit/style.md`. Then run
`python3 kit/scripts/check_copy.py games/<platform>/<slug>` and fix what
it flags. Set `copy` in `game.json` to `agent`, `human-edited` or `human`
honestly. The page title is the game's name.

## Outputs

`index.html` opening cleanly from disk; `check_copy.py` passing;
`game.json` with `copy` set.
