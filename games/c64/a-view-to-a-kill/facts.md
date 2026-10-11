# A View to a Kill — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshots named in `orientation.md`.

The game is five programs, and each has its own facts, listing and
symbols under `parts/<id>/`: `parts/intro/facts.md`, `parts/paris/facts.md`,
`parts/city-hall/facts.md`, `parts/mine/facts.md`,
`parts/finale/facts.md`. An address is always an address in the part
named with it. This file holds what spans the parts.

## Build

Five programs, loaded one at a time from a menu, each unpacked over the
whole of memory and started at its own entry (`orientation.md`):

| Part | Entry | Interrupt in play | Screen | Sound |
|---|---|---|---|---|
| intro | `$8020` | `$CC00` | bitmap, banks 1 and 2 | the Bond theme, speech |
| Paris | `$43B0`, then `$5A00` | `$5026` | `$0400` | the theme, effects, speech |
| City Hall | `$1000` | `$4022` | `$0400` | the intro's tune, effects |
| mine | `$5660` | `$1022` | `$4000` | Paris's tune, effects |
| finale | `$8000` | the KERNAL's | bitmap `$2000`, `$6000` | none |

No part loads the next: the player goes back to the disk's menu for
each. The intro loads the menu itself when it ends (`load_menu`, intro
`$C4DB`), and ABORT in City Hall and the mine, and RESTORE in the mine,
open a screen that can load it (`menu_screen`, `$0C00` in both).

## The codes

The three later parts start at a KERNAL "PLEASE ENTER CODE" prompt with
the same routine (`read_code`: City Hall `$1088`, mine `$5707`, finale
`$804C`): five characters through CHRIN, compared with a fixed string. A
match stores 1 in `$1BA0`; RETURN before five characters stores 0 and
plays on without the code (the finale goes back to its prompt instead);
a wrong code is read again, with no limit on tries.

| Given by | Where it is shown | Code | Checked by |
|---|---|---|---|
| Paris, on a catch | the telex, Paris `$8140` | CCPHJ | City Hall `$10D8` |
| City Hall, on escape | `mission_complete`, City Hall `$1334` | DB4CT | mine `$5757` |
| the mine, on defusing | `mission_complete`, mine `$0AFE` | ILVCT | finale `$809C` |

- Every code is fixed text. No part computes one from play: there is no
  score, no time or result in them (read in each part's end routine).
- `$1BA0` is the same address in all three parts, and a part reads it
  once, at its end:
  - City Hall (`$7096`): with the code, reaching room 76 with Stacey shows
    DB4CT; without it the game starts again (`$8600`).
  - mine (`$25F2`): with the code, the right bomb digits show ILVCT;
    without it the bomb goes off, whatever the digits (`game_over`, `$25D0`).
  - finale: written, never read. The ending plays only after ILVCT.
- *Live*, 8 October 2026: CCPHJ, DB4CT and ILVCT were each accepted at
  their prompts. City Hall's end with and without CCPHJ, and the mine's
  with and without DB4CT, behaved as above (`parts/city-hall/facts.md`,
  `parts/mine/facts.md`). Every prompt compares only the first five
  characters typed (finale `$8061`-`$806E`).
- So a part can be played from the menu without its code, but only
  Paris gives a code without one: City Hall and the mine can be finished
  only by a player who typed the code that came before.

## Code the parts share

Bytes identical at the same addresses, compared in the unpacked images:

| What | Where |
|---|---|
| the three-voice music driver | intro and City Hall `$C621`-`$C7FE` |
| the Bond theme's notes | intro and City Hall `$E000`-`$E9FF` |
| the second tune's notes | Paris and mine `$E000`-`$FBE6` |
| `read_joystick` | City Hall `$4700`, mine `$17A0` |
| `tick_clock` | Paris `$4170`, City Hall `$6E40` |
| the "OK" sound | City Hall `$6B50`, mine `$3B7D` |
| `read_code` | City Hall `$1088`, mine `$5707`, finale `$804C`, apart from the addresses they name |
| `menu_screen`, apart from its text and addresses | City Hall and mine `$0B00`-`$0D1E` |
| the end text with ILVCT | mine `$0A50`-`$0AFF`, and most of it among City Hall's loader leftovers (ILVCT at `$0AF6`) |

All four playable parts read the joystick in port 2 only (`$DC00`) and
stop CIA 1's timer A, so the KERNAL never scans the keyboard during play;
the keyboard is used only at the code prompts.

## Leftovers

Each part carries bytes nothing in it runs or reads:

- intro: unreachable code at `$9A00`, `$9D00`, `$C500` and `$C5C3`, and
  stale bytes ending in "MOZOOM1000" (`$9FF6`).
- Paris: the file's depacker at `$0800`, and its packed data's tail.
- City Hall: an older code prompt (code "QRS21", `$967B`), an older end
  screen ("WEBL DONE 007 YOUR CODE IS 111122", `$7E5A`), most of the
  mine's end text among loader leftovers at `$0800`-`$0AFF`, and the text
  "MONITOR$C*" left by a machine-code monitor (`$9CF6`).
- mine: stale bytes at `$0D1F`-`$0FFF`, and four map tiles whose bytes
  spell "ZOOM" (`$9FFC`).
- finale: memory nothing in the part reads, holding bytes that match
  Paris's code in part.

## The copies

Every fact here comes from Domark's uncracked PAL disk. A cracked copy
was studied as well and compared with it byte by byte; the About tab
lists where the two differ.

## Live tests

| Test | Part | Result |
|---|---|---|
| each code at its prompt | City Hall, mine, finale | accepted |
| four intro boots, start moved a tenth of a second each time | intro | the credits scrolled in all four (`parts/intro/facts.md`) |
| Bond's room set burning, with and without CCPHJ | City Hall | the DB4CT screen; a new game |
| `end_check` run with set digits, with and without DB4CT | mine | ILVCT; `game_over` |
| ABORT in City Hall | City Hall | `menu_screen` |
| a chase with sound option 3, 30 s | Paris | no call of `locator_beep` |
| the instruction page | Paris | no music |
| main-loop passes against frames | mine | 494 passes in 503 frames |
