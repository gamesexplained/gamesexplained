# Hunter Patrol: agent history

13 November 2026, one run on claude-sonnet-5-5 in a cloud container.

- The first play snapshot was taken while the plane was exploding (`$3F` was 2), and every control test on it gave nothing: the game was in its crash animation. A second snapshot, taken with `$3F` at 0, gave the controls. The kit warns about it in `10-orient`; the check that would have caught it is reading the game's state variable before saving.
- The loader first looked like the game's start, but the real game is already unpacked when the cracker's menu waits at `$F142`; the checkpoint on the game's first instruction fired at `$A000` first, a call from `$14F5`, which turned out to be the music driver's install entry.
- The strafing-run prompt needs fire to be released and pressed again; an autoplay script that held fire the whole time sat at it for 150 seconds.
