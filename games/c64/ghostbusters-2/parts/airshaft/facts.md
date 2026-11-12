# Airshaft facts

The listing uses the clean-boot play snapshot `work/play-clean.vsf`, with `work/entry.vsf` for the loaded-data audit. Its disk and boot route are in the game's `orientation.md`. The frame observation below was made on the earlier boot and still needs repeating on the clean boot.

- The hardware IRQ vector points to `$8D53`, which saves A, X and Y and dispatches through `$0314` or `$0316` according to the stacked status. In this snapshot `$0314` points to `$8D6F`, which sets display and sprite registers and schedules `$8E4A` at raster line `$2B`.
- A captured PAL frame writes `$0314/$0315` to select `$8E4A`, `$8EB1`, `$8F1F`, `$8F5E`, `$8FE4`, `$9087`, `$90CD`, `$90E7` and `$8D6F` in that order. These are the next handler addresses written by the preceding handler, not the raster lines at which those next handlers run. The capture is `work/frame-live.json`.
- The routine at `$AA6E` scans the keyboard and joystick. It increments the selection byte at `$A775` on a new Space press, wraps it after three positions, and uses `$A776` as the held-key latch. In VICE, holding Space from the clean-boot play snapshot changed those bytes from `01 00` to `02 01`. The meaning of each selection remains open.
- The code at `$8054` clears and initializes state, copies display resources and configures the video chip before entering the loop at `$83E5`. That loop waits for `$8026` to change and alternates update paths using `$803C`.

The clean-boot executed-address capture found 1,051 instruction starts. It covers only the captured play interval; unobserved code and data remain open. The disassembler's control-flow walk requires checking against data and the capture before its blocks can be treated as authoritative.

Comparing the clean airshaft entry with `work/story-before-airshaft.vsf` in the game folder, every byte of RAM under `$D000–$DFFF` is unchanged from the preceding story state. The airshaft can still use that RAM, so its ownership remains open. In `$4C68–$7A5F`, 2,334 of 11,768 bytes agree; the load changed most of that range. The comparison does not by itself establish what the changed bytes are.
