## next · 2026-10-17 · Jet Set Willy (C64) · air with Claude

- **A chip register that the interrupt and the main program both write
  can keep its race in the port.** Jet Set Willy's interrupt sets
  Willy's bit of `$D010` while the main program moves the guardians'
  bits with a load and a store of the same register; an interrupt
  between the two has its bit thrown away. The lockstep replays the
  interrupt's chip writes at the port's next yield, so a port that yields
  at the load and again at the store puts the interrupt where the game
  took it, and the comparison holds with the register kept. On the page
  the interrupt falls between them as often as the game's does. List
  every chip register the interrupt writes and every main-program write
  to the same register, and give each read-modify-write a checkpoint at
  either end, and a run of writes a checkpoint before each, before
  calling a difference a race to leave out.
- **Measure a routine's cost to every way out of it, and the
  interrupt's by the branches it takes.** Jet Set Willy's page ran 1.4
  to 1.8 % slower than the game for two reasons. The player update
  leaves through jumps back into the main loop, with no return to close
  a measurement, so those routines went uncosted. And the interrupt's
  cost was averaged per band of raster lines, when its own work (a rope
  to copy, a conveyor to animate, the tune off) changes its length more
  than the band does. Hook each routine's entry, close it at its return
  at the same stack depth and at each jump that leaves it, take out the
  cycles of any wait inside it the port yields on its own, and key the
  cost by what decides the work (the items in the room, the arrows in
  flight). Average the interrupt per branch taken. Then hold the pace
  against the game on an input the costs were not measured on.
