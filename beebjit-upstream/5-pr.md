Fixes #ISSUE. This is a draft because `ss` is marked deprecated: the issue asks whether you want it.

A load now carries on from exactly where the save left off. The extra state goes in a block in the second half of the 64K RAM field, so the file stays a B-em 2.x snapshot of the same size. The block has a signature, a size and a CRC. If any of them doesn't match, the load uses the B-em fields alone, as before.

The block holds:

- the tick and cycle counts;
- both VIAs' timers, ports and control lines;
- the 6845's counters and flags;
- an ADC conversion in progress;
- the SN76489's bus state;
- the ACIA and the serial ULA;
- whether the CPU had already committed to an interrupt when it saved.

For other programs that read the file, the save also fills the B-em fields it can: IC32, the VIA input registers, CA1 and CA2, and the 6845's counters. On load, setting the 6845's registers also updates the values worked out from them, as a register write does.

**One thing that changes:** the tick count carries on from the save, so `breakat <n>` counts from power-on, as in the saved run. A script that loads a state and then runs a million ticks must add the saved count.

**Not carried:** disc and tape drive state, and keys held down at the save.

**Test:** "Checking state save and load." repeats the RVI check across a save and a load, in interp and JIT modes. On master the loaded run draws `0xb7104f74`, not `0x2c23c1b6`. `./build.sh` passes, and jsbeeb 2.4.0 loads the new files and runs on.
