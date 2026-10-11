## 0.0.118 · 9 October 2026 · Gribbly's Day Out · air with Claude

**A row read with `(zp),Y` runs on into the next row.** Gribbly's Day
Out keeps its map as 256-byte rows, one to a page, and draws the view
with `LDA ($1A),Y`: the low byte is the view's first column and Y counts
40 across. When the first column is past 216 the read crosses the page,
and the right of the screen shows the next row's first columns, the
map's left wall, one row down. The game uses it as the map's right wall
and two levels open on it. The annotation said "40 tiles from the map"
and missed it; the levels page drawing the first view past the map's
edge showed it. When a pointer's low byte is a coordinate, work out what
the last index reads with the coordinate at its largest, as for any
indexed read (Classic Adventure, above).

**A checker's correction is a claim too.** The agent that checked the
listing's sample rewrote one comment to say an ended effect always
chains on voice 1. The port of the sound driver, tested call by call
against the game's code, failed on voice 2: the chain is read through
`$CE`,Y with Y still at voice 2's register offset, so voice 2 reads its
own spent repeat count and never chains. Where a test can settle a
correction (a port, a live count, a simulator run), run it before the
correction goes into the listing.
