# Fantasy World Dizzy — facts

## Program and data

The listing counts 52,101 bytes: 10,181 code bytes and 41,920 data bytes. Every counted byte is described. The listing's loaded-data check reports no uncounted allocation. The single packed disk program is answered in media.json. System/loader remnants and generated buffers are excluded with their ranges and reasons in game.json; retained game dialogue fragments remain counted.

The game starts at $190E; the main loop begins at $1A25. Five 134-byte initial tables at $C400, $C486, $C50C, $C592 and $C618 supply room, X, Y, attributes and shape, copied to live tables at $C69E, $C724, $C7AA, $C830 and $C8B6. Room four denotes carried objects and $FF denotes removed objects. The directory has 101 drawing streams and 2783 records. All shapes named by those records and the initial object tables resolve among 196 valid shape headers.

## Live instruction evidence

- Matrix events for ESPILCE stopped after each comparison at $3B11, with X advancing zero through six. The final stop at $3B1D had A=2 and X=7; single steps followed its spare-life store. Raw evidence: work/secret-trace.json.
- At $33AA with joystick port two held right, stepping LDA $DC00, EOR #$FF, AND #$1F and STA $03C0 stored $08. Raw evidence: work/control-trace.json.
- From the opening snapshot, player X was forced to six beside the dungeon flame. The death checkpoint at $2572 stopped with A=$2F, the fire reason. At $25B4 the spare-life byte was two; a single DEC instruction changed it to one. These are isolated forced-state checks, not a route through the game.
- The coin collector was entered with pickup ID $1A and decimal counters 2,9. Seventeen instruction steps traversed its carry path and left 3,0. Raw evidence: work/coin-trace.json. This proves the collector's arithmetic, not a natural route to thirty coins.
- A store watch on $F000-$FFFF, armed before leaving the intro, stopped at $0405. Stepping exposed LDA ($2F),Y / STA $FF00,Y / INY / BNE $0400, followed by decrementing the destination page and source high byte. Retained dialogue windows match the earlier text region at varying offsets. Raw evidence: work/loader-write-trace.json. This loader evidence establishes provenance; the loader is not a discovery on the site.

## Video and glyphs

$3B6D selects video bank $4000, bitmap $6000 and matrix $5C00. The recorded opening frame had zero video-register writes. Its reconstruction matched all 104448 VICE pixels, with zero differences. The page embeds only the trimmed graphics data that the video chip reads.

The renderer $2B5B takes shape A, X at $033A in four-pixel units, Y at $033B in pixels, attributes $033C and collision flags $033F. Shape headers give width in four-pixel units and height in pixels; each row has width/2 bytes. Font IDs $30-$5A force one byte by eight rows. $A400 reverses each byte's bits. The Graphics viewer runs the original drawing routine for mirroring and nibble shifting.

The font was rendered and read. $26/$27 are quotation marks, $30-$39 digits, $3A space, $3B apostrophe, $3C comma, $3D hyphen, $3E full stop, $3F question mark, $40 exclamation mark and $41-$5A A-Z. Message bytes >=$64 position the cursor, bytes >=$C8 select colour, $FA draws a box, $5F waits for action and $FB-$FF terminate. Message pointer $3B extends into retained text rather than a normal empty-inventory message; its player-facing consequences remain open.

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

test_views.js runs 202 room views (objects on/off), checks 2783 record boundaries and executes 784 shape/mirror/shift cases. test_music.js compares every SID write for five selections over 5628 timer ticks; the driver factory is isolated as the audio worklet isolates it. Firefox 160.0 exercised all 101 room and 196 shape selections, sprite controls and animation. All five audio worklets produced nonzero output with envelopes and volume active. The blank $45 sprite is deliberate. The browser log had no errors.

## The listing's error rate

Seed 20261114 drew 120 comments from 976. The independent checker was gpt-6-astra. It found 16 wrong-detail comments, or 13.3%, with a 95% Wilson interval of 8.4%-20.6%. The strata were shapes 0/20 from 196, rooms 0/20 from 53, aliases 0/20 from 215 and other comments 16/60 from 512. Weighted by those populations, the observed rate was 14.0%. This is a lower bound on the true error rate.

The findings were one rat lower-bound detail, eleven sprite descriptions omitting the inverted-copy qualification, and four dialogue transcriptions with incorrect custom punctuation. All sixteen findings were upheld and corrected. Related descriptions were corrected together, including the decoded punctuation table. The listing has not had a full audit. A later full audit is recommended; it is outside this run's agreed scope.

## Open questions

The post-cage coin's reachability, the secret browser beyond the directory and some retained sprite-piece roles remain open. These are not reported as absent or unreachable. A full playthrough, replay and optional audit were not undertaken.
