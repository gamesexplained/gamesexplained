# Akuma's chamber (stage 4) — verified technical facts

Stage 4, the last: the hero carries on from the dungeon's room 4 through
room 5's doorway into room 6, where Akuma waits and Mariko is held, and
the game ends with the embrace and the closing words. Every address here
is this part's unless it is named as the engine's. Unless marked *live*,
a fact comes from the code in `work/entry.json` (stopped at $BFFA).

## The stage

- `akuma_start` ($B700) keeps the hero where the dungeon left him, in
  room 4, with his record, and room 1's door shut behind him ($ED). It
  turns the music and the sound on ($4F, $86 = 1) whatever CONTROL-S had
  chosen; sets Akuma's chances of a kick, a punch and a step all to $FF;
  five rooms open ($C5 = 5); 8 arrows for the hero ($B0) and 28 less
  that, 20, for Akuma ($B1); and $58, Akuma's opening kicks, clear. The
  main loop runs `akuma_frame` ($B7B3) and the engine's frame end.
- `rooms4` ($B300) moves the hero room to room as the dungeon does. Room
  5's doorway is shut until he kicks it (its number is not below $C5);
  room 6's never is ($B368). In room 1 a hero in the stance is kept at
  column 7 or more ($BA01), so the first screen, the stairs, is never
  reached again.
- The first time the hero takes the stance in room 5, four notes play
  ($100F; `room5_tune_played`, $B6FF).

## Akuma

- Entering room 6 with no opponent set brings Akuma (`akuma_setup`,
  $B46D): alive, his arrows at his most, headgear 7, in the stance at
  column $28, opponent type 1 ($4D), and $58 set. Everyone moves 30
  columns left, so he stands at column $0A as the hero comes in at 3
  ($B368).
- While $58 is set and the hero lives, Akuma is sent a kick every frame,
  never refused ($24 cleared) and without recoil ($5A set); otherwise the
  engine's brain plays him ($B895). Going back into room 5 clears $58
  ($B345). *Live*: a hero who ran into room 6 died of the first kick; one
  who came in the stance was knocked back into room 5, and then Akuma
  fought by the brain.
- Akuma moves, and both fighters' blows are tested, on every frame
  ($B895, $B8C7). In room 6, an opponent at column $10 or more takes no
  recoil ($B927).
- He is drawn by this stage's own figure (`akuma_figure`, $BC00; $BC06):
  his robe and legs, his head and his body and arms from the tables at
  $BE00-$BFC6, each with a mask, and masks at the foot of his robe when
  he stands at columns $22-$24 ($BC58). With the hero lying dead his head
  is drawn unmirrored a column further left, so that it faces the other
  way ($BCAF).
- Beaten, Akuma becomes type 2 ($4D), his tune is asked for ($88 = 2) and
  Mariko is no longer held ($A0 = 0) ($B834).

## Mariko

`mariko_last` ($BB05) runs once a frame in room 6. While Akuma lives she
waits. Then, with the hero left of column $13, she takes pose $20 while
he stands and pose $24 while he is in the stance. When he reaches column
$13: if she is not in pose $20, because he came in the stance, she kicks
him (pose $21), a killing blow ($B91D); if she is, at column $16 the
embrace begins ($9A = 2). The embrace is twenty steps of her poses
(`embrace_poses`, $BB72), pictures with the hero in them, so the hero is
not drawn meanwhile ($BA9C); tunes play at steps 4 and 9, and at step
$14 the game ends.

Her pictures are this stage's own copy of the engine's tables, run on
from 27 entries to 37 for the kick and the embrace (`mariko_lo4`, $1D0F).

## The end

`akuma_end` ($B810) clears the page, draws the closing words
(`closing_text`, $A200; eight lines at $A20E in the game's own alphabet)
and shows them, then plays the closing tune ($1000) and reads the special
keys over and over: CONTROL-R is the only way on.

## Tunes

`stage_tunes` ($1000), five JMPs and an entry for the player at $1013:
the closing tune ($1000, at tempo $40, far slower than the others), the
hero's death ($1003), Akuma beaten ($1006), the embrace's two tunes
($1009, $100C) and the four notes in room 5 ($100F). The tunes follow,
from $1044.

## Left in memory

The last byte of `akuma_hem_mask_33` ($AFE4) lands at $B000, where the
dungeon keeps a JMP; read as code it would double the hero's most arrows,
but it runs only on the first screen, which this stage never reaches.
`room0_vectors` ($B100) and the cell scene at $B23B are the dungeon's,
left in place and never run here.
