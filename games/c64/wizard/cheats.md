# Wizard — controlled experiments

These are paused-emulator experiments on an already loaded level. Restore the original snapshot afterwards. They establish the engine's response to a forced state, not a legal player route.

| Effect | Change | Verification |
|---|---|---|
| Give the next collected key three charges | Write display digit `$33` to `$C31D` before pickup | Live: key pickup copied digit 3 to HUD `$C7AB` and set key flag `$C030` |
| Test the 10,000-point life threshold | Set HUD `$C7B7–$C7BE` to screen-code digits `00009950`, then collect a first-class treasure on Beginner | Live: score became 10000 and life count `$C008` changed 6→7 |
| Test Freeze hit processing | Spell ID `$C31C=4`, victim queue `$C039=1` for actor 0, with `$C066=0`, `$C051=0`, `$C02D=0` | Live: actor 0 color changed 1→3; this does not test projectile aim or immunity |

For the pickup experiments, the Playground snapshot's wizard sampled `$C693`; temporarily placing key glyph `$1B` or treasure glyph `$1C` there triggered the corresponding path. That address is state-specific, not a universal pickup address. Ordinary controls include RUN/STOP pause/resume and Q to return to the title (keyboard matrix row 7, columns 7 and 6).
