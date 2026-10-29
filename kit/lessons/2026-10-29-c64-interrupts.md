## 0.0.267 · 2026-10-29 · Into the Eagle's Nest, Jet Set Willy, Master of Magic, The Sacred Armour of Antiriad (C64) · air with Claude

- **Let the kit's C64 take a game's interrupts.** The machine now takes
  them as the processor does by default: inside a handler that has run
  `CLI`, again straight after an `RTI` that leaves the line held, one
  instruction after a `CLI`, and through the KERNAL's entry while the
  KERNAL is banked in (#525, #556). Five games' tests had a `tick` or a
  `take` of their own, most of them to bring the interrupt in through the
  KERNAL, and each ran its handlers whole, so they kept the old model
  however the machine changed. With them gone, and the KERNAL's exit left
  to the machine or to a hook that ends with `leave()`, the lockstep was
  identical again: Jet Set Willy for 40,000 passes, Master of Magic in
  every session, Into the Eagle's Nest for 1,500 frames of each session.
  `onInterrupt` and `onReturn` watch the interrupts where a test wrapped
  `cpu.irq` to do it.
- **Carry a route kept a byte a frame to a changed machine by its reads.**
  The Antiriad route's joystick parted from its stages at frame 4,832
  once the machine took interrupts a few cycles differently, because
  some reads of the stick moved into the next frame. Given the value of
  each read of Tal's controls from the old run instead, the new machine
  made the same 1,954 reads and passed every stage in its room within
  four frames, so the route's check in VICE, made a read at a time,
  still holds; the frames were then written again from where the reads
  fell.
