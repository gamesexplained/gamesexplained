# Skate or Die! - orientation

The images are the contributor's copies. They are kept in `work/` and are
never committed.

## The image

Side 1 is `work/side1.g64` (SHA-256
`45e07b324597540886ea0f409f32e27ec320ba18f2e0f9ca338f1f51d5d0ab84`);
side 2 is `work/side2.g64` (SHA-256
`7a402586d501b7904fa1c1106ad1432700b467fade4bfbe2c2ca9e5dae51f53e`).
Both are PAL G64 images. Side 1's directory contains one two-block PRG named
`EA`. Its label reads `skate or die!` and `ea 2a`. The boot showed the EA logo
and title, with no crack intro or trainer menu observed. Side 2 was used to
load the Downhill Race and Jam overlays. With side 2 mounted on the High Jump
route, the loader displayed `INSERT SIDE 1 AND PRESS BUTTON`; attaching side 1
and pressing fire resumed High Jump (`reference/side1-prompt.png`).

## From power-on to play

1. Hard-reset a PAL C64. Attach side 1 as drive 8 and autostart its `EA` PRG
   (`LOAD"EA",8,1` from a READY prompt is the manual's equivalent).
2. Wait past the blue EA logo for the Skate or Die! title. Hold fire on
   joystick port 1 until Rodney's Skate Shop appears, then release it.
   Port 2 fire did not advance this title in the tested run.
3. Move the shop pointer over `GO PRACTICE` (down, then left from its initial
   position) and press fire. The town square appears. From the initial
   skater position, push forward to skate down the screen; left and right
   rotate the skater rather than moving sideways. From `work/town-square.vsf`,
   80 frames forward, 30 frames turning left, then about 110 frames forward
   reaches High Jump. Turning right instead reaches Pool Joust. A 15-frame
   turn from the initial position followed by about 275 frames forward
   reaches Downhill Race (right turn) or Jam (left turn). These counts were
   measured with VICE frame advance, not joystick holds timed by the host.
4. Wait for the ramp with `PRACTICE`, `PASS: 0` and `HEIGHT: 0' 0"` at
   the top. Save `work/highjump-play.vsf` at this state. The earlier shop
   and town checkpoints are `work/skate-shop.vsf` and
   `work/town-square.vsf`.

## Steady state

VICE 3.13.1 (`v3.13.1-linux-x86_64-gui.zip`) passed 56 of the 57 emulator
checks on 4 October 2026; the failed one is `pause-at-instruction`, and
stops are made with `pause()` as `kit/skills/c64/tool-vice-mcp/workarounds.md`
says. A non-stopping execution checkpoint at `$0AF0` gains hits while the
event runs.

High Jump's listing comes from `work/highjump-play.vsf` (copied to `parts/highjump/work/play.vsf`), High Jump in practice
mode with the skater waiting on the left platform: `PRACTICE`, `PASS: 0`
and `HEIGHT: 0' 0"` at the top. The CPU port is `$25` (RAM at `$A000` and
`$E000`, I/O in); a RAM read of `$0001` shows `$E4`, which is the RAM under
the port. The hardware vectors at `$FFFA`-`$FFFF` read NMI `$0A3A` (stale,
from an earlier load), reset `$0954`, IRQ `$0AF0`.

The hand-over snapshot `work/entry.vsf` is the same load stopped at
`$095C`, after the four files are in memory and before the event has run.
A byte that differs between the two is written at run time.

## Reaching every part

The game is nine parts, each with its own snapshots in `parts/<id>/work/`
(`play.vsf` for the listing, `entry.vsf` at the part's hand-over):

| Part | `play.vsf` holds |
|---|---|
| `boot` | the first instruction of the title (`$4000`), after the boot has run |
| `title` | the title waiting for fire, music playing (`$4022`) |
| `resident` | the High Jump snapshot; `$F230`-`$FFF7` is the same in every part from the shop on |
| `shop` | the shop and town program running |
| `ramp`, `highjump`, `downhill`, `jam` | the event in practice, the skater waiting at the start |
| `joust` | the opponent-choice screen in practice |

Driving the town by stick to each event is slow and fragile. Faster, from
any snapshot with the event manager in memory (High Jump's will do): pause,
attach the side the event needs (side 2 for the race and the Jam), set
X to the event's row of the load table (1 ramp, 2 High Jump, 3 race, 4 Jam,
5 joust), set PC to `$F99C`, the manager's own entry for going to an event,
and run with warp on. The manager checks the disk side; at INSERT SIDE n,
press fire on joystick 2. A checkpoint at the event's entry, `$0880`
(`$0820` for the joust), stops it with the files loaded. Entering at
`$F9E4`, past the side check, crashed.

## The loader, in a paragraph

The two-block `EA` program starts EA's own fast loader. The C64 side
lives in high RAM (`$F230`) and talks to a command server in the drive's
RAM over the serial lines, three-byte commands of command, track and
sector. There is no directory: files are numbered, and a table of 49 start
tracks, sectors and lengths finds them. Every load first tells the drive
to expect the disk ID "EA" and reads three bytes from track 18 sector 18
that say which side is in the drive; the wrong side brings up INSERT SIDE
n AND PRESS BUTTON. Choosing a town path shows SKATING TO HIGH JUMP while
the event manager loads a stub to `$0800` that loads the event's code to
`$0880` and jumps there; the event loads its own font, picture, poses and
shapes. Details and addresses are in `facts.md`, "Loads".
