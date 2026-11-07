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
records in the two source ranges; `$BC00–$BCFF` contains retained shapes
whose actor-frame consumer is unestablished. `$BD00–$BDFF` supplies
absolute death/explosion IDs `$F4–$F7`; ant frames use `$F8–$FF`.

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
