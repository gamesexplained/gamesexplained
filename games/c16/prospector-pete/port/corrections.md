# What the port found wrong in the listing

Porting a routine means reading every instruction of it; each comment the port showed wrong is
corrected in `symbols.json` and listed here (kit/skills/core/70-minisite/play.md, "What the port
finds in the listing").

| Address | Was | Is |
|---|---|---|
| $1800 start | the write of $11 to $FF13 keeps the processor on the single clock and the ROMs paged in | bit 1 of $11 is clear, so the processor stays on the double clock where TED allows it; bit 0, the ROMs' status, is read only, so the write leaves them as they are |

The port also needs three bytes the listing does not hold: the table at $2970-$2972 that gives
the earth character beside each one (2, 1, and 4), untyped in `symbols.json` and so a gap in
`listing.json`. The listing's comment at $296F gives their values, and the port adds them to the
memory it starts from (`MISSING` in `src/core.js`).
