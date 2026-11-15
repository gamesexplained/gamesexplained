# Count Duckula — facts

## Memory and display

The engine runs under port $35. The hardware IRQ vector alternates between gameplay ($24F1) and sprite scheduling ($29BE), with title/start/end handlers described in orientation.md. The VIC uses bank $C000 and D018=$08: a multicolour bitmap at $E000 with colour pairs at $C000 and third colours in colour RAM. Hardware sprite shapes $10-$77 occupy $C400-$DDFF, including physical RAM under I/O. Duckula uses three sprite components. Actors have parallel Y, low-X, high-X, pointer and colour arrays at $2946, $295E, $2976, $298E and $29A6.

The title logo is 320 bitmap cells at $1A80 with colour planes $1800 and $1940. The status panel uses colour templates $6830/$68F8 and bitmap $69C0. The bitmap font is $BE50: ten digits followed by letters; stored text uses standard screen-code A=1 through Z=26, space=$20. The cheat phrase uses PETSCII capitals. No private letter substitution was needed.

## World and movement

$FF40 holds six rows of thirteen world positions. Values 0-47 select 48 room pages at $7000-$9FFF; $FF means outside. $2E53 expands twenty by ten tile ids per room into 16-by-16-pixel tiles. The source-address tables at $30A1/$30C9/$31B9 select bitmap fragments; $32A5/$33B5 select two-by-two attributes from collision, packed-colour and third-colour planes at $5C00,$6000,$6400. Across all map pages the tile ids range from 0 to 217 and use 181 distinct values. Map tile attributes reach $5F6B, $636B and $676B. Extra fixed patches draw Nanny damage, floor changes and transitions.

$362A reads port-2 joystick bits. Left/right move the three player components, fire plus a direction selects a long jump, and terrain tests gate a vertical jump. $388D applies the signed 35-entry long-jump table; $39C7 accelerates falls to four pixels per update. Room exits change the world position by one horizontally and thirteen vertically. $F0 bypasses the normal left/right closed-door tests.

## Inventory, clock and hazards

$3FAB compares position against item actors 2-8. Keys have their own counter and nine initial records. Other objects enter slots $41D4-$41D6; overflow drops the oldest at Duckula and gives 150 updates of pickup immunity. The use handler $42D2 reads keys 1-3. Two puzzle actions are spatially restricted to rooms $06 and $22; combining item 7 with carried item 6 produces item 8, which activates the completion condition in room $06 at low-X $9C-$B0, high-X zero and Y below $50. The walkthrough and C64-Wiki identify the special items as a death mask (actor 4), sandbag (5), canopic jar (6), hammer (7), and large key (8); the two room tests and combination path distinguish their roles. The saxophone is the destination object (9).

The displayed clock begins at 9:59. Its divider resets to seventy in $5801. The ankh's pickup path $41DA adds two to the hours digit once, or caps to 9:59 when the sum reaches ten. This differs from the manual's three-hour use description. Igor's contact bonus $BD43 adds three to the tens digit, carrying into the hours at six. Ordinary actor contacts call $5801 directly through $BD63, independently of the normal divider. The colour flash counter does not prevent that clock call.

Mummies walk on floor value three and reverse at edges ($489F). The second mummy's shape computation at $4A2B reads the first mummy's frame phase $4A38. Crows have four persistent routes crossing room rows by thirteen ($4A61). Two rocks in rooms $4D,$37,$2A follow phase counters modulo one hundred ($4BDD). Bats use bounded oscillation and one-pixel pursuit ($4CBC). Nanny can replace door artwork in four named rooms ($5019). Igor's moving group is started in four rooms ($4ED2).

## Music and hardware census

$0E00 is the three-voice music player. The game writes request $87 at $24B7, selecting the first start and all voices; the driver reduces this to $07. The first start supplies sequence pointers $159E,$15AF,$15CB. Pattern ids index split pointers $14D1/$14F1, and instruments are eleven ten-byte records at $1530. The retained start-offset table accepts seven indices; only the first is requested by the decoded game's writes to $142F. Other start-table interpretations require checking before being called additional tunes.

The register census attributes VIC position, enable, shape/colour and raster writes to setup, gameplay and multiplexer routines. D011/D016/D018 and CIA2 port A select the multicolour bitmap. CIA1 port A/B and DDR select joystick/keyboard in $362A/$420F. Music writes SID frequency, pulse width, waveform, envelopes, filter cutoff/routing and volume from $0E00-$130B. CIA1 interrupt/timer writes at $24A8-$24B0 disable the system timer. A complete census was generated from every typed instruction, rather than a text-search result limit.

## Live checks

Stopping store watchpoints, with an execute checkpoint on each tested routine as control, observed the ankh bonus for starting hours 0,4,7,8,9; the clock's ordinary decrement, hour borrow and zero clamp; inventory shifting; and both writes of the second mummy's shape pair. The ankh stops were $4205 on the ordinary addition and $41EF/$41F2/$41F7 on the cap. Clock borrow stores stopped at $5809,$5816,$5819,$5826,$5829 and zero-clamp stores through $5841. The second mummy stopped at $4A31/$4A37 with shape values $4E/$4F when the first phase was four and its own phase wrapped independently. These are controlled routine fixtures, not claims of player reachability.

## Open data interpretation

Small retained tails at $2DA7,$5B7A,$6800 and $BF90 are shown and described as retained bytes. The decoded readers' bounds separate them from their neighbouring counted tables. Their original artistic or packing role remains open. No claim that a player can never reach an item is made.

## The listing's error rate

The independent sample (seed 20261114) drew 80 of 626 comments: 60 from 363 written comments and 20 from 263 generated descriptions. A fresh gpt-6.1-sol checker found one wrong detail in the written group and none in the generated group. The plain observed rate is 1.2% (95% Wilson interval 0.2%-6.7%); the population-weighted observed rate is 1.0%. The mummy animation description omitted the reversal path that reloads its divider with one. That wording was corrected; the shared-phase finding held. The sample measures a lower bound, and a later full audit is recommended.

## Page checks

The opening-screen reconstruction matches 104,448 of 104,448 emulator pixels. The static display capture has no raster-write history because this opening state reproduces without one. The room decoder matches the native $2E53 routine byte for byte for all 48 maps, including bitmap and all three attribute planes. All 104 sprite allocations are present in the listing. The isolated music wrapper matches 9,000 native driver ticks, every SID write in order, with nonzero volume during gated notes. The full-frame recorder crash is a tool limitation, not an unexplained display mismatch.
