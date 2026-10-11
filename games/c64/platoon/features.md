# Platoon — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Web search result summaries, read 7 October 2026. The session's network
  refused every page fetch (C64-Wiki, Lemon64 and Wikipedia all answered
  403), so these are second-hand. The summaries quote the C64-Wiki page
  (`https://www.c64-wiki.com/wiki/Platoon`), a Commodore User review
  (`https://everygamegoing.com/larticle/platoon/53807`) and Wikipedia's
  page on the game. Used for plain claims only; anything else is from the
  game's own screens and text.
- The game's own screens: loading screen, title and credits, high
  scores, the jungle with its status panel, the CHOOSE YOUR MAN panel
  (`reference/`).
- The game's own messages, found by the string sweep (`parts/load1/facts.md`).

## Features

| Feature | Status | Where |
|---|---|---|
| Six sections after the film, loaded in pairs from tape: the jungle and the village, the tunnels and the bunker, a second jungle and the foxhole | open | the disk has four loads, not three (`orientation.md`); which sections each later load holds is open |
| Jungle: find the explosives and blow up the bridge so the patrol cannot follow | traced | messages YOU HAVE FOUND THE EXPLOSIVES, SET THE EXPLOSIVES ON THE BRIDGE, WELL DONE ! THE BRIDGE HAS BLOWN UP, YOU SHOULD HAVE DESTROYED THE BRIDGE in the table at `$C7FD`; the code that shows them not yet read |
| Village: search the huts for a torch and a map, and find the trapdoor to the tunnels | traced | messages for each find and YOU MUST FIND A MAP AND A TORCH, DO YOU WISH TO GO DOWN [Y/N] at `$C7FD`; the Y and N keys are tested at `$B019` and `$B023` |
| Two huts hold booby traps | traced | message WATCH OUT FOR THE VIET CONG BOOBY TRAP at `$C7FD` |
| Shooting unarmed villagers lowers morale | open | message YOU SHOULD NOT KILL INNOCENT VILLAGERS at `$C7FD`; the morale change not found yet |
| Tunnels: find the flares and the compass for later sections | open | in a later load, not analysed |
| The platoon is five men, effectively five lives | live | the CHOOSE YOUR MAN panel lists 001 to 005, each with an ammunition and a grenade row (`reference/choose-your-man.png`) |
| Morale falls with each hit | open | MORALE bar and HITS in the status panel (`reference/play-jungle.png`) |
| Status panel: ammunition, morale, score, hits, the current man | live | `reference/play-jungle.png` |
| Joystick: left and right walk, down ducks, up or up diagonally jumps, fire shoots | open | port 2 is read into `$0306` at `$0D3D`; walking right was seen live, the rest not tested |
| Push up inside a hut to search it | open | |
| Up and down pass through gaps in the bushes | open | |
| SPACE throws a hand grenade | traced | `$14B9` tests SPACE and calls `$BD31`, which takes one from the count at `$BD55` and blanks its icon in the panel; one press in the jungle snapshot changed nothing visible, not followed up |
| F1 to F7 switch between the men | traced | `$080A` tests F1, F3, F5 and F7 and calls `$BFB8` for each |
| Turn the disk over after the first load | traced | message TURN THE DISK OVER TO SIDE B and PRESS FIRE TO LOAD NEXT SECTION at `$C7FD`; load of LAY2 at `$3DDE` |
| Ten best scores, with name entry | live | the table shows after the title (`reference/high-scores.png`); ENTER YOUR NAME at `$A9F4`; the starting table at `$FEFE` |

## Beyond the documentation

| Feature | Status | Where |
|---|---|---|
| Holding Z, A, C, H and 1 together makes the collision test of the soldier against a list of other figures return at once; N undoes it | live (the byte), open (the effect) | `$07B5` writes `$60` over `$2BC8`, `$EA` back with N. Live on 7 October 2026: `$2BC8` went from `$EA` to `$60` with the five keys held. What the skipped check leads to (`$2CB7`) is not read yet, so whether this makes the soldier invulnerable is open |
| P sets a flag, G clears it | traced | `$1E55` writes 1 or 0 to `$0C85`; one try in the jungle showed no change, so the effect is open (a pause is the likely reading) |
| RUN/STOP leaves play | traced | `$0893` jumps to `$A709` with RUN/STOP held; where that goes is open |
| The opening line THE FIRST CASUALTY OF WAR IS INNOCENCE | traced | the film's tagline, in the messages at `$A9F4` with ENTERING THE COMBAT ZONE |
| NTSC v1.1 only: keys 0, 9, 8 and 7 move the soldier to fixed places in the jungle | live | `$0832` in the NTSC build; not in the PAL build (`orientation.md`, "The three versions") |
| The search finds ordinary things too | traced | A SACK OF FLOUR, A STOOL, A TABLE, A POT OF RICE, A POT OF WATER, RUBBISH, PROVISIONS, EMPTY at `$C7FD` |

## Open questions

- What opens the CHOOSE YOUR MAN panel during play. It appeared twice
  about eight seconds into the jungle without input, and fire closed it.
- Which sections O1, O2 and O3 hold.
- The keys found by the sweep at `$07B5`, `$1E55` and `$0893` beyond the
  manual's: their effects in play.
