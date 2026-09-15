---
name: re-article
description: Build the game's minisite. The article (index.html, "How it works") from symbols.json, facts.md and the reference images; the listing behind the Source code tab; optional Maps/levels and Play tabs. Interactivity first, evidence beside every claim, copy written last under the house style.
---

# The minisite

Every game is a small site with the same tabs in the same order: **How it
works** (`index.html`, authored), **Source code** (`source.html`, generated
from `listing.json` plus `facts.md` and `cheats.md`), **Maps / levels**
(`levels.html`, authored, only when the game has level data worth a page),
**Play** (`play.html`, authored, only when a JavaScript version exists),
**About** (generated from `game.json`, `features.md`, `orientation.md`, git).
`kit/scripts/build.py` assembles them; you write the authored ones.

Every `$XXXX` inside a `<code>` element on any tab becomes a link into the
Source tab, so write addresses in code spans and the evidence links itself.

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
  Keep its `<!-- tabs -->` marker; the build puts the tab bar there.
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

Write the copy **last**, as a separate pass, under `kit/style.md`. Set
`copy` in `game.json` to `agent`, `human-edited` or `human` honestly. The
page title is the game's name. Reference images are referred to by
relative path from the game folder (`reference/<name>.png`).

## Maps / levels, when there is one

Render the level data the article only excerpts: every maze, screen or
room as a picture drawn from the extracted bytes, with the per-level
parameter tables beside them. Reuse the article's renderers. Omit the page
rather than pad it.

## Play, when there is one

A behavioural port in JavaScript, built from the documented mechanics and
the extracted data, not a transpile. The article's mechanic widgets are
usually the seed. Optional; most games will not have it at first.

## Outputs

`index.html` opening cleanly from disk; `listing.json` built and passing
`check_listing.py`; `game.json` with `copy` set; `build.py` producing the
minisite without errors.
