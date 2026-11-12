# Resident story and loader stash

The snapshot `work/copied.vsf` stops at `$1000` immediately after the forced airshaft-success route copies RAM beneath I/O into lower memory. At that stop `$D000–$DBFF` matches `$1000–$1BFF` byte for byte and `$DC00–$DFFF` matches `$0400–$07FF` byte for byte. The source `$D000–$DFFF` is identical in all seven scene snapshots. The three gameplay-load write maps in `orientation.md` record no RAM writes to that range. The other parts exclude those captured bytes from their own coverage so the stash is counted here once.

The source’s other consumers, its origin at boot, and the ranges loaded over it in each scene remain open. The entry and call sequences copied to `$1000–$117E`, and two display-setup paths copied to `$117F–$11F6`, are described in the stash listing. The byte at `$11DD` and the purpose of most called routines remain open.

The copied code at `$11F7` and `$1216` calls KERNAL SETLFS, SETNAM and LOAD for the nine-byte filename `SIDE FLAG`, then reads `$2000`. Two identical 120-byte messages at `$125F` and `$12D7` ask the player to turn the disk over and press fire. The routines at `$11A2` and `$11DE` can display the messages and repeat the reads according to the returned value, but the setup paths at `$119F` and `$11DA` jump past those checks. This describes the captured Censor code; other entry paths and other releases remain open.

The routine copied to `$134F` selects RAM under I/O with `$01=$34`, copies `$DC00–$DFFF` to `$0400–$07FF`, then writes `$36` to `$01`. This is a second copy path visible in the stored code; the separately observed transition in `orientation.md` copies the same source pages at `$02A7`.

The routine copied to `$13B4` clears `$4000–$53FF`, initializes screen and colour bytes, sets sprite positions, and fills the eight sprite pointers and colours. It writes `$01=$35` before accessing the video registers, so the store at `$13EA` reaches the VIC at `$D000` rather than the hidden-RAM stash at that address.

The copied routines at `$145F`, `$1490` and `$14B2` fill overlapping indexed screen and colour-memory ranges with fixed values; their store order is recorded in the stash listing. `$14D4` waits for the value at `$0E` to change.

The routines copied to `$14DB` and `$1538` each wait for `$0E` to change, copy `$6400–$77FF` to `$4000–$53FF`, and copy three indexed blocks from `$7800–$7A7F` to `$6000–$627F`. Two destination ranges overlap, so the listing records the store order. The routines differ in their colour-memory writes.

Three similar routines at `$1593`, `$15EE` and `$1649` copy twenty-page regions beginning at `$7B00`, `$9200` and `$A900` respectively to `$4000–$53FF`. Each follows with three indexed copies to `$6000–$627F` and colour-memory writes; their source addresses are listed with the routines.

The story engine installs raster handlers through pointers rather than direct calls. The handlers at `$17D7`, `$1805`, `$1858`, `$188C`, `$18B4` and `$18DC` schedule one another through `$1907`; the last two return to `$17D7` and call the sound update when `$145E` is nonzero. Their register writes and raster compare values are described in the stash listing. No frame-rate claim follows from the static code alone.

The routine copied to `$1924` accepts a text pointer in X/Y. Its continuation at `$1928` reads 40-byte rows, converts each row into two buffers through `$1A12`, scrolls screen rows through `$19B9`, and inserts a buffer through `$19F5`. A zero byte at the start of a row ends the passage and is skipped. A joystick or keyboard input returned by `$16F2` can end the routine earlier. Several story call sequences pass `$C200` as the initial pointer.

The bytes copied to `$16A4–$16CA` decode as an `$A5` seed for zero-page `$0D` and a left shift whose incoming bit is the exclusive OR of the old bits 1 and 6. The code returns the old bit 7 in carry. How either entry is reached remains open.

A stored 40-byte row copied to `$1AB7` reads “this is just some test text!”, surrounded by spaces and followed by zero. Whether the game displays it remains open. The following bytes decode as a copy routine at `$1AE0` whose destination range includes its own operands. In a forced VICE run from `work/copied.vsf`, a store watchpoint at `$1AF3` stopped on each write: its source-high byte advanced from `$D0` to `$DA`, then the copy wrote `$D0` back over it. `resident-overlap-vice.json` records the stops. A bounded processor-model run stopped at the same first overlap. Normal reachability and behavior after that write remain open.
