---
name: 20-features
description: Before reading any code, write down everything the game is documented to do and collect reference screenshots. Turns "what am I looking at" into a checklist and stops the commonest misreadings.
---

# Features first

Read the manual, box copy, in-game instruction screen, a wiki page, a
longplay: anything that says what the game *does*. Write it down as a
checklist in `features.md` before annotating a single routine. Then treat
every documented feature you cannot find in the binary as an **open
question, never as absent**.

This is the cheapest defence against the worst failure mode: confidently
misreading code because you did not know what you were looking at. Two
ways it goes wrong:

- A phrase in stored text reads like a typo. It is a control legend
  naming a player ability. Miss the ability and its whole mechanic gets
  labelled as cosmetic, and everything downstream inherits that.
- A documented feature looks absent after an exhaustive byte search. It is
  present in a different alphabet (see `30-text`).

The game's own instruction text is itself a feature list. Find it early
(the string sweep in `40-sweep` does this in seconds).

The platform skill says where to look first; for the C64 that is the
game's C64-Wiki page, read as a form. Whatever you read, record it under
Sources in `features.md` with its address and the date, and put the wiki
page and the manual in `links` in `game.json`, where the About tab shows
them.

## Status words

Every row in `features.md` carries one:

| Status | Meaning |
|---|---|
| **open** | documented, not yet found in the code |
| **traced** | found in the code, but could not be exercised in the emulator (an input the tools cannot deliver, a state that cannot be reached); say what was tried |
| **confirmed** | traced in the code and consistent with what the emulator shows |
| **live** | observed directly in the emulator |
| **differs** | the code does something other than the documentation says |

"Absent" is not a status. If you believe a feature is not there, write
down exactly what you searched for and how, and leave it **open**.

## Picture reference

Text says what a game does; pictures pin down what it looks like, and most
misreadings are visual: a tile taken for a wall, a panel taken for
decoration, a banner nobody knew existed. Before annotating:

- **External screenshots first**: box art, magazine reviews, longplay
  stills, preservation-site galleries. They show states your own session
  may never reach and they are independent of your setup. **Ask the
  contributor before downloading anything.**
- **Then your own**, from the emulator at every distinct state you can
  reach. Name them by state in `reference/`.
- Poke your way into states that are hard to reach by playing (set the
  level counter, empty the collectables) and screenshot those too.
- **Designate the title screen**: set `title_image` in `game.json` to the
  `reference/` file showing the game's title screen — the first thing a
  player sees on boot or attract. The index card renders it beside the
  memory map; `build.py` warns when it is missing.

Use the set in both directions: every region of a reference image should
end up attributed to a routine, and every drawing routine should be
findable in some image. A routine that draws something you have never
seen is a state you have not reached or a misreading. An on-screen
element with no routine is an open question.

## Outputs

`features.md` with a status per row; `reference/` with named screenshots;
`title_image` set in `game.json` to the title-screen shot; a note in
`features.md` of the sources used.
