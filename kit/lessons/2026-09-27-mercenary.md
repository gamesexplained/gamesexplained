## 0.0.30 · 27 September 2026 · Mercenary · air with Claude

**A whole game, checked against its own code, pass by pass.** Mercenary's
Play tab is the game's 294 routines ported one by one onto its own 64 KB,
and it was checked by running the game's code beside it in the simulator
with a C64 around it (`kit/c64/machine.js`, new), stopping both at every
checkpoint of the main loop and comparing all of memory at the start of
every pass: 11,240 passes from 38 moments of play, identical but for two.
The method is in the minisite skill's Play section. What made it work:
each group of routines tested alone first on random states, then the
whole loop in lockstep with the game's code standing in for the groups
not yet done, so a difference always points at one group.

**The differences that survive are the game's own races.** Mercenary's
panel interrupt prints Benson's figures with a scratch byte the sky fill
keeps its fill in, so a figure printed mid-fill leaves the rest of the
view white for a pass; and its lift ride changes a value the main loop
reads twice to be safe. A port that runs interrupts between steps cannot show
either. Hooking the machine at the store, the read and the interrupt
settles each one in minutes; guessing does not.

**Pace from a fit, not a guess.** The first speed model, a cost per stretch
of the main loop, ran walks 8 % slow on the surface and 14 % slow in the
rooms. Counting every
routine the port calls and fitting each one's own cycles on 69,569
stretches timed on the simulator brought every pass within about 1 %, and
within 2 % on sessions the fit had not seen. The page's clock then needed
two fixes the skill now names: a raster wait must not be lengthened by the
interrupts that fall in it, and a frame loop that runs "to the next frame
boundary" lets one long stretch carry the game ahead of real time.
