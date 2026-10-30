# Speedball 2 — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- *Speedball 2: Brutal Deluxe — Coaching Manual*, 2100 Edition, Imageworks,
  scanned at https://archive.org/details/c64man_speedball2, read 30 October
  2026. The item is filed as the C64 manual, but its loading section names
  only the Amiga and the Atari ST, and its menu shows a `REPLAY GOALS`
  entry the C64 game lacks: it is the 16-bit manual. Where the C64 game
  differs, the row says so.
- ZZAP!64 issue 78, October 1991, review of the C64 version by Stuart
  Wynne, OCR text at https://archive.org/details/zzap-64-78-1991-10, read
  30 October 2026.
- Wikipedia, "Speedball 2: Brutal Deluxe",
  https://en.wikipedia.org/wiki/Speedball_2:_Brutal_Deluxe, read 30 October
  2026, for the original's credits only.
- CSDb, search for "Speedball 2", https://csdb.dk/search/?seinsel=releases&search=speedball+2,
  read 30 October 2026: the earliest dated crack is Fairlight's of 14 August 1991.
- C64-Wiki has no page for the game (30 October 2026); Lemon64 and the
  Wayback Machine refused this session's fetches.
- The game's own screens and text, and the intro's scroller, which names
  the C64 team.

## Features

| Feature | Status | Where |
|---|---|---|
| Menu: `1 PLAYER GAME`, `2 PLAYER GAME`, `DEMO`; up, down and fire on port 2 (manual: also `REPLAY GOALS`) | live | |
| One player: `KNOCKOUT`, `LEAGUE`, `CUP`, `PRACTICE` | live | |
| Knockout: play ever tougher teams until you lose; through the gym; cannot be saved | live | |
| League: Brutal Deluxe in division 2 of two divisions of 8; 14 weeks a season; first is promoted, second plays off against the second-bottom team of division 1 | traced: two halves of seven weeks, places 0-7 division 2; top of division 2 and bottom of division 1 change places; the play-off is replayed until one wins | game $715D, $71A1, $721E |
| League points: 10 for a win, 5 for a draw, 1 for every 10 scored; points difference splits ties | traced: ties go to goals for less goals against | game $5431, $5558 |
| Cup: four rounds of two legs each; a draw is settled by a decider | traced: 8, 4, 2 and 1 ties; a tie level after two legs is played again | game $703F, $7159 |
| Practice: no opposition | traced: mode $FF, the other team's energy cleared | game $7452, $2551 |
| League and cup submenu: `NEW GAME`, `TEAM GAME` (the computer plays your matches), `LOAD GAME` | live | |
| Two players: `ONE MATCH`, `BEST OF THREE`, `BEST OF FIVE`; stick 1 blue, stick 2 red; teams swap ends at half time | traced: player one plays team 1, in red, on joystick port 2, and player two on port 1; both squads start at 170 in every attribute with 1100 in the bank | game $6F7B, $22CC, $1D40 |
| Demo: computer against computer; RUN/STOP leaves it (manual: ESC) | live | |
| Manager screen: squad of 12 (9 on the pitch, 3 substitutes), each with a portrait, name, position and eight attributes; keys `TRA`, `ESC`, `SAV`, `TAB`, `FIX`, `GYM`, `STA`, `SUB`, two cycle arrows, the bank | live | |
| Gym: train one player (`I`), a group (`G`) or the team (`T`); the eight attribute buttons, `ALL` (+10 to every attribute), `BUY`; prices AGR 5, ATT 10, DEF 10, SPD 15, THR 10, POW 10, STA 15, INT 15 | live | |
| Bank starts at 1100 credits; buying `ALL` for the team took it to 320 | live | |
| Transfer screen: buy star players for a player and a fee (only when players are on the market) | traced: 14 stars, three places on offer, the first seven in division 2 and the last seven in division 1 | game $56A9, $6C11 |
| Fixture screen (`NEXT FIXTURE`): both teams' points, places and defence, midfield, attack and substitutes ratings | live | |
| League table (`DIVISION 1`, `DIVISION 2`) and cup fixtures | live | |
| Statistics (`STA`): shots at goal, goals scored, goals saved, time in possession, time in opponents' half, successful tackles, substitutions, bonus points | traced | game $5878, $5EB6 |
| Save and load a league or cup to disk (`SAV`, `LOAD GAME`) | traced: the file `SAVESPEED`, $CC00-$CD60 | game $78BF, $79FF |
| Substitution (`SUB`) and changing positions | traced: fire on one squad place and then another swaps them | game $68A0, $6C99 |
| Match: two halves of 90 seconds; ends swap at half time; play restarts with the ball launched from the centre | live | |
| You control the player nearest the ball, marked with an arc; a letter over the ball carrier's head gives his position | live | |
| Fire: in possession, throw (short press low, long press high); without the ball, jump for a high ball, slide for a low one, tackle a player with the ball; aftertouch steers a thrown ball | traced: fire throws; fire still held when the throw ends, three frames later, lobs the ball; the stick then steers it | game $3AA4, $37D2, $3DB1 |
| Goalkeeper: under control when nearest; dives with fire and left or right; stays in his own goal area | traced | game $3AA4, $3A52, $23A6 |
| Tackles decided by the players' attack and defence; the loser loses energy; injured players are stretchered off and replaced | traced | game $3B2C, $3868, $39CF |
| Scoring: goal 10, star 2, all five stars 10 more, bounce dome 2, injuring a player 10 | traced | game $34C7, $1C6E |
| Score multiplier ramp: +50 % after one throw up it, +100 % after two; the opponents' throws take it back | traced | game $2C61, $34C7 |
| Electrobounce: four units electrify the ball, which tackles the next opponent it hits (ZZAP!64: on the C64 it tackles one opponent and runs out) | differs: two units, one on each side wall; the ball knocks down 1 to 3 opponents, more as the multiplier favours the thrower's team | game $2F18, $1C82 |
| Warp gates: four, which move the ball from one side of the pitch to the other | live: two on each side wall, at the same rows | game $33D3 |
| Tokens: freeze team, reverse joystick, reduce team, increase team, manic, slow team, grab ball, transport, goal door, shield, full energy, zap team; most last 6 seconds | differs: all twelve, each running for 10 seconds; reverse joystick only in a two-player game | game $30AF, $3195, $2FE8 |
| Coins: 100 credits (200 in a cup match) | differs: 100, in a cup 200 in the first two rounds and 400 in the semi-final and final; a most per match by game type | game $7586, $7459 |
| Armour on the pitch: boots, helmet, chestplate, shoulder pads, glove, bottle, armplate, Bitmap shades; each raises one attribute | differs: eight pieces, each raising one attribute halfway to 255 until its wearer is tackled; the gym names them BITMAP SHADES, BARGE PADS, CHEST GUARD, SPEED BOOTS, POWER ELBOWS, POWER GLOVES, THUNDA THIGHS and BRAIN BOOST | game $3106, $315B, $62D5 |
| `GOAL` screen with the scorer's team, a lap of the players, a result picture (`A WIN FOR THE RENEGADES`) | live | |
| Pause on any other key; `F` for fast mode in a team game | differs: only P pauses, until fire; there is no fast mode, and F acts only with the cheat on | game $212E, $2143 |
| Each league team has its own colours (ZZAP!64) | differs: four colours, by the low two bits of the team's number | game $1D34 |

## Beyond the documentation

Found in the code, not in the manual.

- **A cheat code** (live): typing BRADFORD-ON-AVON on the title screen
  turns a cheat on or off (game $C0C4, $0C10). With it on, + adds 100 to
  the bank on the menus, the gym and the manager screen (game $6189); in
  a match T knocks team 2 down, G gives the controlled player the ball,
  F freezes team 2 and + adds a star's worth to team 1 (game $2143); and
  RUN/STOP ends the match as a draw instead of abandoning it (game
  $7467).
- **A hidden picture** (live): typing MARTIN on the title screen shows a
  digitised face until fire (game $C1B1, $C4F9).
- **Keys for the joysticks** (live): I, M, J, K and SPACE work as
  joystick 2, and A, Z, comma, full stop and / as joystick 1, in both the
  intro and the game (game $1C4D, intro $2000).
- **RESTORE** takes the game back to the main menu (game $4B8B), but does
  nothing in the intro, where the scroller's raster handler leaves the
  NMI line held (intro $13FB).
- **The credits** the intro's scroller gives the C64 version: C64 code
  Carl Muller, C64 music and sound effects Martin Walker, graphics Alan
  Tomkins, management "Daz", original score Nation 12 (written NATION XII
  with two glyphs of their own), special thanks Nick Pelling (intro
  $2131).
- **A star nobody sees**: the intro's SPEEDBALL letters are eight
  sprites, and the eighth is a star placed past the right edge of the
  screen (intro $0F6D).
- **A tune nobody hears**: the intro's music holds a second tune, three
  one-note patterns, that nothing starts (intro $0D83).
- **A message** to anyone reading the code, at `$C008` in the game,
  never printed: `STOP PERVING AT MY CODE SCUMBAG! WRITE YOUR OWN ******
  GAME.`

## Open questions

- Which armour picture on the pitch is which of the gym's eight names:
  the pickups' handlers give each type an attribute (game $30AF), and the
  gym's names follow the attributes (game $62D5), but the pictures were
  not matched to the names.
