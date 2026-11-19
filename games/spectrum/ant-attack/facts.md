# Ant Attack — facts

## Memory and scope

The primary image is `work/entry.sna`, captured at PC `$9700` after the
last tape block. Its `$5C00–$FFFF` matches all 41,984 payload bytes. The
listing holds the BASIC program at `$5CCB–$7DD9`, engine and message
allocations at `$8000–$999F`, shape sources at `$9A00–$9FFF` and
`$B700–$BFFF`, and the city at `$C000–$FFFF`. Generated video, BASIC
workspace, scene buffers, actor records, and draw-order maps are excluded
from coverage. The initial and play images have identical engine code
through `$97FF`. No relocated ROM stretch of at least 64 bytes was found
by `romcopy.py`.

The code map combines an executed-address map with recursive tracing from
BASIC's machine-code entries, the tape handover, the interrupt guard, the
wall painters' three-byte prefixes, and retained code at `$8C00`. The last
is fifty repetitions of `LD C,0; LD A,($B425)` followed by RET. Its intended
purpose is unknown. Code that ran agrees with its typed blocks.

## Text

Sinclair BASIC tokens hold the menus, interludes, scoring, and title.
The title lettering and medal text use the ROM's block-graphics codes
`$80–$8F`, assembled in BASIC PRINT statements, rather than a private
alphabet. In-game messages occupy `$9000–$93B9`; `$8E0D` interprets their
ROM text/control bytes plus sound, colour, and numeric-counter commands.
The string sweep finds fall, bite, explosion, rescue, paralysis, and
ending messages. Sources in `features.md` document the controls separately.

## Messages

Message records start at `$9000`, each beginning with `$FF`; the next byte
selects the output stream. In the body, bytes from `$80` play a tone or
noise: `((b AND $70) >> 4) + 1` repeats, the low nibble selects the tone,
and `$F` selects noise. `$7D` and a parameter fill the view's attributes
through `$8B00`; `$7E` and a low byte print a number from page `$B4`.
Everything else goes to ROM `RST $10`, so 16, 17, 18 and 22 are INK,
PAPER, FLASH and AT. The texts, by message number:

| # | Text or effect |
|---|---|
| 1 | NASTY FALL! |
| 2 | "HELP! I FELL!" |
| 3 | GOOD SHOT! (the colour change comes after "GO") |
| 4 | ammunition count and the throw sound |
| 5 | explosion sound |
| 6 | SILLY! YOU BLEW YOURSELF UP! |
| 7 | BITTEN! |
| 8 | the player's health |
| 9 | " HOW COULD YOU ? AFTER ALL WE'VE BEEN THROUGH ?" |
| 10 | "THEY GOT ME" |
| 11 | the partner's health |
| 12 | "MY HERO!" / "TAKE ME AWAY FROM ALL THIS !" |
| 13 | CONGRATULATIONS !, ending with view attribute 148 (flashing) |
| 14 | EATEN ALIVE |
| 15 | IVE BEEN EATEN ALIVE |
| 16 | PARALYSED AN ANT ! |
| 17 | YOU ARE A REAL, HERO in block graphics, AT LAST YOUR MISSION IS OVER! YOUR NEW FRIENDS WISH TO THANK YOU FOR SAVING THEIR LIVES. |

The BASIC program holds the rest. Lines 1000–1090 are the story for each
rescue, in `c$`. Line 400 prints "Have another go!"; line 2500 is an
identical copy that nothing calls. Line 3200 prints TIME UP!, "TOO BAD
SLOWCOACH ! YOU RAN OUT OF TIME !" and "SURELY YOU CAN DO BETTER THAN THAT
!", and line 3220 plays the falling BEEPs. Lines 3600–3630 draw the medal:
circles, "TEN LIVES SAVED !" and "Please accept this SOLID GOLD medal !".
The welcome text calls the player a HERO whichever person they chose.

The message cards on How it works are crops of the view, rows 8–127,
captured on the kit's 48K machine at the moment each message finished.
The welcome, score card, time-up, hero and medal screens are whole
screens from the same machine. The medal screen comes from a state with
the rescue count poked to eight and two real rescues after it, so its
score (18952) is illustrative; the page does not quote it. In one
unrealistic state, with the long rescue-1 story still in `c$`, line 3610
stopped with report 4, out of memory. A route with the right story text
for each rescue reached the medal without an error, so this is not
claimed as a bug in the game.

FLASH: the ULA swaps ink and paper every 16 frames, about 0.32 seconds.
The rebuilt screen on How it works uses the READY WHEN YOU ARE screen,
which has 20 flashing cells, and swaps them every 320 ms.

## The city

Each of 16,384 bytes is one vertical column with six occupancy bits.
For coordinates E and D in 128–255, its address is
`$C000 + (D−128)*128 + (E−128)`. Bits zero through five are separate
blocks; a column may contain gaps. All authored column values are below
64. `$8920` returns the selected bit in carry. Height six is empty;
unsigned heights above six return carry set, including 255, which is how
the test below height zero supports ground-level actors. Outside the
city quadrant, ordinary height queries return clear carry.

`$8940` XORs an occupancy bit. `$8A00` removes an ant's old occupied cell,
moves it, and inserts its new one. The five changed city bytes in the
play image are runtime occupancy, not another map. The map viewer uses
the authored entry image.

Verification: 120 seeded cases of coordinate/height queries agreed with
SkoolKit executing `$8920`. Live checks at `(128,128)` returned solid
for heights 0–5, empty for six, and solid for seven.

## Rendering

`$83B0` extracts diagonal samples for the selected camera. `$81B0` turns
six bit planes into a draw-order map. `$8600` projects eight actors,
`$8580` sorts their positions, and `$8500` merges objects with walls.
The two wall painters are executable drawing instructions at `$8203`
and `$8703`, using different dither and edge masks. `$8130` transforms
the compositor's index to a pixel address in the linear scene buffer;
odd four-row bands add one byte of horizontal offset.

`$8300`, called four times, clears 116 rows of thirty bytes. `$8100`
copies `$A180–$AFFF` into thirty columns of the Spectrum bitmap beginning
at `$4421`. Screen RAM is output, not a shape source.

Each masked shape contains sixteen rows, with two `(mask, bitmap)` byte
pairs per row. `$80A0` draws `(old AND mask) OR bitmap`. There are sixty
records in the two source ranges. Groups: grenade `$68–$6B`, girl
`$6C–$7F`, boy `$DC–$EF`, unused aeroplane `$F0–$F3`, puff `$F4–$F7`, ants
`$F8–$FF`.
A picture ID is the actor's +8 when it is `$80` or more, otherwise
`base + frame*4 + ((camera + facing) AND 3)`.

`$8980` chooses a human's frame: dying gives `$F4 + (countdown AND 3)`;
a motion delay of five or more gives frame 3 (lying) on the ground, or
frame 2 while still falling; a delay of one to four gives frame 2 (arms
out); a falling count of two or more gives frame 4; walking toggles 0 and
1; otherwise frame 0. Landing after a fall count of two to four sets the
delay to the count, so frame 2; a count of five or more sets it to eight
times the count, so frame 3. `$8D22` sets the player's frame 2 on a throw.

The only writes to an actor's +8 are `$82E9` and `$898A` (death),
`$899B`, `$89A3`, `$89AF`, `$89BA` (frames 3, 2, 4, 0), `$89C5` (walking),
`$89F8` (respawn), `$8A37` and `$8A4B` (ants), `$8D22` (throw) and `$8D32`
(the grenade's `$F4`). `$80A0` has one caller, the compositor at `$8532`.
Computed IDs stop at `$EF` for people and start at `$F8` for ants, so no
code selects `$F0–$F3`.
They draw one aeroplane facing four ways: `$F0` and `$F3`, and `$F1` and
`$F2`, are exact left-right mirrors (0 of 256 pixels differ). The boy's and
girl's views pair the same way to within 1–3 pixels, the ants' to within 15.
Unseen64 reported the plane on 2 March 2009 (post by monokoma, tip from
Robert Seddon), quoting a Wikipedia trivia line that the article no longer
had on 15 November 2026. Neither gives a reason for the plane. A draw log of a throw that blew the player up
recorded player `$DE $E2 $E6 $F4–$F7`, grenade `$68 $6A $F4–$F7`, ants
`$F8–$FF` and `$F5`, and partner `$78`. The grenade's explosion drew
`$F4, $F7, $F6, $F5` on countdowns 4 to 1.

In the first rescue's play state the waiting partner holds delay 4 and
frame 3 (lying) unchanged for 74 passes. Which code set frame 3 is not
established, and later rescues were not checked, so the Graphics tab does
not say the partner waits lying down.

Verification: all sixty records agreed byte-for-byte with `$80A0` on
seeded backgrounds, and all 512 compositor indices agreed with `$8130`.
A reconstruction of the active 256×192 display from the play snapshot
matched all 49,152 emulator pixels by colour number: zero differences.
ZEsarUX's normal intensity is 192; the site's shared palette uses 215,
so RGB comparisons must account for that palette choice.

## Actors and controls

Sixteen-byte actors begin at `$B480` (player), `$B490` (partner),
`$B4A0` (grenade), and `$B4B0–$B4F0` (five ants). Fields +0,+1,+2 are
coordinates, +3 sprite base, +4 facing, +5 falling count, +6 motion delay,
+7 movement flags, +8 animation, +9 death/respawn countdown, and +10..12
spawn coordinates. Remaining fields have actor-specific meanings.

`$8060` reads V into forward flag bit 2 and C into jump flag bit 1.
Exactly one turn key is accepted: M increments facing and Symbol Shift
decrements it. Pressing both preserves facing. `$8900` reduces facing
modulo four when applying a move. Walking and jumping pass through
`$8800`'s occupied-cell tests; landing after a sufficiently long fall
sets a damage event rather than directly decrementing health.

`$8400` checks camera keys 0, P, Enter, Space in that order, selecting
3,2,1,0. If several are held, the later test wins. Each selection derives
a camera origin from player position. `$8460` tracks the player while
walking outside the central projected window.

Live verification from one reloaded play snapshot tested V, C, both turn
keys separately and together, each camera key, and 0+Space. The control
run preserved movement flags. All four cardinal coordinate changes also
agreed with simulator execution of `$8900`.

Ants are blocks in the city map. A bite is the player's own cell
becoming occupied: event 4, and `raise_actor` lifts the player onto the
ant. A live run with an ant walked into the player confirmed the lift; `$8F00` takes the
health point. Ants cannot step up a block because flag bit 4 is clear
in their records; the partner's flags (17) have it set. A nasty fall
costs no health; it only sets the long delay above.

Ant 1's spawn point `(186,168)` is a column of value 3 in the authored
map: a block at height 0 and one at height 1. The other four spawn points
hold 2, a block at height 1 over an empty ground cell. Because ant
occupancy is toggled with XOR, ant 1 standing at its spawn point clears
that ground block until it moves on. The effect in play was not examined.

## Grenades

`$8D00` reads S/D/F/G as mask values 2,4,8,16 of the keyboard mask. The mask
becomes the fuse counter; one round of ammunition is consumed per launch.
Multiple held keys combine, giving fifteen nonzero even fuse values from
2 through 30. Fuse duration is measured in engine passes, not display
frames. The grenade still obeys the movement and collision rules, so a
longer fuse need not produce a proportionally longer throw.

At fuse zero the grenade starts an explosion countdown. Human hits use
exact three-coordinate equality. `$8D9A` tests ants of equal height: a
horizontal Manhattan distance below five kills; distances five through
seven stun. `$8BD1` handles landing on an ant by setting its delay to
`$FF`, which the ant update skips.

Live tests produced fuse values 2,4,8,16 for the four keys and 18 for S+G,
all spending one grenade from ammunition 20. Two legal input recordings,
S alone and S+D+F+G for the first engine pass, were replayed for 36 passes
in ZEsarUX and on the kit's independent 48K machine. Fuse, ammunition,
explosion state, player position, and grenade position matched at every
pass. S exploded on pass 3; all four keys exploded on pass 31. Neither
route poked game state after its starting snapshot.

The recordings begin at the first rescue's gate-area snapshot and use
keyboard input throughout. They establish that the combined fuse is
reachable in normal play. They do not establish a route through every
rescue or guarantee a safe throw.

## Rescue progression and scoring

`$8F80` starts partner following when horizontal Manhattan distance is
below four and height matches. `$8AB6` chooses follow movement, and
`$87D0` colours the scanner according to whether distance decreased.
`$8EA0` ends the rescue after both humans leave the city quadrant, then
sets partner state +13 to two and schedules an engine return. Live
checks with both inside, just the player outside, and both outside
confirmed that transition.

BASIC line 90 (`$5E49`) increments rescued count sg, reads the remaining
time, and adds `time*sg` to total score se. Line 95 (`$5EC4`) finishes
at ten rescues. There are 37 target-coordinate triples: one for rescue
one and four for each later rescue. Line 850 (`$6A23`) uses remaining
time modulo four after success to select a variant; retry preserves it.

After rescue four the divider setting sp is `2+INT(sg/4)`. Line 190
(`$63C8`) applies it to ants 2–5, while ant 1 retains its separate
initial value 20. `$8A5D` skips movement when its divider reaches zero,
then reloads it; it moves on the other passes. Increasing the reload
therefore increases the fraction of passes spent moving.

BASIC line 140 gives ant 1 reload 20 and count 1; lines 150–180 give the
others reload 2 and counts 4, 3, 2, 1. Line 100 pokes these before each
rescue and on a retry, and line 190 then pokes `sp` into ants 2–5 only.
So ant 1 moves on 19 passes in 20 and the others on 1 in 2, 2 in 3 after
four rescues, and 3 in 4 after eight. In a live run of 367 passes, ant 1
moved on 349 and the others on about 184. Whether ant 1's speed was
intended is unknown.

`$8F80` recognises the partner at a horizontal distance below four and
the same height. Before that, `$87D0` paints the SCAN box green (4) when
the distance is smaller than on the last pass, otherwise red (2). Once
following, `$8AB6` stands still at distance 1 or at 6 and more; otherwise
it keeps its facing when the next square is at distance 1, and turns
toward the player with `$8A91` when not. Live runs in the kit's machine
confirmed the recognition distance, the SCAN colours, and that the
partner waits at distance 6.

Line 70 retries a failed rescue: health and ammunition go back to 20 but
the timer is not reset (957 at the failure, 956 at the next READY). Line
60 ends the game when the timer reaches zero.

The timer begins as 1001 in BASIC line 750 (`$6983`), before initial
engine updates. `$8DD0` decrements it on every third call. It is a count
of engine work, not a measured number of seconds. Live divider values
1,2,3 produced respectively a timer decrement/reload, divider 1, and
divider 2. `1` returns from the engine; BASIC then runs the retry path.

## Sound and I/O

All engine port accesses decoded by the census address the ULA's even
port `$FE`. `$8060`, `$8400`, `$8D00`, and `$8009` read keyboard rows.
`$8B4A` writes noise based on the random generator; `$8B80` writes timed
square-wave toggles using delay/duration pairs at `$8BB1`. Message bytes
select repeated sounds, including the rescue and medal sequences.
BASIC lines 3110/3120 play the flashing-title beeps and rising scale;
line 3220 plays the timeout descent through ROM BEEP.

The sound player uses timed ULA writes rendered through the site's
Spectrum sound model. Title and timeout ROM BEEP writes were captured
in ZEsarUX with a non-stopping checkpoint at its OUT instruction $03E1.
The title has 3,128 speaker edges and the timeout 6,042; the kit machine
produced the same edge counts, with individual edge intervals differing
by at most six T-states. Engine effects come from their own routines run
on the kit's 48K machine. The title was also run in ZEsarUX with audio
recording: the completed title's 6,912 display bytes matched the kit
machine exactly. The emulator WAV is 15,600 Hz and aliases the highest
rising notes; it is a limited comparison, not an exact audio oracle.

## The listing's error rate

Sample seed 610106 drew 111 of 325 comments, checked independently by
`gpt-6-astra`: 94 right and 17 wrong-detail. Fifteen shape comments
prematurely claimed a page viewer existed; their shared sentence was
removed. The other corrections identify the support-test actor by IY
rather than always as the partner, and make the pursuit-facing cutoff
strictly below four. All 17 sampled wrong comments were corrected.

The plain sample rate was 15.3%, with a 95% Wilson interval of 9.8–23.2%.
Separate strata checked padding 0/20 from 100, map descriptions 0/16
from 16, shapes 15/15 from 15, and written comments 2/60 from 194.
Weighting by stratum population gives 6.6%. These are measurements of
the comments before those corrections, not a measured rate for the
remaining listing. The sample is a lower bound on mistakes a checker
can find; a full independent audit is recommended and has not been done.

## Checks behind the pages

How the pages' widgets, pictures and sounds were checked against the game, and which emulator showed what the pages describe. The pages themselves say only what the reader is looking at.

### discoveries.html

- The same 36-pass inputs reproduced every recorded position, fuse, ammunition, and explosion value on ZEsarUX and the independent Spectrum machine.
- The ant race uses the reloads and starting counts from BASIC lines 140–190 and the skip rule at `$8A5D`; the 349-of-367 count above is the live check.
- The aeroplane is drawn from the listing's bytes at `$BC00`.

### graphics.html

- Every picture is drawn from the listing's bytes with `(background AND mask) OR picture`, the rule all sixty records matched at `$80A0`.
- The walking pictures change every 162 ms. Sixteen walking passes at the first gate measured 160–166 ms each; the real pace changes with drawing work and sound.
- Row labels follow `$8980` and the landing code at `$8860`; the ant rows follow `$8A00`.

### index.html

- The page's `toward` matches `$8A91` run on the kit's CPU, checked by `test_widgets.js`.
- The ant board runs the step rule of `$8A00` and the skip rule of `$8A5D` on a real piece of the city, `(165,157)` to `(196,180)`, at ground level. Its ants ignore height and only count a bite, with no lift; it shows the rule rather than copying play.
- The follow grid runs the rule of `$8AB6` on a flat 15 by 15 grid.

- Title and timeout: ROM BEEP port writes captured in ZEsarUX.
- The final rising notes exceed the emulator WAV’s useful bandwidth, so the port-write timing is the reference.
- All 49,152 active pixels match the emulator by colour number.
- The shared renderer uses a brighter normal palette: intensity 215 instead of ZEsarUX’s 192.
