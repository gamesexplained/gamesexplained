# The Last Ninja — verified technical facts

## Opening Wastelands

- VICE boots Side 1 directly into the first room. Two cold boots
  produced the same opening screenshot. A 24-frame port-2 right hold
  moved sprite 1 from `$6C/$82` to `$84/$83` at `$D002/$D003`.
  Restoring the gameplay snapshot restored its starting coordinates.
- The hardware IRQ vector points to `$554D`, whose prologue saves A,
  X, Y and `$01`, then selects the I/O area before testing `$D019`.
  The VIC path writes the flags back to `$D019`. The other path can
  increment `$1B` at `$5565` before reading `$DC0D`.
- The gameplay loop spins at `$BD14` until `$1B` differs from the
  saved tick at `$0268`. It copies the tick and reaches the first
  update call at `$BD20`. In one uninterrupted test interval,
  non-stopping execute checkpoints counted 23 hits at `$554D`,
  12 at `$5565` and 12 at `$BD20`.
