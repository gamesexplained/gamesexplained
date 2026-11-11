# Kikstart — features

The checklist was written from the documentation before reading game code.
Statuses are open, traced, confirmed, live and differs.

## Sources

- Mastertronic's cassette instructions, English panel, 1986: [cassette back](https://plus4world.powweb.com/dl/covers/k/kikstart_back.gif), read 11 November 2026. Preserved in `reference/web-kikstart_back.gif`. It names sixteen courses and the keyboard controls. The printed joystick numbering is “port 0”; the kit's emulator calls its ports 1 and 2, so the mapping needs a live test.
- [Kikstart — Plus/4 World](https://plus4world.powweb.com/software/Kikstart), read 11 November 2026 through the web reader. Credits, PAL/16K classification, reference screenshots and cheat claims. A direct HTML request returned 404; its image URLs answered.
- [Game Review: Kikstart (Commodore 16 and Plus/4, Mastertronic)](https://mastertronic.co.uk/game-review-kikstart-commodore-16-and-plus-4-mastertronic/), Warren Pilkington, 4 February 2024; read 11 November 2026. Its observations are leads to check against the supplied game.

## Features

| Feature | Status | Where |
|---|---|---|
| Sixteen courses | confirmed | Sixteen starts at $1E50/$1E60; input-only selector reaches 16 |
| A time allowance for each course | live | $1E70 time-credit table; $2304 countdown and pending-time transfer. The complete route confirms that remaining time carries through the bonus |
| Keyboard 3 accelerates; 4 slows; T jumps | differs | $2704 and matched-state tests: 3 brakes, 4 accelerates, T jumps |
| Joystick horizontal movement changes speed; fire jumps | confirmed | Emulator joystick 1 left/right/fire matches 3/4/T; printed “port 0” maps to this tested set |
| Obstacles require timed jumps | confirmed | $23EC surface properties; $2784 riding and $28F8 airborne tests; live jump |
| Title or attract display previews a course and plays music | confirmed | Attract state 0, $2DB4/$2AA0, observed scrolling with recorded TED writes |
| Five bikes at the start; collisions cost one | confirmed | $2640, $26AC, $2894; live start and controlled crashes |
| Timer exhaustion and losing all bikes end the game | confirmed | $2190 converts zero time into a final crash; $2894/$26CC; controlled one-bike crash reaches game over |
| First sixteen course completions restore one bike, up to five | live | $2A4A, with course-index guard; the complete route uses five crashes and recovers its fifth bike at the final bonus |
| Remaining time and bikes contribute to a course bonus | confirmed | $2964/$2834; three bikes display 040, five display 099; $1E10 applies the multiplier |
| Recovery scrolls to a safe place while time continues | live | $2894/$2948; the complete route recovers from crashes on courses 10,11,13,14,16 and resumes riding |
| Speed can change during a jump | confirmed | $28F8 calls $2E44; sprite remains airborne in live T test; page tests compare the air control helper with the 6502 |
| Springboards change the jump | confirmed | $2784 tests both $40 flags; controlled contact launches at $A0 (-96), versus normal $CC (-52) |
| Clouds darken and release lightning | traced | $1CA8 palette cycle; $2524 lightning phase; $22C0 bolt drawing; full player contact route unrecorded |
| Balloons and crosses can award points or time | confirmed | $2D48 types 0-4; controlled contacts queue five seconds or award 20/50 points on course 1 |
| Later courses introduce different terrain | confirmed | The sixteen pointer spans differ; course 16 reached with the built-in selector |
| Holding 3 and 4 opens a built-in course selector | confirmed | $2DB4; 105 held frames latch $56=$64, then 3 wraps to course 16 |
| Course sixteen has an ending or wraps to an earlier state | live | The 36,979-poll route finishes all sixteen courses, wraps to $2F00, reads the $FD finish marker at $2F10, awards the final bonus and resumes riding at counter 16. Further right input accelerates normally |
| Title music and gameplay sound effects | confirmed | $2AA0 packed two-voice tune; $2AEC ramps; live TED write recording |

## Beyond the documentation

The printed keyboard speed directions are reversed in the supplied copy.
The bikes bonus uses a nonlinear table (10,25,40,75,99), calculated before
the extra bike is granted. The tune occupies bytes inside the $1800
character bank that are not used for its displayed message glyphs.

## Open questions

The supplied packed release's provenance remains open. The original
cassette, including its loader, was not supplied. The recording verifies
the first lap and 64 further control polls; later laps remain a follow-up.
