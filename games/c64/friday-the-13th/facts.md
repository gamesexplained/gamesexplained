# Friday the 13th — facts

State what is true now. Each row is traced or observed.

## Hardware registers

The census (`python3 kit/cpu/census.py`) on `work/play-start.vsf` with the blocks of code that ran during play. 234 instructions name 52 registers.

| Chip | What the game does | First seen |
|---|---|---|
| VIC-II sprites | writes positions and colours of sprites 0 and 4 to 7, enable at `$D015`, multicolour for all (`$D01C` = `$FF`), priority at `$D01B` | `$92D3` onward |
| VIC-II bitmap | switches `$D011` and `$D016` for bitmap and multicolour, `$D018` for the memory layout | `$9316`, `$9387`, `$9367` |
| VIC-II raster | reads `$D012` and bit 7 of `$D011` | `$9A9B` |
| VIC-II collisions | reads `$D01E` and `$D01F` | `$9D8A`, `$9D84` |
| SID voices 1 to 3 | frequency and control writes from three note scripts; the filter and volume register at `$D418` | `$C58C`, `$360B` |
| CIA 1 | reads the joystick and keyboard matrix at `$DC00` and `$DC01` | `$A693` |
| CIA 2 | selects video bank 1 | `$935B` |

The sound routine at `$C604` runs three voices from note scripts, each with a tick counter (`$0800` to `$0802`) and a script pointer (`$FB`, `$FD`, and `$8B`). A script byte of `$FF` ends a voice and a byte of `$80` or more is a command handled at `$C78A`.
