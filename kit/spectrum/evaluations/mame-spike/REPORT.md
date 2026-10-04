# MAME as the emulator layer for the ZX Spectrum in the kit — spike report

Throwaway spike, `tools/mame-spike/` (gitignored). No git command was run; nothing
outside `tools/mame-spike/` was created, edited or deleted.

Everything below is measured on this machine on the date of the run, with the
commands given. Where a claim comes from reading MAME's source rather than from a
measurement it says so.

## What was run, and what it answers

`kit/EMULATOR.md`'s four phases, for the 48K ZX Spectrum under MAME 0.289 driven
through its GDB stub, with a Lua shim as the only other channel.

**Machine and tools**

| | |
|---|---|
| MAME | 0.289 (`unknown` build string), `/opt/homebrew/bin/mame`, Homebrew bottle, `/opt/homebrew/Cellar/mame` = 495 MB |
| Licence | GPL-2.0-or-later (Homebrew formula) |
| ROM | `tools/mame-spike/roms/spectrum.zip` → `spectrum.rom`, 16384 bytes, CRC `ddee531f` (48K ROM; MAME ships none and the kit cannot commit one) |
| Lua | MAME's own binding (`-autoboot_script`), API documented under `docs/source/luascript` and declared unstable |
| Client | `tools/mame-spike/rsp.py`, a stdlib-only GDB RSP client (throwaway; ~200 lines) |

Reproduce:

```
SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy \
  /opt/homebrew/bin/mame spectrum -rompath tools/mame-spike/roms \
  -video none -sound none -debug -debugger gdbstub -debugger_port 23946 \
  -seconds_to_run 7200 -nothrottle
python3 tools/mame-spike/spike.py all        # all four phases, exit 0
python3 tools/mame-spike/probe_counter.py    # the counter and frame-cadence numbers
```

### macOS gotcha, first finding of the day

On this Homebrew SDL3 build, `-video none -sound none` does **not** keep MAME quiet:
it still opens a window on the desktop. The SDL dummy drivers do:

```
SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy
```

`harness.py` sets them for every MAME it starts. A kit launcher on macOS would have
to do the same. (Also: `-console`, the Lua console, is *not* available in this
build — MAME dies at startup with `Fatal error: Console plugin not found`. Only
`-autoboot_script` and plugins work here.)

### Two structural facts about the gdbstub, before the phases

1. **One connection per process.** After the client disconnects, the port is not
   listened on again (measured: `connection refused` on a second `connect()`, and
   `lsof` shows the accepted socket in `CLOSE_WAIT` and no `LISTEN`). A crashed
   script means restarting the emulator; a client must reconnect by restarting MAME.
2. **`?` is not a state report.** MAME answers any `?` with a `T05`-style stop
   packet *including a PC*, whether the machine is stopped or running (measured:
   `?` returned `T05...0b:ac10;` while `totalcycles` grew from 28.4 M to 40.5 M
   around it). The honest running tests are a growing hit count, or `totalcycles`.

## Phase-by-phase

| Phase | Verdict | Exact command that measured it |
|---|---|---|
| 1 static inspection | **Pass**, one wart | `m4000,2000` / `g` via `rsp.py`; `monitor printf "%d\n",im`; 48K dump = 6 × `m4000,2000`; snapshot compared byte for byte |
| 2 state management | **Pass** | `monitor statesave <path>` / `monitor stateload <path>`; `bpset 8203,1,{temp7 = temp7 + 1 ; g}`; three `stateload` + `c` cycles compared by SHA-256 |
| 3 live measurement | **Pass** | `bpset 8203,1,{temp7 = temp7 + 1 ; g}` (counts and continues), `printf "%d\n",totalcycles`, `monitor gvblank`, Ctrl-C byte `0x03` |
| 4 frame stepping + input | **Pass with a workaround** — see "the crux" | `bpset 38,totalcycles >= #N` + `c`; `monitor gvblank`; a Lua input shim fed by `M<addr>,<len>:<hex>` over RSP |

### Phase 1 — static inspection: pass

- **Read any range, one call of any size.** `m<addr>,<len>` returns hex; the stub's
  packet buffer caps a reply at 16384 hex chars, so 8192 bytes per round trip.
  Measured: 1 byte, 256, 4096, 8192 → 1 round trip each; 8193 and 16384 → 2; 48,192
  bytes (all of RAM above the ROM) → 6 round trips, 0.135–0.186 s.
- **Banking.** The stub does `m_memory->translate(...)` **once at the start
  address** and then reads *contiguously* (`debuggdbstub.cpp`, `handle_m`). On a
  48K Spectrum 0x4000–0xFFFF is one space, so this is fine; on a banked machine a
  read that crosses a bank boundary silently reads the wrong bank, and there is no
  way to name a bank. Read from source; not measurable here (no 128K ROM).
  Writing has the same single-translate shape (`handle_M`).
- **Registers by name.** `qXfer:features:read:target.xml` must be fetched **first**
  or `g`/`G`/`p`/`P` answer `E01`. The live target.xml gives, in order:
  `af bc de hl af' bc' de' hl' ix iy sp pc`, all 16-bit. `g` returns them packed;
  `p<n>`/`P<n>=v` address them by index.
- **The rest of the CPU's state is reachable by name** through the debugger's
  symbol table, not the register map: `symlist maincpu` lists `i`, `r`, `iff1`,
  `iff2`, `im`, `halt`, `wz`, and read-only `cycles`, `totalcycles`,
  `lastinstructioncycles`. That is what makes a `.sna` header writable.
- **Python-parseable snapshot: yes, by writing it ourselves.** MAME cannot save a
  `.sna`, but 48K of RAM is 6 round trips and the header is 27 bytes we already
  have: `snapshot-ram-matches` at $4000, $9100 and $FF00 all matched the file
  byte for byte. Produced: `work/spike.sna`, 49179 bytes.
  **Wart:** the header's border byte is not obtainable — no ULA state is exposed to
  the debugger (`symlist ula` → "is not a CPU"), and the RSP register map has no
  ULA. It has to come from Lua (`machine.devices[":ula"]...`, untested) or be left
  at 0. MAME cannot read a `.sna` back either; restoring one means writing RAM with
  `M` packets plus `G` for the registers (works, but it is our own loader).

### Phase 2 — state management: pass

- **Save and load, on request, to a path we choose**: `monitor statesave <path>` /
  `monitor stateload <path>` — MAME debugger commands, so they arrive over the same
  RSP channel. The file is ~850 bytes (MAME compresses the state).
  RAM really is in it: wrote `deadbeef` at $7000, saved, overwrote, loaded →
  `deadbeef`.
- **Load paused**: after `stateload` the PC is the saved PC and `totalcycles` is
  frozen (`8203`/`8214`, `700003 -> 700003` over 0.3 s → PAUSED). A load on a
  stopped machine leaves it stopped, which is exactly the requirement.
- **Checkpoints survive a load**: `bplist` identical before and after, a *stopping*
  breakpoint still stops, and a **non-stopping counter's tally survives and counts
  on**: 7406 hits → load → 14812 after another 200 ms emulated. The tally lives in
  a debugger variable, and debugger state is not in the saved machine state — which
  is what the kit asks for.
- **Determinism**: three `stateload` + `c` cycles, each stopping at $8203;
  SHA-256 over the 48K RAM image plus all 12 registers was identical all three
  times (`ba7a2dfc4acfdfcc`).
- **Not done**: a stop-state load and a cross-process load (quit MAME, start again,
  load, compare). Both were in scope but not measured — see "could not test".

### Phase 3 — live measurement without stopping: pass

A non-stopping checkpoint with a growing hit count **is possible**, and it is
entirely inside the debugger: a breakpoint whose *action* increments and resumes.

```
monitor temp7 = 0                              # the variable must exist first
monitor bpset 8203,1,{temp7 = temp7 + 1 ; g}    # parameter 2 is the condition,
                                                # parameter 3 the action
... run ...
monitor printf "%d\n",temp7
```

Measured over one emulated second, with three such checkpoints armed at once:

| checkpoint | hits |
|---|---|
| the loop body (69 T-states per pass; ~50700 expected) | 37033–49081 |
| a routine that never runs | 0 |
| the ROM's IM1 vector at $0038, once a frame | 50 |

- **Cost**: 1 emulated second takes 0.09–0.10 s wall with no checkpoint and
  0.14–0.17 s with a hit-and-continue checkpoint on a 69 T-state loop — about
  **1.6–1.7×**, and that is on the harshest possible target (a checkpoint that hits
  50,000 times a second). A checkpoint on a real routine would be much cheaper.
- **Proof the machine is running**: the interrupt counter read 361 then 906 (and
  `totalcycles` 35.8 M → 73.9 M) 0.3 s apart. `?` meanwhile claimed a stop.
- **Cycle counter**: `totalcycles` is real and T-state accurate — 1 000 ms of
  `gtime` moved it by **3 500 003** (expected 3 500 000). **`cycles` is a trap**: it
  is `cycles_remaining()`, a countdown, not a counter (it read `110D0` = 69840 at
  the reset stop).
- **Frame cadence**: with interrupts enabled and a loop that does not HALT, ten
  consecutive stops at $0038 were exactly 69 888 T-states apart. With a differently
  phased loop the deltas wander by one instruction (measured 69 880 … 69 895), and
  `gvblank` to `gvblank` wanders the same way. The stop is always at an instruction
  boundary nearest the boundary asked for; "exact" means exact to one instruction.
- **Ctrl-C works as an asynchronous stop**: byte `0x03` on the socket stopped a
  genuinely running machine (`totalcycles` frozen afterwards, PC readable).
- **The RSP channel is live while the machine runs.** A `g` sent during a run was
  answered in 15 ms with `totalcycles` still climbing — the stub is serviced from
  the debugger's periodic hook, not only from the stopped loop.

### Phase 4 — frame stepping with inputs: pass, with the crux solved by a shim

- **An exact stop**: `Z0,<addr>,4` + `c` stops with `T05...0b:<pc>;` and the PC is
  exactly the address asked for (measured, `8207`).
- **Advance N frames**: three ways, all measured.
  - `monitor gvblank` once per frame — one round trip each, deltas 69 880…69 893.
  - **One call for N frames**: `monitor bpset 38,totalcycles >= #<t>` then `c`.
    On a frame-paced program: **349 441 T-states for five frames, nominal 349 440 —
    an error of 1 T-state**. On a non-HALTing program the same call landed 42
    T-states late, because the stop is quantised to an instruction boundary.
  - A frame-paced loop (HALT in the loop) stops with the pass counter advanced by
    exactly one per frame boundary.
- **A step that returns when it is done**: `s` returns a stop packet whose `0b:<pc>`
  is the next instruction; the register read after it is of the machine after the
  step. Round trip cost below.
- **The crux — input that persists across a stop, on one control channel: works.**
  Input in MAME is Lua-only (`ioport field:set_value`), stepping and saving are
  RSP-only. The bridge is a small generic Lua shim installed with
  `-autoboot_script`, holding a table in emulated RAM that the RSP client pokes
  with an `M` packet while the machine is stopped:

  ```lua
  -- shim.lua: table at BASE+4..BASE+11, one raw port byte per keyboard half-row
  local function apply_input()
      for i = 0, 7 do
          local raw = space:read_u8(BASE + 4 + i)          -- :maincpu program space
          local port = machine.ioport.ports[":LINE" .. i]  -- the Spectrum's matrix
          if port then
              local m = 1
              while m <= 0x10 do
                  local field = port:field(m)
                  if field then field:set_value((raw & m) ~= 0 and 0 or 1) end
                  m = m << 1
              end
          end
      end
  end
  emu.register_frame_done(function() ... apply_input() end)
  emu.add_machine_resume_notifier(function() ... apply_input() end)
  ```

  The ports are `:LINE0`…`:LINE7`, five fields each with masks 1, 2, 4, 8, 0x10 —
  an exact match for the keyboard matrix in
  `kit/skills/spectrum/zx-spectrum-reference`. Driving by *mask* rather than by
  field name matters: the field names are the multi-mode display strings
  (`"c    C    ?      LPRINT   PAPER  CONT"`).

  Measured with a synthetic Z80 program (`LD BC,$FEFE : IN A,(C)`), reading the
  machine's own stored value, not a register I might misread:

  | | |
  |---|---|
  | nothing held | row $FE reads $BF |
  | V held (LINE0 bit 4 low) | row $FE reads $AF |
  | A held (LINE1 bit 0 low) | row $FD reads $BE |
  | released again | back to $BF |
  | held across 5 frames at full speed, uninterrupted | still $AF |

- **The wart**: the poked value reaches the machine's port read after **two frame
  boundaries** (measured: after frame 1 still old, after frame 2 new), because
  the shim's `set_value` only sets the field's `m_digital_value` and
  `ioport_port::read()` returns `m_live->digital`, which MAME recomputes in its
  ioport frame update. Moving the shim's tick to `emu.add_machine_frame_notifier`
  made it *worse* (3 boundaries), so it stays on `register_frame_done` + resume.
  Consequence for the kit's test wording: input is **not** "in the port register
  before the call returns"; it is in the port within two frames, and a
  single-step loop that does not let a frame boundary pass sees the previous
  value (measured: 12 single steps, all stale).
- **Working recipe for the kit's phase-4 loop** (measured 20 iterations, all as
  expected, 18 ms per step, 7 round trips per step):
  1. `Z0,8207,4` + `c` — stop at the loop top.
  2. `M9304,8:<rows>` — poke the keyboard rows into the shim's table.
  3. `monitor bpclear; monitor bpset 38,totalcycles >= #<t+2*69888>` + `c` —
     exactly the latency in frames, in one call, with a stop packet.
  4. `monitor bpclear`, then `m9102,1` — read the game's own variable.
  That is 7 round trips, ≤20 ms, and is one channel: every step is an RSP packet.
- **Read between frames, cheap**: round trips cost 0.55–1.45 ms; 100 back-to-back
  `g` calls while stopped answered in 0.085–0.15 s, none failed. 100 `g` calls
  fired with no pacing while a stopping checkpoint was armed *and the machine was
  running* also all succeeded, and afterwards `c` stopped with the PC exactly at the
  checkpoint.
- **A call during a stop answers**: yes, every one.
- **What I tried and it did not work**: installing a Lua **read tap** on the I/O
  space to supply the port value directly (which would remove the frame latency
  entirely). The tap installed and computed the right value, but the ULA read still
  returned the old one; adding a memory write inside the tap killed the session
  (connection reset). Untried: `machine.natkeyboard:post()`, which is MAME's own
  scripted-key path but brings MAME's human-hand timing with it.

## Traps that cost time, and belong in any tool skill

1. **MAME debugger numbers are hex.** `gtime 1000` runs 4096 ms; `#1000` is one
   second. Every decimal in a monitor command needs `#`.
2. **`cycles` is not the cycle counter.** It is cycles *remaining* in the current
   timeslice. `totalcycles` is the counter (read-only).
3. **`A` is the high byte of `af`.** Reading `af & 0xff` gives you the flags and a
   plausible-looking wrong answer (this spike's first phase-4 "failure" was that
   bug, not MAME's).
4. **`c`/`s` send a stop packet; `gtime`, `gvblank`, `go`, `step` and `over` sent
   via `qRcmd` do not.** `m_send_stop_packet` is set only by `handle_c`/`handle_s`.
   A monitor-resumed run must be polled (e.g. `totalcycles` going quiet) or ended
   with a breakpoint.
5. **Two breakpoints at the same address do not both run.** `breakpoint_check`
   takes the first that hits and stops looking — a non-stopping counter sharing an
   address with a stopping checkpoint silently never counts.
6. **A breakpoint action that uses a variable needs the variable to exist**:
   `bpset X,1,{temp7 = temp7 + 1 ; g}` with `temp7` unset fails the expression, the
   action aborts, and the machine sits stopped at the breakpoint looking like a
   dead instrument. `monitor temp7 = 0` first.
7. **The gdbstub accepts one connection per process** (above).
8. **`-console` is not in this build**; `-autoboot_script` is the only script entry.
9. **`-video none` is not headless on macOS**; use the SDL dummy drivers.

## What I could not test, and why

- **Anything on 128K** (paging through `$7FFD`, the AY, contended banks, banked
  reads). Only a 48K ROM was at hand, and no 128K game image. The single-translate
  read path is read from `debuggdbstub.cpp`, not measured.
- **A real game.** No game image was used; all four phases ran on a synthetic Z80
  program of my own, as `kit/EMULATOR.md` recommends. A game's own input routine
  reading several half-rows per pass is untested (the shim writes all eight rows
  every tick, so it should hold; untested is untested).
- **Cross-process state**: quit MAME, start again, `stateload`, compare. Phase 2's
  determinism test was three loads inside one process.
- **MAME's `-state`/`-playback` options, `emu.pause()`/`emu.unpause()`/`emu.step()`
  from Lua, `machine:save`/`machine:load` from Lua.** I used the debugger's
  `statesave`/`stateload` instead, which needs no second channel; the Lua
  equivalents are documented but were not exercised.
- **Lua breakpoints.** MAME's Lua `debugger` module is a *symbol* manager; the
  luascript docs list no breakpoint API, and I did not hunt for one. The counting
  checkpoint is a debugger feature, not a Lua one.
- **Other CPUs' register maps.** `gdbstub` ships maps for 29 CPU entries — i486,
  arm7_le, r4600 (MIPS), ppc601, m68030/m68020pmmu/m68000, z80/z80n/z84c015,
  m6502/m6507/m6510/m65ce02/rp2a03/rp2a03g/w65c02/w65c02s, m6809, score7, nios2 and
  ten psxcpu variants. Only `z80` was exercised. The stub binds to the **first CPU
  in the device tree** and cannot switch CPUs.
- **Screenshots** (`monitor snap` exists) and any rendering path — `-video none`
  was used throughout.
- **The Lua console**, for the reason above.
- **ZEsarUX at the same depth.** ZEsarUX was not started or driven in this spike;
  the comparison below uses this repository's own plan and notes plus what is
  installed on disk.
- **The tap workaround's fallback** (`natkeyboard:post`), the `emu.step()` UI
  single-step, and `history`/`trace` were not tried.
- **Why the input latency is exactly 2 boundaries.** I inferred the mechanism from
  `ioport.cpp` (`set_value` sets `m_digital_value`; `read()` returns
  `m_live->digital`, rebuilt by the ioport frame update) and the ordering is only
  observed, not proven. This is the number I trust least.

## Verdict on the four axes

**(a) One control channel versus several — MAME wins, with a caveat.**

Everything the kit's phases need is an RSP packet: read, write, registers,
stepping, stopping, running, N-frame advance, state save/load, breakpoints, hit
counts, a cycle counter, console output. The only capability that is Lua-only is
**input**, and the shim above closes it: the RSP client pokes a table in emulated
RAM, the shim applies it. The caveat is that the shim is code the kit owns, must be
started with `-autoboot_script`, needs a free RAM address inside the game, and
input lands at the next frame boundary rather than in the port before the call
returns — so "one channel" is true of *control*, not of *input*.

Against ZEsarUX as the plan describes it (ZRCP, one TCP channel, `set-ui-io-ports`
and `send-keys-event` commands): ZRCP carries input natively in the same line
protocol, which is a cleaner story than RSP + a Lua shim, and its `run <limit>`
blocks with a reply. MAME's channel is busier to drive (five packet kinds, no
state report, no stop packet from a monitor-resumed run, one connection per
process) but it reaches *more* state per packet, and the non-stopping counting
checkpoint — the phase-3 workhorse — has no ZRCP equivalent in the plan, which
lists `cpu-code-coverage` plus an in-game counter as ZEsarUX's workaround. That is
a real MAME advantage in the phase the verification step leans on hardest.

**(b) The snapshot story — ZEsarUX wins, narrowly, on the kit's terms.**

ZEsarUX writes a real `.sna` (the kit's canonical format, with the 27-byte header
including the border) and reads one back. MAME has no `.sna` at all: the kit writes
its own from 6 RSP reads, and cannot fill the header's border byte, and cannot load
a `.sna` back. MAME's own state file is smaller (850 bytes) and *better* for phase
2 — it is a whole-machine state, verified to restore RAM, land paused and leave the
breakpoints' tallies alone — but it is MAME-internal, and it is a second format for
the kit to care about. So: phase 1 wants ZEsarUX's `.sna`, phase 2 wants MAME's
state file, and MAME can produce both (`statesave` for state, 6 reads + 20 lines of
Python for the `.sna`) while ZEsarUX produces only one.

**(c) Per-platform leverage — MAME wins decisively.**

The gdbstub already carries register maps for 29 CPU entries across the Z80, 6502,
6809, 68000, ARM7, x86, MIPS, PPC and PSX CPU families, and the rest of the
interface (RSP, the debugger command language, save states, non-stopping
checkpoints, `gtime`/`gvblank`, breakpoints with actions and conditions) is
CPU-independent. One client plus a machine reference and a snapshot reader per
platform would carry a large number of the kit's next platforms. ZEsarUX is a ZX
Spectrum family emulator: a new platform needs a new emulator, a new protocol, a
new client.

**(d) Install and ROM friction — ZEsarUX wins on convenience, MAME loses less than
it looks.**

- MAME: no macOS binary from the project (Homebrew only, 495 MB installed, outside
  the repository — the kit's "everything under `tools/`" rule needs an exception or
  a build-from-source story), no ROMs, GPL-2.0, and MAME's licence is the same
  class of thing the kit already documents for VICE. The ROM has to be supplied by
  the contributor either way; on MAME it lands in a `-rompath` set (`spectrum.zip`
  containing `spectrum.rom`, CRC `ddee531f`).
- ZEsarUX: bundles the machine's ROMs in its own release (`48.rom`, `128.rom`, ~50
  more `.rom` files inside a 100 MB `.app`), one `.dmg` download, no Homebrew, no
  ROM hunt. Its Homebrew cask is disabled for Gatekeeper, which the repo's plan
  already notes.
- Neither is comfortable: ZEsarUX ships the ROMs, which is convenient and is
  exactly the thing the kit refuses to commit; MAME makes the contributor find a
  ROM, which is friction in the first hour of a run.

## Recommendation (the lead decides)

MAME is the better *engine*: one channel, better phase 2, better phase 3, and a
lever that reaches many future platforms. ZEsarUX is the better *install* and the
better *snapshot format*. If the platform is scored on the phases alone, MAME wins
three of four and ties on the fourth after a workaround; the price is a Lua shim
the kit must own, a hand-rolled `.sna` writer, an input path that is a frame late,
and a launcher that must know about SDL dummy drivers on macOS.

Artifacts in this spike: `rsp.py` (RSP client), `harness.py` (start/kill MAME,
SDL-dummy env), `shim.lua` (the input shim), `spike.py` (the four phases with named
checks), `probe_transport.py`, `probe_running.py`, `probe_counter.py`,
`probe_state.py` (raw findings), `shim_diag.lua`, `shim_tap.lua` (both negative
experiments), `logs/` (every run's output), `work/` (states and the `.sna`).
