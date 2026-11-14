# Fantasy World Dizzy — facts

## Verified observations

- The secret sequence is **ESPILCE**, entered during play. Matrix key events drove it from the play snapshot. Execute checkpoints stopped after each key changed at $3B11, with X advancing from zero through six and A reading $0D,$29,$21,$2A,$14,$0E,$40. A final stop at $3B1D had A=2 and X=7. Five single-instruction steps followed the store to $03B9 and call to $3814; the spare-life byte read two. This tests the genuine input path, without poking the key variable. The raw trace remains in `work/secret-trace.json`.
- The initial spare-life value is two at $19A2. The death path checks it for zero at $25AC before decrementing at $25B4. This gives three attempts from a new game.
- The renderer at $2B5B draws bitmap shapes; the player uses hardware sprites. Shape headers give width in four-pixel units and height in rows. Letters and digits $30-$5A override the header to one byte by eight rows.
- The room decoder parsed 101 streams and 2783 records between consecutive offsets relative to $80CC. This establishes stream boundaries, not player reachability of every room.
- The coin collector accepts object IDs $1A-$37, thirty IDs. Decimal units are $18E6 and tens $18E5. The later Daisy test compares tens against three at $2A68.

## Text encoding

The text renderer treats $26-$5A as drawable shape indices, with $30-$39 digits and $41-$5A letters A-Z. Shape $3A is blank; $3B is an apostrophe. Other punctuation needs visual confirmation before quoting it. Text bytes at least $64 can change the cursor, and bytes at least $C8 can change colour. $FA draws a box; $5F waits for action; $FB-$FF terminate scripts. Names and messages must be decoded as these scripts, rather than by an ASCII search alone.

## Memory and hardware

Video setup $3B6D selects bank $4000, bitmap $6000 and matrix $5C00. $33AA reads joystick port 2 at $DC00. $3541 merges the KERNAL keyboard variables $C5 and $028D. The sound driver writes the SID through voice offsets zero, seven and fourteen. A complete register census and live tempo measurement remain open.

## The listing's error rate

No independent sample has been drawn or checked. The annotations are a draft. Generated room and shape descriptions need their own sample stratum.

## Open questions

Complete the authored-data ledger, classify loader leftovers using producer traces and watchpoints, verify the shape renderer against all relevant flags, confirm sound selection and timing, and sample the listing independently. Puzzle branches are traced in the listing; their decoded message and object names still need integration into the explanation.
