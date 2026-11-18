# Fantasy World Dizzy — facts

## Program and data

The listing counts 52,101 bytes: 10,181 code bytes and 41,920 data bytes. Every counted byte is described. The listing's loaded-data check reports no uncounted allocation. The single packed disk program is answered in media.json. System/loader remnants and generated buffers are excluded with their ranges and reasons in game.json; retained game dialogue fragments remain counted.

The game starts at $190E; the main loop begins at $1A25. Five 134-byte initial tables at $C400, $C486, $C50C, $C592 and $C618 supply room, X, Y, attributes and shape, copied to live tables at $C69E, $C724, $C7AA, $C830 and $C8B6. Room four denotes carried objects and $FF denotes removed objects. The directory has 101 drawing streams and 2783 records. All shapes named by those records and the initial object tables resolve among 196 valid shape headers.

## Live instruction evidence

- Matrix events for ESPILCE stopped after each comparison at $3B11, with X advancing zero through six. The final stop at $3B1D had A=2 and X=7; single steps followed its spare-life store. Raw evidence: work/secret-trace.json.
- At $33AA with joystick port two held right, stepping LDA $DC00, EOR #$FF, AND #$1F and STA $03C0 stored $08. Raw evidence: work/control-trace.json.
- From the opening snapshot, player X was forced to six beside the dungeon flame. The death checkpoint at $2572 stopped with A=$2F, the fire reason. At $25B4 the spare-life byte was two; a single DEC instruction changed it to one. These are isolated forced-state checks, not a route through the game.
- The coin collector was entered with pickup ID $1A and decimal counters 2,9. Seventeen instruction steps traversed its carry path and left 3,0. Raw evidence: work/coin-trace.json. This proves the collector's arithmetic, not a natural route to thirty coins.
- A store watch on $F000-$FFFF, armed before leaving the intro, stopped at $0405. Stepping exposed LDA ($2F),Y / STA $FF00,Y / INY / BNE $0400, followed by decrementing the destination page and source high byte. The retained dialogue at $FC98-$FFFD is one copy of $EC99-$EFFE, $0FFF bytes below it; only $FFFE and $FFFF differ. Raw evidence: work/loader-write-trace.json. This loader evidence establishes provenance; the loader is not a discovery on the site.

## Video and glyphs

$3B6D selects video bank $4000, bitmap $6000 and matrix $5C00. The recorded opening frame had zero video-register writes. Its reconstruction matched all 104448 VICE pixels, with zero differences. The page embeds only the trimmed graphics data that the video chip reads.

The renderer $2B5B takes shape A, X at $033A in four-pixel units, Y at $033B in pixels, attributes $033C and collision flags $033F. Shape headers give width in four-pixel units and height in pixels; each row has width/2 bytes. Font IDs $30-$5A force one byte by eight rows. $A400 reverses each byte's bits. The Graphics viewer runs the original drawing routine for mirroring and nibble shifting.

The font was rendered and read. $26/$27 are quotation marks, $30-$39 digits, $3A space, $3B apostrophe, $3C comma, $3D hyphen, $3E full stop, $3F question mark, $40 exclamation mark and $41-$5A A-Z. Message bytes >=$64 position the cursor, bytes >=$C8 select colour, $FA draws a box, $5F waits for action and $FB-$FF terminate. Message pointer $3B is $EFFC, four bytes below the retained text at $F000, and its script runs on into that text. $37C5-$37CC show it when nothing is carried: run in the simulator on the listing's bytes, with the apple (object $12, carried at the start) removed, $3776 draws message $37's box and then, from message $3B, EEN TAKEN TO at X 60, Y 96 and THE WIZARD'S CASTLE" at X 44, Y 152, waits for action, draws a box with Denzil's reply from message $09, waits again and redraws the room. This was not watched in the emulator.

## Australia, the cage, the whisky and the coins

These were checked on 15 November 2026 in VICE 3.10 (x64sc), driven through vice-mcp, on a program built from the committed listing ($0B00-$FFFF loaded and started at $190E) rather than the disk image. The room browser placed Dizzy where each test needed him.

- Australia. Rooms $16-$18 are below $19, so $2A7F copies the frame chosen at $1E43-$1E9C into $4A80 with its 63 bytes in reverse order and each byte's bits reversed (a half turn), and returns pointer $2A. $1AA5 swaps the horizontal control bits ($0C) when either is set. $1AB4-$1ACF ORs random bits into the controls when the ROM byte read by $3257 is at least $FA: bit 0 (up) when a value of one to four from $326A is odd and, from a second such value, left ($04) for two or three, right ($08) for four and neither for one. No code turns a room over; the shape renderer $2B5B mirrors horizontally and shifts by a nibble, and has no vertical flip. Live in $18: holding left moved X from 27 to 35 with facing 1 (right) and pointer $2A; holding right moved X from 32 to 28. The screenshot reference/australia.png shows the upright church with Dizzy upside down. Frame $0A, a right-facing frame, comes out facing left, so he walks backwards.
- The cage. $2084 acts only while lever $64's attribute differs from $87, sets it to $87, then moves objects $66, $67 and $65 down one pixel a step until $66 reaches Y $8B ($0A delay units a step, Daisy's attribute bit 7 toggled each step). Nothing else writes those Y values except the rescue at $2A44, which moves only Daisy ($67) to room $49. Live: with the cage up, Dizzy walked right along the table (Y 78), dropped at X 43-44 to the floor (Y 107), walked left to X 29 and the coin count went from 00 to 01 (coin $2F). With the cage lowered he stopped at X 44 on the cage floor, level with the table. From the left, the daggers ($68/$69) took a life; with the rug used ($0B at $FF, $6A/$6B in the room) he stood at Y 91 and stopped at X 18, short of the coin. There are exactly 30 coin objects ($1A-$37) and $2A68 ends the game only when the tens digit is three, so a lost coin makes the game unwinnable.
- The whisky. Object $13 starts in room $35. $244C: dropping it shows message $28 ("YOU FIND THE WHISKY TOO TEMPTING TO DROP AND SO DRINK IT!") and removes it ($FF). $1A80: while $13 is $FF and animation counter bit 5 is clear (32 passes of every 64), the controls are XORed with $0C. Seen live: the message (reference/whisky.png), the swapped stick, and Dizzy walking left with the stick centred. In Australia the two XORs cancel. No other code reads object $13.
- Coins. $1A-$2F start in rooms; $30-$36 start "not placed" ($65) at the positions of scenery $38-$3E, and $2161-$2174 places the coin when its scenery is picked up. $37 is placed in the dungeon ($24) at $1F2B, when Dizzy first passes X $34 in the deserted mines ($29), which also moves the troll ($42) there and shows message $1F.
- Room numbers. $1DAA-$1DC5 add or subtract one at the side edges and $1DD8-$1DF9 add or subtract sixteen at the top and bottom; $2A08 sends room $07 to $37, so falling out of $17 lands in the bottomless well.
- Sounds. Selector 3 is set on a coin ($39BC) and selector 4 on losing a life ($258A, $34F5) and at the rescue celebration ($3851). Key code $24 (M) at $1A45 toggles between the adventure tune and footsteps ($2B48). The footstep routine $2AB7 clicks only on odd animation counts, at frequency high byte 6 or 10 by bit 1 of the count.

## Hardware census and timing

| Registers | Use | Code |
|---|---|---|
| $01 | Bank RAM in for text, restore $36 | $3568, $357D, $3707, $37D0 |
| $D000/$D001, $D010 | Player and effect sprite positions | $1E1D, $31EE |
| $D011/$D018, $DD00 | Bitmap mode, pointers and video bank | $3B6D |
| $D015, $D017, $D01B-$D01D | Sprite enable, expansion, priority and monochrome mode | Startup and appearance paths |
| $D01E/$D01F | Drain collision latches | $346B, $2F39 |
| $D020/$D027 indexed | Border and sprite colours | $1927, $33D1 |
| $D400-$D406 indexed, $D418 | Three SID voices and volume | $0B01 driver; $2AB7 footstep |
| $DC00 | Joystick port two | $33AA |

The census's addresses under I/O that the text reader names are RAM accesses while $01=$34, not accesses to the chip aliases. The main loop uses a busy delay. A 100-PAL-frame count found 21 main-loop entries and 119 IRQ entries. Graphics uses this opening-room pace and states that other paths vary. Across 100 IRQ periods, the stopwatch counted 1642199 cycles, within one cycle of 100*16422. The player uses period 16422 and the IRQ's one-in-eight skip.

## Verification of the pages

test_views.js runs 202 room views (objects on/off), checks 2783 record boundaries and executes 784 shape/mirror/shift cases. test_music.js compares every SID write for five selections, including the footstep player's eight main-loop passes (one every six timer ticks, an approximation of the first room's pace) and the sound player's offset into the selections; the driver factory is isolated as the audio worklet isolates it. The page widgets added on 15 November 2026 (room builder, coin finder, Australia walker, cage, room browser, map) run the same createView on edited copies of the initial object tables; the Australia walker moves Dizzy by the swapped controls once every 95 ms and does not run the game's collision code. Firefox 160.0 exercised all 101 room and 196 shape selections, sprite controls and animation. All five audio worklets produced nonzero output with envelopes and volume active. The blank $45 sprite is deliberate. The browser log had no errors.

## The listing's error rate

Seed 20261114 drew 120 comments from 976. The independent checker was gpt-6-astra. It found 16 wrong-detail comments, or 13.3%, with a 95% Wilson interval of 8.4%-20.6%. The strata were shapes 0/20 from 196, rooms 0/20 from 53, aliases 0/20 from 215 and other comments 16/60 from 512. Weighted by those populations, the observed rate was 14.0%. This is a lower bound on the true error rate.

The findings were one Armorog lower-bound detail, eleven sprite descriptions omitting the inverted-copy qualification, and four dialogue transcriptions with incorrect custom punctuation. All sixteen findings were upheld and corrected. Related descriptions were corrected together, including the decoded punctuation table. On 18 November 2026 a maintainer's sample on a Claude model (seed 51118: 60 written comments and five from each of the five largest template families, 85 in all) found 13 wrong, a weighted rate of 19.2%. Every note on the room and object name streams said that title and maker lettering was kept among them; the first name is room 0's, which the title screen draws. Message notes quoted their text only in part. The thirteen were corrected with every note that said the same thing. Then all 976 comments and every claim in this file were audited on the same model, in four address ranges: 73 comments and two claims here were corrected, and five more comments that shared an error. The largest error was in names: the dragon's six neck segments and head had been called fire pieces, Armorog a rat, the 'gator a dragon, the portcullis a lift and the Dizzy-hawk an alligator. A new sample after the audit (seed 51123, 85 comments drawn the same way) found none wrong, with a 95% Wilson interval of 0% to 4.3%.

## Open questions

The secret browser beyond the directory and some retained sprite-piece roles remain open. These are not reported as absent or unreachable. A full playthrough, replay and optional audit were not undertaken.
