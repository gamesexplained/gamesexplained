## next · 3 October 2026 · Fat Worm Blows a Sparky, the typing pass · yozlet with Pi (DeepSeek 4.1 Flash)

**A code/data sweep has to be iterated to a fixpoint, because a wrong type
hides what it calls.** The maintainer's review of this game's first pass
found 5.9 KB of reachable code filed as data. Measuring it showed why a
single sweep cannot find that: a walk decodes only what its input tells it
is code, so a stretch filed as data is skipped *and* so is every routine
that stretch calls. One `sna2ctl.py -m <executed-address map>` pass over
this image reported 3,320 such bytes. A recursive trace that adds a
target's whole chain as soon as it finds it - and re-running it after each
retype - reported **5,934**: the 2,600-byte difference was entirely behind
stretches the first pass still called data. The clearest case was 13 bytes
at `$7790` holding `CALL $7C13 ... CALL $D05E`; while it was data, the
611-byte halt screen at `$D05E` was invisible to the map *and* to the walk.
`50-coverage` now says to repeat the sweep until a pass adds nothing, and
the ZX Spectrum's `tool-zesarux` has the commands and the decimal-address
trap in `sna2ctl.py`'s output.

**Measure a fill; do not count its loop bodies.** `$D37D` builds the halt
screen's pattern by pushing with `SP=$0000`, working down from `$FFFF`. Its
extent was in dispute - the earlier note said 1 KB at `$FC00-$FFFF`, the
review said 4 KB at `$F000-$FFFF` - and counting the pushes from the loop's
immediates gave a third answer, 1,842 pushes (about 3.6 KB), which is wrong
because `DJNZ` with `B=$07` runs its body eight times, not seven. Running
the routine in SkoolKit's simulator and watching the stack pointer settled
it in one call: the lowest SP is exactly `$F000`, so the fill is the
review's 4 KB. A loop body's run count is an off-by-one waiting to happen;
where the routine can be run, run it.

**A port of a shift-and-add is not checked until it is differential-tested.**
The page's `mulScale` reimplemented `$811E` and returned 29 where the
routine returns 285, because it masked the accumulator to 16 bits *before*
taking the carry out of the top for the routine's final fold - so the carry
was always zero. Reading the two side by side did not show it; running both
over 789 inputs (every boundary value plus 600 random pairs) did, and the
same harness is what made the fix trustworthy. The page now says the widget
was checked that way, and `70-minisite` says to check a port against the
routine rather than against the author's reading of it.
