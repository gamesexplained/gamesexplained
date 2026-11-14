# Level 4-2 — technical facts

The handover listing explains all 22656 tracked bytes, including 4755 code bytes. This main load replaces `$6C00-$AFFF`; its upper sprite load replaces `$E580-$F9FF`. Terrain definitions and characters are inherited from level 4-1. The clear pointer at `$B800` bounds the 128 active terrain definitions used here.

## Map and actors

The terrain rectangle is 103 columns by 63 rows, 6489 stored bytes at `$9000-$A958`. The actor directory reaches one hundred distinct terminated streams. Animation and property tables follow the map. The remaining main-load tail and the gap after the final actor stream are retained zero bytes with no established separate reader.

Type three is a walker with thirteen-entry falling and twenty-seven-entry extended/flattened curves. Certain jumping contacts flatten it and request 500 points; ordinary destruction requests 100 points. Type four is a three-piece appearing/disappearing hazard. Type five is a linked two-piece actor: the state-zero source remains passive, while its state-one partner owns the counter and motion curve. Type six builds a four-piece body with shared damage, three animation poses and a twenty-entry jump curve. Type seven is a fixed projectile emitter. Type eight can carry another instance below it; when that instance loses its parent or reaches the selected exact player distance it falls, then becomes an emitter on ground contact.

Type nine is a support actor. Its first accepted weapon hit changes the closed state/shape before subsequent weapon damage can reduce its counter. Player contact near the top adjusts player Y; deeper contact starts a bump curve and decrements its counter. Per-slot contact flags aggregate into resident support bytes `$62/$63`. Destruction fills free slots with timer/program-byte-derived particles that reflect signed speeds on sampled terrain. Types ten through fourteen select the resident no-op.

## Environment and transition

Initialization replaces four environment glyphs and twelve terrain properties. Eight direction helpers rotate the four-glyph pattern with selected suppression flags. Two other ten-glyph groups each cycle three eighty-byte frames through independent four-update dividers. Smaller fragments at `$C1B0/$C1E4` rotate bits in opposite directions.

A camera rectangle and grounded player state allocate the fixed slot-ten boss controller. Its Y is derived from an actor record at `$82A4`, whose low Y byte is also read directly at `$82A7`. A later exact camera column and player threshold select the ordinary automatic departure callback. This level inherits the disabled local-music state from level 4-1 and uses resident effects.

## Four-column boss

The boss uses four columns of four bands. Its byte counter starts at forty; damage subtraction underflow triggers destruction. Three player-contact rectangles either invoke ordinary damage or install a wheel-specific upward-left knockback callback. That callback cycles four player shapes while subtracting three pixels from Y and four half-pixels from X, then restores ordinary movement after X wraps.

The character-damage scan covers ten rows, testing two offset columns with two adjacent cells each. It consumes characters $C8 and above by writing $FF. Destruction creates eleven explosion actors at timer/program-byte-derived positions, starts the shared flash, restores the ordinary raster and requests 10000 points. An exact half-pixel body X of $DA releases the controller independently of damage.

The raster reuses four hardware sprites and directly selects the four live shape/colour matrices. At fine-scroll collisions `$7E86` temporarily substitutes three bytes in each of four bitmap shapes; `$7F10` restores the twelve saved bytes. A four-pose movement helper updates two bands of shapes and bitmap pointers and adds its selected vertical increment to every band.

## Open questions

Visible identities of several linked creatures, the support actor and the boss remain open. Retained zero allocations have no established separate consumer. No optional playthrough or combined-mechanics replay was recorded.
