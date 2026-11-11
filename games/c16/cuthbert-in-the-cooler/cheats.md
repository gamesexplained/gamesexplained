# Cuthbert in the Cooler — cheats

These addresses refer to the unpacked engine. Keep the supplied PRG unchanged; use an emulator's paused memory editor for an experiment. Hexadecimal addresses begin with `$`.

| Effect | Change | Status |
|---|---|---|
| Set bomb inventory | $007B = 0–9, then let $1F49 redraw the panel. | Live with 9: five icons are shown. |
| Choose a level | Set $002E before the builder called from $1158 runs. | Live layouts 1–10 and the 255→0 transition; changing it after a build can mix that level's data with another's. |
| Force the next timeout | $0036 = 1 and $0037 = 0 at the main-loop boundary. | Live: the next tick invokes death; five repetitions reach game over from the initial life character. |
| Set the displayed spare-life character | $1A26 = ASCII digit $30–$39, then call $1A0E. | Original-code tests confirm digit 4 means five attempts. Zero is a string terminator, not ASCII zero. |
| Pause / resume without editing memory | P / R. | Live, handled at $1339. |

## Catalogue patch candidates

Plus/4 World's cheats page names these engine patches. Their instruction meanings are traced here; they were not applied to the supplied game in the published analysis.

| Effect | Candidate change | Code meaning |
|---|---|---|
| Preserve lives | $19F8 = $AD | Turns `DEC $1A26` into a read of the character. |
| Preserve bombs | $1A4B = $A5 | Turns the inventory decrement into a zero-page read. |
| Preserve the bonus | $197B = $A5 | Turns the bonus decrement into a zero-page read. |
| Ignore lethal contact | $1A3D = $00 | Changes the qualifying branch to the return immediately before the death jump. |
| Permit an immediate exit | $17E5 = $24 | Turns the object-count increment into BIT, leaving the built maze's count at zero. |

The catalogue also patches $1964, the decrement used by the faulty extra-life limiter. Its behaviour differs from the ordinary death decrement. All are candidates, not live-verified modifications.
