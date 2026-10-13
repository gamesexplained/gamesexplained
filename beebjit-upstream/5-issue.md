## What goes wrong

Loading a state puts back the 6502, the memory and the chips' registers, but not where the machine was in time:

- the tick count starts again at 0;
- the VIA timers, the 6845's counters and the next video event start from scratch, so the first frame after a load is the wrong length;
- the ACIA, the serial ULA, an ADC conversion in progress and the SN76489's bus state go back to power-on;
- IC32 is never set. The save writes the system VIA's port B inputs into the IC32 field, and the load reads that field back as the inputs.

So a loaded machine soon drifts away from the one that was saved.

## How to see it

The RVI demo only draws correctly when the timing is exact. Save it partway through, then load it again. This needs an X11 build, because it checks a drawn frame:

```
./beebjit -0 test/display/raster-c.ssd -mode interp -autoboot -headless -fast -accurate -debug -commands "breakat 10000000;c;ss raster.bem;q"
./beebjit -load raster.bem -mode interp -fast -accurate -debug -opt video:always-render -commands "breakat 1000000;c;eval frame_buffer_crc32;q"
```

The loaded run draws a frame with CRC `0xb7104f74`. The unbroken run draws `0x2c23c1b6`, which the existing "Checking RVI rendering." test expects. (The `breakat` is 1000000 because the tick count restarts at 0.)

## A possible fix

Most of what's missing has no field in the B-em format. Our fix puts it in a small block in the second half of the 64K RAM field. A model B has no RAM there, beebjit only reads the first 32K of that field, and B-em and jsbeeb load it into memory a model B never uses. The block has a signature, a size and a CRC. If any of them doesn't match, the load uses the B-em fields alone, as it does now. So the file stays a normal B-em snapshot of the same size.

We saw that `ss` is marked deprecated and that save state is on the backburner list, so the pull request that follows is a draft. It's about 760 lines across 21 files, with a test. If you'd rather do this another way, such as B-em's newer BEMSNAP3 format, or not at all, that's fine.

## Something small we noticed

In `state.c`, the noise timing is halved on load and doubled on save for channel 0 (`if (i == 0)` in both loops). In beebjit's order, channel 0 is a tone and channel 3 is the noise, so it looks like that should be `i == 3`. beebjit reads its own files back fine, but B-em and jsbeeb get tone 0's period and the noise period wrong by a factor of two.
