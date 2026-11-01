# The Detective — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own title screen and play screens, in the emulator,
  1 November 2026 (`reference/`).
- The crackers' instruction program on the same tape, `DETECTIVE DOX`
  ("Danish Gold Ltd. presents instructions as read from original",
  1987), read from its bytes on 1 November 2026 with its typed
  corrections applied (`orientation.md`, "The image"). Second-hand: it
  copies the original inlay, and misspells as it goes.
- Wikipedia, "The Detective (video game)",
  https://en.wikipedia.org/wiki/The_Detective_(video_game), read
  1 November 2026.
- Commodore Format Archive, interview with Sam Manthorpe,
  https://commodoreformatarchive.com/sam-manthorpe-i-made-the-detective-game-for-the-commodore-64/,
  read 1 November 2026.
- Zzap!64 issue 27 review, reproduced at
  https://everygamegoing.com/larticle/The-Detective-000/28385, read
  1 November 2026.
- The C64-Wiki has no page under "The Detective" (HTTP 404 on
  1 November 2026). Lemon64 and MobyGames refused the fetch (HTTP 403),
  so no outside screenshots were saved.

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2: fire on the title screen starts the game | live | `orientation.md`; `reference/play-hall.png` |
| Inspector Snide walks the mansion with the stick, the rooms drawn at an angle (Zzap: "3D ... Ultimate-style") | live | four directions tested from `work/play-hall.vsf`; `work/sheet.png` |
| Controls with momentum: the author calls them "Newtonian physics" | open | interview |
| Fire opens the investigation menu: icons, chosen with an arrow (a pointing hand) moved by the stick, fire again to activate | live | `reference/investigation-menu.png` |
| Fire with nothing near answers "NOTHING HERE" | live | `reference/nothing-here.png` |
| The screen flashes when Snide is near something to investigate (DOX: "the background flashes"; Zzap and the author: the border) | open | |
| Icons, per the DOX: box = open; list = inventory; microscope ("micro class") = examine; clock = time/pause; cross = use; accuse; question; file up = open door; file down = close door; box & file = put in; gun = use gun; key = unlock; knife & spoon = consume; book = read; hand = drop | open | each icon's handler |
| Some icons appear only when they apply: Question only with another person near, and facing them; Consume only near something to eat or drink | open | |
| Accuse is available at any time | open | |
| Inventory of six items, more with something to carry them in (Zzap) | open | |
| Ten pieces of evidence, put in envelopes, before the accusation (the author) | open | strings `$9DD8` ("THERE ARE 10 ENVELOPES ... YOU MUST FILL ALL OF THEM BEFORE YOU SOLVE THE MURDER"), `$C015` ("EVIDENCE COLLECTED:"), `$BB25` ("YOU DO NOT HAVE THE EVIDENCE TO PROVE IT.") |
| Real time, from 9.10 pm, with a time limit; lose the case if it runs out | open | string `$A1E4` ("THE TIME IS NOW:") |
| Pause, through the time/pause icon | open | string `$A20D` ("PAUSED..PRESS FIRE TO CONTINUE.") |
| Characters walk the house on their own: the Major, the Reverend Wrinklebottom, the cook Hilda Crumble, a butler, a professor, Cynthia Sludgebucket and others; Angus McFungus is the first victim | open | |
| Characters answer questions about McFungus, objects and each other; each drops a clue about the killer (the author) | open | |
| More murders as time passes: strangling, stabbing, a piano falling on Cynthia Sludgebucket on the landing | open | |
| Secret passages (Zzap) | open | |
| Safe codes, originally part of the copy protection (the author) | open | strings `$8A44`-`$8AE8` ("YOU FIND A SAFE!", "TYPE IN THE COMBINATION:", "THE SAFE IS OPEN!") |
| Rain and thunder on the sound chip; a title tune (Zzap) | open | |
| RESTORE restarts the game when a flag allows it | traced | NMI handler `$294A`; `orientation.md`, "Steady state" |
| Status line of text under the room ("YOU ARE IN THE HALL") and a picture panel to its right | live | `reference/play-hall.png` |

## Beyond the documentation

Found in the code, not in the manual.

- The game's start-up is a jump table at `$2000` with four entries
  (`$2048`, `$2747`, `$289E`, `$32CE`); only the first is known to be the
  start. (open)
- A library where the player types a book's name: "TYPE IN THE NAME OF
  THE BOOK YOU WANT:" (`$BDF4`), with `101 DETECTIVE STORIES` (`$BE68`)
  stored beside it. (open)
- Over thirty items by name, and furniture, with lines for Examine
  (`facts.md`, "Memory layout"); among the items a bomb, an elephant
  gun, bullets and a syringe. How many there are, and which line goes
  with which, is open.
- Characters say things on their own as they move about ("AWFUL
  WEATHER", "HAS ANYONE SEEN MY SCALPELS?") and answer "ASK ABOUT:"
  (`$B5D3`) questions. (open)
- A cast of ten, with a biography each, on the title screen
  ("INTRODUCING THE CAST..", `$2161`; the biographies at `$8E65`). (open)
- Endings in text: the lights going out and the player shot by an
  unseen assassin ("THE GAME IS OVER.", `$2639`-`$267E`), being led
  away at gunpoint (`$BD34`), and a promotion ("CREDIT TO THE FORCE,
  TAKE ... PROMOTION!", `$BD6E`). (open)

## Open questions

- Is the release analysed the original game with only the crackers'
  packer in front of it, or did the crackers change the game's code too?
  No other release was available to compare.
- Release year: the title screen says 1986; the interview says it was
  coded in 1986 and released in 1987.
