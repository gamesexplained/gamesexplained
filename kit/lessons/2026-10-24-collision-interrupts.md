## next · 2026-10-24 · The Sacred Armour of Antiriad (C64) · air with Claude

- **Check that the kit's machine raises every interrupt the game
  enables.** The game finds every touch, of the armour, an add-on or a
  creature, in its interrupt handler, which reads `$D01E` and `$D01F`
  when `$D019` says a collision interrupt came; `$D01A` enables both
  kinds. `kit/c64/machine.js` raised only the raster interrupt, so on it
  Tal walked through everything, and a route a bot found there would
  have played differently on a C64. In VICE (release v3.13.2) on 24
  October 2026, with two sprites overlapping for 17 lines, a program that
  never read `$D01E` was interrupted once and never again; a handler
  that read it at once was interrupted 15 times a frame, and one that
  read it 20 NOPs later 9 times: a collision raises the interrupt only
  when it sets a bit in a register that was 0. `kit/c64/frame.py irq`
  records this for both kinds (`kit/c64/fixtures/vic-collide-irq.json`),
  `site/lib/collide.js` raises it (`C.irq`), `machine.js` takes it, and
  `kit/c64/test_machine_collide.js` holds them to VICE: the counts agree
  for a read at once and, with the read later in the handler, as for one
  up to ten cycles earlier.
