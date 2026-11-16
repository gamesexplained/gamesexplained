# Ghostbusters II: documented features

Sources read 12 November 2026: [Ghostbusters II manual](https://www.gamesdatabase.org/Media/SYSTEM/Sinclair_ZX_Spectrum/Manual/formated/Ghostbusters_II_-_1989_-_Activision.htm) and [C64-Wiki](https://www.c64-wiki.com/wiki/Ghostbusters_II). The rows below distinguish observed controls from traced rules.

External reference pictures saved 12 November 2026: [story](https://www.c64-wiki.com/images/1/12/Ghostbusters2_1.png), [airshaft](https://www.c64-wiki.com/images/f/fc/Ghostbusters2_2.png), [Broadway](https://www.c64-wiki.com/images/3/31/Ghostbusters2_4.png) and [museum](https://www.c64-wiki.com/images/9/93/Ghostbusters2_3.png), all from C64-Wiki. The `reference/` folder also holds VICE captures of the title, first story and airshaft.

| Feature | Status | Evidence |
|---|---|---|
| Three episodes: the airshaft, Broadway and the museum | confirmed | Each reached in VICE; the latter two use forced success paths, as described in `orientation.md` |
| Airshaft: descend and swing on a cable to collect a slime sample | live | First playable scene reached in VICE; up/down motion and the row switches were tested. A 1,124-read control recording reaches the bottom with all three parts and triggers success in both machine models |
| Ghost contact reduces courage; elixir restores it | confirmed | Manual; traced contact paths at airshaft `$9AB6`, `$9BEF`, and `$9C53` and the numeric HUD updates, the contact counter depletes the gauge through `$8692`, and elixir pickup `$9948` restores it; VICE verified depletion to death |
| Collect three scoop parts from the shaft walls | confirmed | Manual; three collection paths at `$9914`, `$999E`, and `$9A1F` copy successive seven-row pieces of one HUD sprite. All three were collected in a control-only route, followed by success; the 1,124-read route replayed in VICE |
| Space cycles an airshaft selection through three positions | confirmed | `$AA6E` and a controlled Space press in `parts/airshaft/facts.md`; the positions select the three weapons listed below |
| The three airshaft selections are proton beam, PKR bomb and shield | confirmed | Manual; Space cycles three modes and changes HUD values and effect paths. Modes 1, 2 and 3 select the beam, bomb and shield, respectively; icons, ammunition and activation paths were checked |
| Hold fire and aim a bomb up or down; release to detonate | confirmed | Manual; traced fire paths `$A8A5` and `$A82F` and tested mode-dependent stock decrements. VICE showed mode 2 moving the launched bomb while held and setting `$A767` only on release |
| Sawing monsters can sever the cable | confirmed | Manual; traced sprite 6/7 state machines and contact responses around `$C622` and `$C80A`. Aligned sawing at `$CADC` advances the close-up through `$B4-$BA`; `$CB38` triggers death at the final frame |
| Broadway: steer the fireball | confirmed | `$8C59`, `$91DD–$9220` and VICE trials in `parts/broadway/facts.md` |
| Broadway: shoot ghosts to protect the Statue of Liberty | confirmed | Manual; six projectile-cell paths and the 29 scene lists are traced. Hits switch a ghost to its death script; VICE followed that script through ground-slime creation. Reaching scroll column 480 triggers success |
| Broadway displays the Statue of Liberty against a city backdrop | live | VICE capture using the forced route described in `orientation.md` |
| Statue hits and replacement fireballs consume slime | confirmed | Manual; firing, stock display, and overlap responses were traced, VICE confirmed one unit charged per replacement fireball and one unit per three statue contacts |
| Street pedestrians collect slime drops | confirmed | Manual; Space-controlled walking figures and overlap paths `$9976` and `$9AEA` were tested. VICE confirmed that an overlapping pedestrian removes the droplet, backs up the gauge cursor by three bytes, and requests the refill drawing |
| Broadway: Space reverses three walking figures | confirmed | `$9FB6–$A22F`, the captured sprite shapes and short VICE trial in `parts/broadway/facts.md` |
| Museum: control Ghostbusters, select a team member and arrange weapons | traced | Manual and C64-Wiki; selection at `$B372`, directional floor probes, and equipment exchanges `$CDF1/$CE5D/$CEC9` are described. Space and the equipment panel were observed in VICE |
| Museum: a Ghostbuster descends on a rope before the floor scene | live | VICE capture using the forced route and alternate disk described in `orientation.md` |
| Museum: up closes the hands on the rope and down opens them | confirmed | Original manual, page 7; `$C74C–$C77B` reduces speed for up and increases it for down. VICE confirms landing below speed 6 survives and speed 6 triggers the fatal animation |
| Museum: joystick up and down control the descent value | confirmed | `$C74C–$C7BD`; VICE trials and measurements in `parts/museum/facts.md` |
| Museum: Space selects a Ghostbuster | confirmed | `$B372` and controlled VICE comparison in `parts/museum/facts.md` |
| Museum: Return opens the equipment screen | confirmed | `$CAA8`, `$CCDC` and a VICE panel trial in `parts/museum/facts.md` |
| Joystick controls the action; P pauses in the first two episodes | confirmed | Airshaft `$AA7A` and Broadway `$8260`, with short VICE trials in their respective `facts.md` | 
