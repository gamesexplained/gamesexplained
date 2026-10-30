# Speedball 2 — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is two loads (`orientation.md`, "The parts"): the intro, with
the title picture, the scrolling story and the tune, and the game, which
holds everything else. Each fills the whole of memory and replaces the
one before. What is true of one part is in its own `parts/<id>/facts.md`,
with that part's addresses: "intro $1E67" is the intro's routine at
$1E67, "game $3868" the game's. This file holds what spans the parts.

## Build

Mirrorsoft's 1991 disk, under its Imageworks label, as the C64
Preservation Project dumped it to G64 (`orientation.md`, "The image").
The disk lists `BOOT`, `PART0` (the intro), `SPDBALL` (the game) and
`SAVESPEED` (a saved league, which the game reads and writes). `BOOT`
reads track 1 sector 0, which cannot be read on the original, and uses
the drive's error code as the key that decrypts the rest of itself
(`orientation.md`, "The loader"). `PART0` is decrypted and unpacked three
times, `SPDBALL` twice; both end up as one image of $0200-$DFFF.

## Memory layout

| Thing | Where |
|---|---|
| Zero page, both parts' variables | $02-$FF |
| The intro's music player, tune and patterns | intro $0200-$0EC3 |
| The intro's objects, raster list, jobs, scroller, disc, fades and input | intro $0EC4-$1EFD |
| The intro's loader for the game, copied to $0400 | intro $200C-$20C2 |
| The scroll text, which is also the intro's script | intro $2131-$248B |
| The intro's pictures and the disc's 23 frames, packed or raw | intro $248C-$7A84 |
| The intro's entry, then its screen | intro $C800 |
| The game's sound-effects driver and its 48 effects | game $0200-$0741 |
| The game's variables: players' attributes, the squad, the league, the bank | game $07FE-$0C10 |
| Team names and ratings, player names, the star players | game $0D11-$0FC6 |
| Raster interrupts, the sprite multiplexer, the pitch's scrolling, the panel | game $0FC7-$1C15 |
| The tables of a match: points, colours, formations, menus, messages | game $1C16-$2051 |
| A match: the frame, the ball, pickups, tokens, stars, tackles, the computer's players | game $2052-$498D |
| Unpacking, input, fades, sprites, screens and text | game $498E-$5D75 |
| The league, the cup, transfers, the gym, the manager screen, the menus | game $5D76-$7AFB |
| Packed screens, tiles, sprites, characters, the font and the portraits | game $7AFC-$BCD9 |
| The game's entry and the title screen with its two typed codes | game $C000-$CCB6 |
| Sprite frames $40-$7F, menus and match | game $D000-$DFFF |
| Video bank 3, where each screen unpacks its own pictures | $C000-$FFFF |

## How the parts lead to one another

- `BOOT` loads `PART0` with the KERNAL and jumps to $0812, the first of
  its decrypting and unpacking passes; the last pass jumps to intro
  $C800 (`orientation.md`, "From power-on to play").
- In the intro, fire on either joystick, or SPACE or / on the keyboard,
  starts the tune's fade (intro $1EDE, fade speed 8). Once it has faded,
  the go flag $20 is set and intro $200C copies a loader to $0400, banks
  the KERNAL in and loads `SPDBALL` behind stripes in the border (intro
  $2082). The loader jumps to $0812; the game's passes end at game $C000.
- Nothing carries over from the intro to the game: game $C044 sets up
  the machine afresh, and game $24FC zeroes zero page before the first
  menu.
- The game never loads the intro again. Its own loads are `SAVESPEED`,
  saved from the manager screen (game $78BF) and read by `LOAD GAME`
  (game $79FF), through the KERNAL banked in for the moment.

## Timing

Both parts run on the raster interrupt, once a PAL frame (50 a second).
The intro's work runs from intro $1BDC at line 255; its tune ticks every
second frame (intro $0D83, every speed 1). *Live*, over 500 frames of the
intro: the music player, the disc's raster handler, the scroller's and
the frame top each ran 500 times, and the tune's note step 750 times, one
tick in two frames for each of the three voices.

The game's match runs from game $141F at the bottom of the screen, which
calls the frame (game $2052) unless the last one is still running. Once
a second of play (50 frames, game $21BF) the clock goes down by one, from
90 (game $259A), a pickup may appear and a running token counts down. A
match is two halves of 90 seconds.

## Controls

| | Intro | Game |
|---|---|---|
| Joystick | either port: fire loads the game | port 2 for player one, port 1 for player two; in a one-player game either works (game $22CC) |
| Keys for port 2 | I, M, J, K, SPACE (intro $1EFE) | the same (game $1C4D) |
| Keys for port 1 | A, Z, comma, full stop, / | the same (game $1C53) |
| RUN/STOP | | ends a match and goes back to the main menu, or with the cheat on counts the match as drawn (game $213F, $7467); leaves a menu screen (game $6189) |
| RESTORE | nothing (intro $13FB) | back to the main menu (game $4B8B) |
| P | | pauses a match until fire (game $212E) |

The intro's key tables put RETURN and F1 at bit 5, where the game puts
RUN/STOP. In both parts the loop over the key table reads one entry past
its end, so A also sets port 2's bit $40 (game $1C4D, intro $1EFE); *live*
in the game, A set $9C bit 6.

The game has two typed codes on its title screen (game $C0C4):
BRADFORD-ON-AVON turns a cheat on or off, MARTIN shows a picture. The
cheat's keys are in the game part's facts, "The cheat".

## Graphics

The intro shows multicolour bitmaps (the arch, the towers), a character
screen for the title, eight sprites that spell SPEEDBALL and six more,
reused below them, for the turning disc (`parts/intro/facts.md`). The
game shows a scrolling pitch of 4-by-4-character blocks, a score panel
below a raster split, and up to 26 sprite objects through a multiplexer
(`parts/game/facts.md`). Both parts use video bank 3 ($C000-$FFFF), and
both unpack the same packed format: a byte below $80 starts that many
plus one literal bytes, a byte from $80 copies from 256 less it back for
the length in the next byte, and a length of 0 ends it (intro $20C3,
game $498E).

## Mechanics

The rules of a match, the league, the cup and the gym are all in the
game part (`parts/game/facts.md`). In short, at the multiplier's middle
position:

| Scores | Points | Where |
|---|---|---|
| A goal | 10 | game $2B12, $1C6E |
| Injuring an opponent | 10 | game $39C1 |
| Five stars lit on one side | 10 | game $35D3 |
| A star lit, or a bounce dome hit | 2 | game $33D3, $2EA4, $1C78 |

Each step of the multiplier towards a team adds half: 15 and 20 for a
goal, 3 and 4 for a star (game $34C7).

## Data tables

The game's tables are listed in its part (`parts/game/facts.md`, "Data
tables"); the intro's tune, instruments and patterns in its part.

## Sound

The intro plays one tune, tune 0, on all three voices with a player of
its own (intro $0200, $025D). A second tune, tune 1, is in its data but
nothing starts it (intro $0D83). The game plays no tune: its SID is
written only by its sound-effects driver (game $0200-$0741), by the noise
it reads for random numbers (game $4A18) and by its start-up (game
$C044).

## The listing's error rate

One sample, seed 20261030, drawn from both parts' comments: 60 of the
914 written by hand and 20 of the 173 generated from tables (frames,
pictures, tune data). A checker on claude-opus-5-5 that wrote none of
them marked 21 of the 80 wrong, each read again against the code and
upheld: 18 of the 60 hand-written (30 %, Wilson 95 % interval 20-43 %)
and 3 of the 20 generated (15 %, 5-36 %); weighted by the two
populations, about 28 % of the comments. Two were wrong outright: game
$1D48 called player 8's colour the goalkeeper's, and game $648C said a
routine works out a worth when it fills the attribute bars. Nineteen
were wrong in a detail: a count off by one (intro $5393 unpacks 2040
bytes, not 2048; the effects' flip flag every $04DC,x + 1 frames), a
condition turned round (game $1678's windows widen as the speed rises),
a step left out (game $3671's ride is two passes of 31 frames; game
$703F's computer ties are two legs too), a "nothing reads" that two
routines read (game $CCA9), and a use with no support (game $D340 and
$D3C0 as menu frames, when they hold match frames between matches). All
21 are corrected, with the 23 frame comments that said the same as
$D340, and the comments that repeated the others. The rate is a lower
bound: a checker misses some of what is wrong.

Writing these facts found 21 more comments wrong outside the sample, all
corrected: `side_wall_hit`, `play_coins`, `multiplier_points`,
`bonus_points_1`, `goal_points_1`, `injured`, `tackle`, `match_reset`,
`gym_player`, `gym_buy`, `squad_raise`, `gym_price`, `bar_scale`,
`attribute_order` (now `attribute_prices`), `gym_tables`,
`spawn_pickup`, `value_show`, `player_value`, `place_value`,
`formation_places` (now `star_fees_base`) and `formation_sprites`. The
run made no audit of every comment.

## Live tests

All in VICE 3.14.0 through `kit/c64/vice.py`, from the parts' snapshots
(`orientation.md`).

- *The cheat code* (game, title): typing BRADFORD-ON-AVON three times
  set $0C10 to 1, 0 and 1.
- *MARTIN* (game, title): typing MARTIN showed a digitised face on a
  cyan ground; fire went back to the title.
- *The gym's +* (game, gym with the cheat on): each press of + added 100
  to the bank, 1100 to 1400 in three presses.
- *The match's cheat keys* (game, match with the cheat on): T knocked
  a team 2 player down; G gave the ball to the controlled player ($60 =
  0); F set bit 2 of $A0 for team 2's players, which stops them.
- *RUN/STOP with the cheat on* (game, match): the match ended at once
  with GAME DRAWN 000-000 ($45 = $83).
- *The keyboard in a match* (game): I, M, J, K and SPACE set bits 1, 2,
  4, 8 and $10 of $9C; A, Z, comma, full stop and / the same bits of
  $9D, and A also bit $40 of $9C; RUN/STOP set bit $20 of both.
- *The warp gates* (game, match): a free ball sent at the right wall at
  rows $30 and $64 came out of the left wall at column 9 moving right; at
  row $40 it bounced back; sent at the left wall at row $30 it came out at
  column $46 moving left.
- *The intro's fade* (intro): after fire the volume fell one step every
  9 frames, and the go flag was set 134 frames after fire.
- *The intro's frame* (intro): the counts in "Timing".
- *The star* (intro, with the letters shown): sprite 7 was on, at X 400
  and Y 60, showing frame $67, the star; the seven letters were at X 80
  to 248.
