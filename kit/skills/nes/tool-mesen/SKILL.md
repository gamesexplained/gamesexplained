---
name: tool-mesen
description: How to drive MesenCE 2.2.1, the NES's second emulator, through the kit's own server, which speaks the jsnes server's protocol. When to use it rather than jsnes, starting it, what it counts differently, its snapshots, and the traps measured on the release. What to do when a check fails is in workarounds.md, beside this file.
---

# MesenCE in the kit's server

MesenCE is Mesen 2 as the NESdev community keeps it (GPL-3.0,
`github.com/nesdev-org/MesenCE`; Mesen's author, Sour, archived
`github.com/SourMesen/Mesen2` around version 2.1.1 and points there). It is
the NES's second emulator: jsnes (`tool-jsnes`) is the one a run uses, and
MesenCE is for a question jsnes may answer wrongly, because it follows the
console closely where jsnes is known not to (`tool-jsnes`, "Traps"): the
picture's timing, a sprite's unwired bits, what the bus does during a DMA
or an interrupt.

```
python3 kit/scripts/tools.py get-mesen                # once: its release for this computer, into tools/mesen
python3 kit/scripts/tools.py mesen                    # the server, with no cartridge, on 127.0.0.1:6857
python3 kit/scripts/tools.py --platform nes status    # both emulators: build, cartridge, running or stopped
python3 kit/scripts/tools.py --platform nes stop mesen
```

`kit/nes/mesen_server.py` speaks the jsnes server's protocol, so the client
and every command are `tool-jsnes`'s: connect with `connect(port=6857)`
(or `KIT_MESEN_PORT`) and drive it the same way. `hello` names it
(`"mesen": "2.2.1"` where jsnes's says `"jsnes"`). Everything below is
where it differs.

## How it runs

Mesen runs as a process of its own, in its headless test runner
(`--testRunner`), with `kit/nes/mesen_bridge.lua` inside it and the server
outside. The bridge holds the machine inside Mesen's exec callback, which
Mesen calls before it fetches each instruction, so a stop is always between
two instructions, and an interrupt handler's first instruction is stopped on
with the three bytes pushed (Mesen takes an interrupt at the end of the
instruction before). Mesen allows a save state to be made or loaded only
inside that callback, which is why the whole machine is served from there.
During a run the bridge looks at its socket every 2,048 instructions, so a
second connection can read, save or `stop` while it runs, as on jsnes.

The bridge calls into Lua before every instruction, so the machine runs at
about twice real time (600 frames in 4.8 to 5.0 s on Apple silicon), against
jsnes's 17 to 18. Plan long waits in frames and cycles, as `tool-jsnes`
says.

## Where it differs from the jsnes server

- **A cartridge starts Mesen again.** Its test runner loads one cartridge
  when it starts and cannot change it, so `cartridge`, and a `load` of a
  snapshot whose cartridge is not in, start a new Mesen with it: about 0.15
  s. The checkpoints are carried over; a code map, a sound capture and the
  machines `keep` held are not. A cartridge sent as bytes is written to
  `tools/mesen-home/carts` under its SHA-1, which lets a later `load` find
  it without the bytes being sent again.
- **A frame ends one scanline earlier.** The frame count goes up at Mesen's
  end of a frame, the start of the post-render line (scanline 240), where
  jsnes's goes up at the start of the vertical blank (241), about 114 CPU
  cycles later. A frame advance stops that much earlier in the frame; the
  number of frames is the same.
- **A read checkpoint sees the bus.** Mesen reports to it every read the
  CPU makes on the bus but its own instruction fetches: the dummy reads (two
  of the next instruction's address when an interrupt is taken, an indexed
  read crossing a page) and the sprite DMA's 256 reads of the page written
  to `$4014`. In ten frames of the kit's test program, a read checkpoint on
  four bytes of its wait loop counted 40 on Mesen, the interrupts' dummy
  reads, and 0 on jsnes; one on `$0200-$02FF` counted 2,560 on Mesen and 0
  on jsnes (26 October 2026).
- **`fetch` does nothing.** Mesen reports an instruction's fetches only to
  the exec callback, so a read checkpoint never sees them, `fetch: true` or
  not; on jsnes the same checkpoint with `fetch: true` counted 96,754. To
  count an instruction carried out, use an `exec` checkpoint.
- **A write checkpoint sees the DMA's writes to `$2004`,** as one write of
  the instruction that started the DMA, since the writes of one instruction
  are counted once an address (`tool-jsnes`, "Checkpoints"): 10 in ten
  frames, where jsnes counted 0.
- **A sprite's attribute byte reads with bits 2 to 4 clear**, in `read`
  with `"space": "oam"` and in snapshots, as the console's PPU has no
  storage for them (`nes-reference`, "Sprites"); jsnes keeps what was sent.
- **The screen is in Mesen's palette**, 256 by 240, with nothing cut from
  the edges. It is not jsnes's palette, so compare two screenshots by the
  PPU's memory (`read` with `"space": "ppu"`), never by their colours.
- **The reset button** (`reset` with `"hard": false`) is the 6502's reset
  sequence only, as on jsnes: the stack pointer three lower, I set, the PC
  from `$FFFC`. `reset` with `"hard": true` (the default) goes back to the
  save state the bridge made at the cartridge's first instruction, which is
  power on with RAM all zero.

## Snapshots

`save` writes the kit's NES snapshot (`kit/nes/snapshot.py`), with the CPU's
64 KB, the PPU's 16 KB, the sprite table and the registers in it, as the
readers take them, and Mesen's own save state beside them: a snapshot of the
test cartridge was 4 KB. `snapshot.py`, `listing.py` and the rest read it as
they read jsnes's. A `load` takes only a snapshot this server saved: a jsnes
snapshot has no Mesen state in it, and the jsnes server cannot load
Mesen's. To move a game from one emulator to the other, put the cartridge
in and drive it to the same place.

## Traps

- **`emu.setInput` takes the port third.** In MesenCE 2.2.1, `setInput(t,
  port)` sets controller 1 whatever the port, and `setInput(t, 0, 1)` sets
  controller 2 (measured 26 October 2026; `getInput(port)` takes it
  second). The bridge passes it third; a Lua script of your own must too.
- **A Lua callback has a one-second limit** in Mesen's default settings
  (`ScriptTimeout`); past it, Mesen ends the callback with an error and runs
  the instruction, so a stopped machine runs on by itself. `get-mesen`
  writes a limit of 4,000,000 seconds into Mesen's settings; Mesen
  multiplies it by 1,000 in 32 bits, so a larger one wraps round.
- **An error in the bridge lets the machine run.** It is written to
  `tools/logs/mesen-bridge-<port>.log`, with its Lua traceback. When a run
  ends somewhere no checkpoint explains, read that first.
- **Mesen needs its settings beside the program.** Without `settings.json`
  there it opens its first-run window instead of running the script, and
  without "AllowIoOsAccess" and "AllowNetworkAccess" its Lua has no files
  and no socket. `get-mesen` writes it; a hand install must too
  (`MESEN_SETTINGS` in `kit/nes/tools.py`).
- **The app's version says 1.0.** The macOS bundle's version string is
  1.0 in every release, so the installed release is in
  `tools/mesen/VERSION`, which `get-mesen` writes.
