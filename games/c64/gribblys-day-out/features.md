# Gribbly's Day Out — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay, Hewson Consultants 1985: scans `Extras/Inlay.jpg` and
  `Extras/Inlay_back.jpg` in https://archive.org/details/uta_Gribblys_Day_Out_1985_Hewson_Consultants_206, read 9 October 2026. The manual; it outranks the rest.
- C64-Wiki, https://www.c64-wiki.com/wiki/Gribbly%27s_Day_Out, read 9 October 2026.
- Wikipedia, https://en.wikipedia.org/wiki/Gribbly%27s_Day_Out, read 9 October 2026.
- MobyGames' description, as quoted in the Internet Archive item
  `Gribblys_Day_Out_1985_Hewson`, read 9 October 2026.
- The game's own attract screens (Scenario and Controls).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2; left or right passes the intro screens, fire starts the game (inlay) | open | |
| On the ground: left/right bounces, up levitates, fire picks up or drops a Gribblet or blows bubbles (inlay) | open | |
| In the air: any direction levitates that way; fire blows bubbles or switches the web controls (inlay) | open | |
| Gribbly materialises beneath the cave; Gribblets are put on a ledge in the cave with fire (inlay) | open | |
| "The music will play if you have found a safe ledge" (inlay) | open | |
| Psi energy, shown as the Psi bar; a pulsating psi-grub boosts it (inlay, status panel) | open | |
| Bank bar in the status panel | open | |
| At most eight Gribblets per screen; some can be carried off irretrievably (inlay) | open | |
| Saving the last but one Gribblet powers the psi web down, and Seon comes for the last one (inlay, Wikipedia) | open | |
| "New screens are selected partly in relation to your previous performance" (inlay); levels other than the first and last come in a random order (MobyGames) | open | |
| 16 levels (C64-Wiki, MobyGames) | open | |
| The web is arranged in triangles; most hold three cross-shaped controls that switch a section on or off when Gribbly hovers over one and presses fire (inlay) | open | |
| Bubbling near a control while levitating can put a web up in front of Gribbly (inlay) | open | |
| Life cycle: seed pods fall and become Topsies; Topsies flip Gribblets onto their backs; chrysalises hatch into Stompers; a Stomper that reaches a flipped Gribblet absorbs it and becomes a Flyer; a Flyer killed drops its Gribblet (Wikipedia, C64-Wiki) | open | |
| Bubbles kill seed pods, Topsies, chrysalises and Flyers, not Stompers; Stompers drown in water (Wikipedia) | open | |
| A Gribblet falling from a Flyer must land on flat ground or be caught (Wikipedia, C64-Wiki) | open | |
| Scoring: seed pod 20, Topsy 40, chrysalis 60, Stomper nothing, winged creature 100, pick up a Gribblet 20, drop one −20, place one in the cave 100, catch a falling one 100, switch web off −10, on +10, collision in flight −5 each, collision with Seon −10 each, bubbling Seon nothing, excess energy bonus points (inlay) | open | |
| Best score table: letters chosen with up/down and fire, END finishes (inlay) | open | |
| Real-time clock: f1 set, f2 start; after f1, f3/f4 hours, f5/f6 minutes, f7/f8 50 Hz or 60 Hz mains (inlay); the Controls screen says "f1: set and start" | open | |
| Game clock, shown as Gametime in tenths of a second (status panel) | open | |
| f5/f6 music volume, f7/f8 colour or black-and-white video; some adjustments only while the theme tune plays (inlay) | open | |
| Pause on RUN/STOP; while paused f7 freezes the animation, f8 returns to pause, CLEAR/HOME abandons the game, f1 resets the clock, RUN/STOP or fire restarts (inlay) | open | |
| Smooth multi-directional, multi-speed scrolling (inlay) | open | |
| Interrupts synchronised to mix hi-res and character screens (inlay) | open | |
| Action-linked three-voice sound effects (inlay) | open | |
| Full facial animation (inlay) | open | |
| Hardware and software sprites, integrated (inlay) | open | |
| A best score of 6809 on the Controls screen, credited "© ST Software 1985" (attract screen) | open | |
| Level 1's name, "Psi~energy Transfer Stage", with "Hide the Gribblets in the Cave" and "Eight Gribblets to rescue" before play | open | |
| A one-word message field in the status panel ("Scenario", "Controls", "Game On!", "Bounce") | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions

- Pressing CLEAR/HOME (matrix row 6, column 3) for two seconds while
  paused did not abandon the game in the emulator on 9 October 2026; the
  code will say which key it reads.
