# The engine — verified technical facts

The program that stays in memory from the boot to the end: zero page,
$0200-$0FFF and $6000-$9FFF, and the loader's second and third stages on
hi-res page 2. It loads the stages, draws and moves the fighters, decides
the blows, reads the keys and the joystick, ends each frame, plays the
cutscenes and the sound. Every address here is the engine's; a stage's
routines are named with their part, as "cliff $B700". Unless marked
*live*, a fact comes from the code in `work/entry.json` (stopped at
$0200). Live tests are listed in the game's own `facts.md`.

## Start-up and the stages

- `engine_vectors` ($0200): $0200 loads stage $D0 and enters it, $0203
  is THE END, $0206 the title again (CONTROL-R), $0209 a new game.
- `load_stage` ($020C) loads stage $D0 through `load` ($0300) until the
  read succeeds and the stage's last three bytes check ($BFFD = $D0,
  $BFFE = $D0 EOR $3B, $BFFF = $D0 EOR $49), copies $D0 into $D2, sets the
  draw page ($07) to $40 and enters the stage through $BFFA.
- `start_game` ($0237) clears both pages, shows the castle picture
  (`show_castle`, $03A5: read into $A000-$BFFF and copied to page 1),
  plays the title stage's tune at $1012 and loads the cliff ($D0 = 1).
- `the_end` ($025E) draws THE END (the picture at $9A74), polls about
  65,000 times for a key, or for a button when the joystick is chosen,
  and starts a game on one; otherwise it goes back to the title.
- `reset_handler` ($0309): reset and BRK both clear $0800-$BFFF, copy the
  ROM into the language card again (`rom_to_card`, $03DC) and boot the
  disk through $C600. The language card's copy of the ROM has its reset
  vector at $FFFC pointed here, as has page 3's soft-reset vector $03F2,
  and the break vector $03F0 points to $030C.

## The loader

- `load` ($0338) swaps zero page with $4F00-$4FFF (`swap_zero_page`,
  $0393), turns the motor on, reads two pages from the track under the
  head into $4000 (each byte from two disk bytes, a ROL and an AND; the
  marks F5 D5 DA before each sector and FB after) and calls them with A
  saying what to load: a stage's number, $10 the castle picture.
- `loader_stage2` ($4000) steps the head in half tracks and reads the
  third stage into $5000-$57FF from tracks 2 and 2.5, four sectors of
  two pages, each sector with its own marks (`read_sector2`, $4042).
- `loader_stage3` ($5000) picks a row of `page_lists` ($5400) and the
  first track from A (stage n from track 4n + 7, the castle picture from
  track 4, the boot's engine from track 27), reads twelve 256-byte sectors
  a track into the pages the row names (`read_tracks`, $5500;
  `read_track_data`, $570F, each byte from two disk bytes through the
  table at $5600), brings the game's zero page back and clears the bytes
  $78-$7F and $F8-$FF of every page of $4000-$5FFF, the parts of page 2
  that are never shown. Three of those strips ($4078, $40F8, $5778) hold
  the loader's own code, which $0338 and $4000 read from the disk again
  before each load.
- Each track's marks differ: `read_track` ($5530) takes four bytes for
  the track from `track_marks` ($5610).

## The frame

- `end_frame` ($7628, through $7600) flips the pages (`flip`, $7609:
  the last dot column blanked by $0ABF, the IIe's wait for the vertical
  blank at $779A, then $C054 or $C055), then plays the sounds asked for
  during the frame, unless the sound is off ($86 = 0): the recorded
  sound when $4E counts down to 0, the struck sounds while $42 or $43
  count, the stage's tune at $1006 when $88 is set, the swing when $45
  is set, and a step for the run.
- `wipe` ($774B, through $7606) copies the drawn page onto the shown one
  a byte column at a time, left to right, with a pause after each
  column: how each stage and cutscene first appears.

## Controls

- `special_keys` ($7697) is read at any time, including inside the tune
  player ($0D00): ESC waits for a key (`wait_key`, $778E); CONTROL-S
  turns the music off ($4F), then the sound ($86), then both on;
  CONTROL-B swaps the joystick's buttons ($C3), CONTROL-E its axes ($C0),
  CONTROL-Y turns up and down over ($C2), CONTROL-X left and right ($C1),
  CONTROL-N clears all four; J chooses the joystick and K the keyboard
  ($C4); CONTROL-R loads the title ($0206) unless $D2 is negative. Each
  answers with a beep ($0C4C). $7742-$7746, among these handlers, would
  set the opponent's arrows to 1, but no key leads there.
- `keyboard_input` ($6E69): SPACE takes the stance or stands up; the
  arrows set $29, which stays set while standing (RIGHT runs, LEFT stops)
  and lasts one frame in the stance (one step). In the stance Q, A and Z
  punch high, middle and low, and W, S and X kick high, middle and low;
  standing, B bows. A blow waits in $46 or $47 as $FF and is sent again
  each frame until it is taken.
- `player_input` ($6E00) with the joystick: up keeps the hero standing
  and a new press of button 1 bows; let go, he takes the stance; in the
  stance the buttons kick and punch at the stick's height. Up stands him
  up only when no guard or Akuma is within 15 columns and no hawk is
  close. The stick is read by timing the paddle inputs (`read_stick`,
  $6D09), the buttons by $6D6A.

## The fighters

- A fighter's record is 16 bytes: the hero's at $60-$6F, the opponent's
  at $70-$7F, copied into the working figure at $20-$2F to be moved or
  drawn ($7000-$700F). By offset: legs pose, torso pose, column, a legs
  column, the wind-up count, the legs' and torso's sequence positions and
  steps, the stick, the height, the blow being thrown, facing, and
  standing ($FF) or in the stance (0) at +F.
- `animate` ($6400) moves the working figure one frame along its legs
  and torso sequences (`legs_seq`, $6300; `torso_seq`, $63BE), moving it
  by `legs_step` ($6360); a sequence holds poses and commands ($80 a kick
  at the height in $2A, $84 a punch, $86 a quick punch).
- `command` ($6540) carries out what the player's input or the brain
  chooses: the stick's movement, $9B the stance or standing up, $C5 a
  kick, $D7 a punch, $C2 a bow, $D1 the arms changed, $C6 falling dead.
  Standing, only the bow is taken; in the stance, the arms, the punch and
  the kick.
- A punch from the plain stance is the full punch; from a step it is a
  quick punch, the torso alone while the legs go on ($6618). A punch is
  refused while $24 is 5 or more, which a hit sets to 10 ($714A). A kick
  asked again during its wind-up winds up again, at most three times
  ($667E).
- The run starts from standing still with the stick forward and goes on
  while it stays forward ($6572); the stance's steps run the step
  sequence forward or back.

## Fighting

- `measure` ($70A6) gives the hit test the distance between the two (the
  opponent's column less the hero's) and the target's pose class
  (`pose_class`, $70C6: 26 classes for the 42 legs poses).
- `hit_test` ($7366) decides whether a blow lands: kicks always land
  within the target's reach (`reach`, $7300, 6 or 7 columns) plus one,
  punches by the tables at $7348 and $7352; at the reach plus two, by the
  tables at $7334, $733E and $735C; further off, nothing; a quick punch
  only at exactly its own reach ($745B). Closer than the reach the
  fighters collide; when the two are within 5 columns and the hero is
  not standing still, he is pushed two columns back. It returns 1 a quick punch, 2 a punch, 3 a kick, 4 a
  collision, $FF a doorway kicked open (`door_kick`, $73E4: in stages 3
  and 4 a kick at a shut doorway opens it and counts a room in $C5).
- `apply_hits` ($7207) applies $40 (the result on the hero) and $41 (on
  the opponent): each blow but a collision takes an arrow (`hero_hit`,
  $0BC1; `opp_hit`, $0BD2); the last arrow lost, the fighter falls dead
  ($7145); otherwise he recoils by his pose (`recoil`, $714A). A hero hit
  while standing, running or bowing dies of it whatever his arrows
  ($712A); an opponent so caught only reels. A result of $88 is a stage's
  bounce off a shut door or the portcullis.
- `draw_impact` ($74C0) draws the star where a blow landed, in front of
  the fighter who threw it.

## The brain

`opp_brain` ($6B00) chooses for every opponent. A guard walking on walks
to his place and takes the stance. Standing, he takes the stance when the
hero does or comes within 13 columns, and bows back when the hero bows.
In the stance: a standing hero within 8 columns is kicked; a hero in the
stance more than 11 columns off is walked towards; nearer, a random byte
($6C95: $48 = $48 × 17 + $A1) is held against the stage's four tables at
$BFE1-$BFFD, read by the distance from 7 to 11 columns, to choose no
blow, a kick, a punch or a step forward, and each must then pass its
chance ($D7, $D8, $D9) with a second random byte. No path steps back: the
code for it at $6C4B is never reached.

## Drawing

- `draw_figure` ($6811) draws a fighter from his parts: a mask for some
  torso poses ($69DC), the legs, the head's mask and the head or
  headgear, and the torso, each from its tables at $6000-$62FF; facing
  left, mirrored through `bit_reverse` ($0980). An opponent facing left
  that is neither a guard nor the hawk is drawn by the stage's own
  routine at $BC00 (Akuma, in the last stage).
- `erase_strip` ($6797) clears the band behind a fighter before he is
  drawn again, putting back the floor's pattern for the stage and room.
- Rooms with doorways and Mariko's cell are drawn from eleven pieces
  ($7800-$796A): six of the engine's (a beam, a pillar, a doorpost, two
  pieces at the floor and the door) and five of the stage's.
- `draw_text` ($0700) draws the game's own alphabet (the game's
  `facts.md`, "The text alphabet").
- The arrows are drawn at the bottom, the hero's from the left and the
  opponent's from the right; fewer than three flash, drawn on page 2 only
  ($0B35, $0B7C).

## Cutscenes

- `akuma_sends` ($79A6), from the cliff and the palace between fights:
  Akuma's chamber, a guard walks in, Akuma raises his arm and the guard
  bows and walks out; the game's state is kept meanwhile ($7C53, $7C78).
- `chamber_scene` ($7AF7), from the title: Akuma, a guard and Mariko;
  she is led to her cell and the door shuts.
- Mariko is drawn by $7E30-$7EB3 from each stage's pictures at
  $1530-$1DFF; Akuma by $7D00-$7D3F from the engine's.

## Sound

- Seven effects ($0C40), clicks spaced by the Monitor's WAIT: the hero
  struck (38 clicks, a falling pitch, $0C55), the opponent struck or a
  doorway kicked (28, $0C64), a quick punch landed (17, $0C74), a blow
  thrown (10, $0C84), a control key's beep ($0C92), and two steps.
- `play_tune` ($0D00): the tune at ($F7), a header (the tempo and the
  page of the second voice's click) and notes of three bytes, a length
  and a pitch as a coarse and a fine count. Both voices count the same
  pitch, the second one count shorter, so they beat. $FD n and $FE change
  the beat, $FF ends the tune. Keys pressed meanwhile go to the special
  keys and are dropped; with the music or the sound now off, the tune
  ends.
- `play_sample` ($0DC0): 2,048 one-bit samples at $0E00, a wait of $BA
  turns of a loop each, the speaker clicked only where the sample
  changes.
- Two of the last stage's tunes are kept here, at $0FB0 and $0FE4.
