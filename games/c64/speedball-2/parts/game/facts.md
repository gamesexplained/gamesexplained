# The game — verified technical facts

The second load, `SPDBALL`: the title, the menus, the gym, the manager
screen, the league and the cup, and the matches. Every address here is
the game's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf` (stopped at $C000). Live tests are listed in the game's
own `facts.md`.

## Start-up and the title

- `start_game` ($C000) jumps over a message at $C008 that is never
  printed (STOP PERVING AT MY CODE SCUMBAG! WRITE YOUR OWN ****** GAME.)
  to `start_init` ($C044): $01 = $35, video bank 3, the NMI vector at
  `nmi` ($4B8B) and the IRQ at `irq_null` ($4B87), the CIAs' and the
  VIC's interrupts off, the SID silenced and the effects driver started.
- `title` ($C0C4) shows the title and checks every key pressed against
  two codes, as key numbers (8 x row + column of the keyboard matrix):
  BRADFORD-ON-AVON at $C1A0 and MARTIN at $C1B1. A wrong key starts that
  code again. The first turns the cheat ($0C10) on (effect $25) or off
  (effect $24); the second shows the picture at $C4F9 until fire. Fire
  goes to the main menu.
- `nmi` ($4B8B): RESTORE goes to the main menu ($6E8E) without
  returning, from anywhere in the game.

## Interrupts and the frame

- In a match the IRQ is a sprite multiplexer (`irq_mux`, $126B): a list
  of entries by raster line, four lines a bucket, built each frame by
  `mux_sort` ($10FF) from the 26 objects (18 players, the ball, a flash,
  four pickups) whose flag at $A0,x has bit 0. Each entry moves the next
  of the eight hardware sprites to an object; an entry with bit 7 set is
  a command (`raster_commands`, $1382): the pitch's top, the panel's
  split at line $DC, a colour change at the centre line, the end of the
  frame. With eight objects or fewer on screen the sprites are written
  directly (`sprites_direct`, $11B3).
- The end of the frame (`irq_frame_end`, $141F) runs the game's frame
  (`match_frame`, $2052) with interrupts on, unless the last frame is
  still running. On alternate frames the frame reads the controls and
  moves the controlled players, or puts the objects on screen and takes
  the keys; every fourth it redraws the scores.
- The pitch scrolls a pixel a step, a character every nine frames, on two
  screens ($CC00 and $F400) swapped at the end of each character
  (`scroll_start`, $15BA; `scroll_flip`, $2228).
- Once a second of play (50 frames, $21BF): a second of possession for
  the team with the ball ($0C01,x) and, in the other half, a second there
  ($0C03,x); a pickup may appear (`spawn_pickup`, $2FE8); the running
  token counts down (`token_tick`, $320C); and the clock goes down a
  second from 90 ($4D, decimal; `clock_reset`, $259A). At 0 the half ends
  ($45 = 4).

## Controls

- `read_input` ($4A75) reads joystick port 2 into $9C and port 1 into
  $9D (bits 0 up, 1 down, 2 left, 3 right, 4 fire), the new presses into
  $9E and $9F. When a key is down and joystick 1 is still it scans the
  keyboard into $94-$9B (held) and $8C-$93 (new), row r at $94 + r, and
  the keys in `key_sticks` ($1C4D) stand in for the sticks: I, M, J, K,
  SPACE for port 2; A, Z, comma, full stop, / for port 1; RUN/STOP sets
  bit 5 on both. The loop reads one entry past each table, so A also sets
  port 2's bit 6, which nothing tests.
- `players_control` ($22CC): the mode $3B decides who controls what: 0
  the computer plays both teams; 1 one player against the computer, on
  either joystick; 2 two players, team 1 on port 2 and team 2 on port 1;
  $FF practice, with no opponent.
- In a match (`match_frame`): P pauses until fire ($212E, $07FE); RUN/STOP
  ends the match ($45 = $83). The manual's F for a fast mode is not in
  the code: F acts only with the cheat on.
- `player_input` ($3AA4): the controlled player runs the way the stick
  points, less the ways another player blocks. Fire with the ball throws
  it the way he faces; without it, a goalkeeper dives left or right with
  the stick, a player tackles the ball's holder while fire is held, or
  jumps for a high free ball and slides for a low one. While the ball
  flies the stick steers it (`throw_aftertouch`, $3DB1): fire lobs it.

## The cheat

With $0C10 set (BRADFORD-ON-AVON on the title):

| Where | Key | What it does |
|---|---|---|
| Menus, gym, manager | + | adds 100 to the bank (`menu_frame`, $6189) |
| A match | T | zaps team 2: every one of its players on the pitch is tackled down (`token_zap_team`, $32AD) |
| A match | G | the controlled player takes the ball (`token_grab_ball`, $326C) |
| A match | F | freezes team 2 (`token_freeze`, $334E) |
| A match | + | adds team 1's star bonus to its score ($216D) |
| A match | RUN/STOP | ends the match, which counts as finished rather than abandoned (`play_match`, $7467) |

## A match

### The pitch and the ball

- The arena is a map of 20 by 38 blocks of 4 by 4 characters (packed at
  $9C1C, unpacked to $BCEF). Its right half is its left half mirrored,
  and the lower half the upper turned upside down, by characters made at
  `match_setup` ($2657) and turned as the screen scrolls (`mirror_chars`,
  $19ED).
- The ball is object $12. Its height rises and falls with gravity, a
  step a frame, and it slows every 7 frames (`ball_frame`, $2B12). A
  free ball within one column and one row of a player who can take it is
  his (`pick_up`, $2D59).
- A bounce off an end wall between columns $22 and $2D below height $40
  is a goal for the team attacking that end, unless the goal-door token
  shuts it ($2B12).

### Scoring

The multiplier's position $51 runs from 0 (all team 1's) through 2
(neither) to 4 (all team 2's), and `multiplier_points` ($34C7) sets what
each thing is worth from it:

| Position for the scoring team | Goal, injury, five stars ($1C6E) | Star or dome ($1C78) | Electric ball's charges ($1C82) |
|---|---|---|---|
| neither, or the other team's | 10 | 2 | 1 |
| one step its way | 15 | 3 | 2 |
| two steps its way | 20 | 4 | 3 |

- A goal: `ball_frame` ($2B12) adds the goal's worth.
- A star: a ball off a side wall at a star's row lights one of the five
  stars on that side for the attacking team, and a ball the defending
  team throws there puts a lit one out and takes its worth back
  (`side_wall_hit`, $33D3). When all five on a side are lit, they go out
  and the team scores a goal's worth (`stars_complete`, $35D3).
- A bounce dome: two on the centre line (`bounce_dome`, $2EA4) send the
  ball back and give the thrower's team the star's worth.
- An injury: a player whose energy falls below zero is stretchered off,
  a substitute takes his place, and the other team scores a goal's worth
  (`tackle`, $3868; `injured`, $39CF).
- The multiplier ramps: a ball thrown up a ramp at the side (rows
  $48-$4C) moves the multiplier a step towards the thrower's team and
  rides the ramp in two passes of 31 frames: the multiplier's lights come
  on at the end of the first, and the ball is sent out at the end of the
  second (`multiplier_ramp`, $2C61; `ramp_ride`, $3671).
- Scores are three decimal digits a team ($47, $49, $4B and $48, $4A,
  $4C), shown as 999 past 999 (`panel_scores`, $1ABF).

### The warp gates and the electrobounce units

- Warp gates: two on each side wall, at rows $2F-$32 and $63-$66. A ball
  that reaches one comes out of the other wall's gate at the same row,
  moving away from it at its thrower's throw speed, with effect $23
  (`side_wall_hit`, $3424 and $348B). *Live* in "Live tests".
- Electrobounce units: one on each side wall (left at rows $6B-$6F, right
  at $27-$2B). A thrown ball that runs through one comes back off the
  wall electrified for the thrower's team, with the charges the table
  above gives (`electrobounce`, $2F18). An opponent who touches it is
  knocked down and uses a charge (`pick_up`, $2D59).

### Pickups

`spawn_pickup` ($2FE8) puts a new pickup on the pitch once a second in a
free slot of objects 22-25, at a random place outside the centre. Half
the time it is a coin; otherwise its type is a random one of 32, of which
20-31 are coins too. Armour comes only in slot 22, tokens only in slots
23-25, and coins only while neither team has more than the game type's most.
`pickup_take` ($3091) runs its type's handler (`pickup_handlers`, $30AF):

- Types 0-7, armour: raises one attribute of the player halfway to 255
  until he is tackled, when it falls off (`armour_wear`, $3106;
  `armour_lose`, $315B). Type 0 SPD, 1 INT, 2 DEF, 3 ATT, 4 POW, 5 STA, 6
  THR, 7 AGR. Only one player wears armour at a time.
- Types 8-19, tokens, in the manual's order: freeze team, reverse
  joystick (only in a two-player game), reduce team, increase team,
  manic, slow team, grab ball, transport, goal door, shield, full energy,
  zap team. A token runs for 10 seconds (`token_start`, $3195), and at its
  end every attribute is put back from the copy at $EE00 (`token_end`,
  $321F).
- Types 20-31, coins: one more coin for the team ($4F, $50), paid into
  the bank after the match (`play_coins`, $7586): 100 a coin, in a cup
  200 in the first two rounds and 400 in the semi-final and final. A
  match pays at most 5 coins in a league, 10 in a cup, 11 in a knockout,
  20 in a two-player game, and between 3 and 6 in a team game
  (`type_coins_max`, $7459).

### Tackles and injuries

- `players_contact` ($3B2C) runs a quarter of the players each frame. A
  player tackling, or a computer player whose aggression beats his
  threshold, brings down an opponent within two cells who is not
  shielded, when a random number beats 128 + the opponent's DEF / 2 less
  the tackler's ATT / 2.
- `tackle` ($3868): the damage is the tackler's POW / 2 + $4B less the
  victim's STA / 2, over 16. Half of it (at least 1) comes off each of the
  victim's eight attributes, to no less than 90, and all of it off his
  energy. A ball holder loses the ball to the tackler.

### The computer's players

Each computer player is a coroutine that gives up the frame with
`player_yield` ($3E55) and carries on where it left off at the next
`player_resume` ($3E4C). The team's controlled player
(`player_ai`, $3E66) thinks every 2, 4 or 6 frames by his intelligence;
it takes free balls, keeps goal, goes for pickups, dodges, runs towards
the goal and throws when `shot_check` ($4023) finds it placed for the
multiplier ramp, a star or an electrobounce unit. The others take places
by their roles (`team_mate_ai`, $43A7; `player_roles`, $1CC4).

## The game types

`main_menu` ($6E8E) sets the game type $0AAC: 0 demo, 1 practice, 2 two
players, 3 knockout, 4 cup, 5 league, 6 team game (the computer plays the
player's matches). Waiting at a menu starts the demo.

- Knockout (`knockout`, $7002): 1100 in the bank; computer teams 1 to 15
  in turn, a draw played again, a defeat the end.
- League (`league`, $715D): two divisions of eight, places 0-7 division 2
  and 8-15 division 1; Brutal Deluxe start at place 0. Seven weeks of four
  matches a division make half a season (`fixtures`, $7393), played twice
  with the ends changed (`league_week`, $71A1). A win is 10 points and a
  draw 5, and each team's score, divided by 10, is added to its points
  (`league_result`, $5431). Ties go to goals for less goals against
  (`league_better`, $5558). After a season the top of division 2 and the
  bottom of division 1 change places, and the second in division 2 plays
  off against the second from bottom in division 1 (`league_playoff`,
  $721E). Matches between two computer teams are not played but drawn
  from their strengths (`simulate_match`, $559B; `team_strength`, $0D11).
- Cup (`cup`, $7032): 2000 in the bank; four rounds of 8, 4, 2 and 1
  ties; the player's tie is two legs with the ends changed, played again
  while level (`cup_round`, $703F).
- Two players (`two_player_game`, $6F7B): one, three or five matches;
  both squads start with 170 in every attribute and 1100 in the bank, and
  each player visits the gym with his own squad before each match.

## The gym, the manager screen and transfers

- The gym (`gym`, $5F73) trains one player, a line of three or the team.
  Ten more in an attribute costs AGR 5, ATT 10, DEF 10, SPD 15, THR 10,
  POW 10, STA 15, INT 15 for each player (`attribute_prices`, $673E;
  `squad_raise`, $635D). No attribute may pass the limit `gym_price`
  ($65D9) gives: the best line's average, rounded down to tens, plus 30,
  and at most 220; in a team game plus 40, and at most 230 in division 1;
  in a knockout at most 240. The gym names a piece of equipment
  for each attribute (`armour_names`, $62D5): BITMAP SHADES, BARGE PADS,
  CHEST GUARD, SPEED BOOTS, POWER ELBOWS, POWER GLOVES, THUNDA THIGHS and
  BRAIN BOOST.
- The bank is decimal: $0AB3 the hundreds and $0AB1 the tens and units
  (`bank_pay`, $638B), at most 9999.
- The manager screen (`manager`, $6768) swaps squad places, buys stars,
  and leads to the gym, the next fixture, the statistics, the table and
  SAVE. Fourteen star players (SHORN to JAMS) come on the market into
  three places on offer: each waits 4-11 weeks at the start and 4-7
  after, the first seven while the player's team is in division 2 and the
  last seven in division 1 (`transfer_init`, $568E; `transfer_week`,
  $56A9).

## Team colours

Team 1, the player's, is red (2). Team 2's colour comes from the low two
bits of its team number: 12, 5, 7 or 6 (`team_2_colours`, $1D34), so the
fifteen computer teams share four colours.

## Data tables

| Table | Where |
|---|---|
| Team names, player names | $0E11 |
| Teams' strengths for simulated matches | $0D11 |
| Teams' ratings, eight attributes for each line, 4 bits each | $0D21 |
| Points by multiplier position | $1C6E-$1C8B |
| Keys that stand in for the joysticks | $1C4D, $1C53 |
| Formations: kick-off places, ends, goalkeepers' areas | $1D55-$1DE5 |
| Menus and messages | $1DE6-$2051 |
| The pickups' handlers | $30AF |
| Stars' places and blocks | $3755-$37BC |
| League fixtures | $7393 |
| Coins by game type | $7452-$7466 |
| Sound effects: priorities, then six interleaved columns of four bytes | $0480, $04FE-$0741 |

## Sound

The game has no tune. Its 48 sound effects run on a driver of its own
(`sfx_update`, $0236), called once a frame from the raster interrupts.
Each voice takes a request (`sfx_play`, $1BF0) when it is free or when
the new effect's priority is no lower; an effect sets an envelope, a
gate time, a length, two waveforms, a start frequency, a frequency sweep
of nine kinds, a pulse sweep and a few special effects (`sfx_voice`,
$0242; `sfx_step`, $02FE; `sfx_params`, $04FE).
