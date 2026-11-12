# Ghostbusters II: documented features

Sources read 12 November 2026: [Ghostbusters II manual](https://www.gamesdatabase.org/Media/SYSTEM/Sinclair_ZX_Spectrum/Manual/formated/Ghostbusters_II_-_1989_-_Activision.htm) and [C64-Wiki](https://www.c64-wiki.com/wiki/Ghostbusters_II). These describe the game; open items still need to be checked against this disk.

External reference pictures saved 12 November 2026: [story](https://www.c64-wiki.com/images/1/12/Ghostbusters2_1.png), [airshaft](https://www.c64-wiki.com/images/f/fc/Ghostbusters2_2.png), [Broadway](https://www.c64-wiki.com/images/3/31/Ghostbusters2_4.png) and [museum](https://www.c64-wiki.com/images/9/93/Ghostbusters2_3.png), all from C64-Wiki. The `reference/` folder also holds VICE captures of the title, first story and airshaft.

| Feature | Status | Evidence |
|---|---|---|
| Three episodes: the airshaft, Broadway and the museum | confirmed | Each reached in VICE; the latter two use forced success paths, as described in `orientation.md` |
| Airshaft: descend and swing on a cable to collect a slime sample | live | First playable scene reached in VICE; movement and goal remain to be checked |
| Ghost contact reduces courage; elixir restores it | open | Manual |
| Collect three scoop parts from the shaft walls | open | Manual |
| Space cycles an airshaft selection through three positions | confirmed | `$AA6E` and a controlled Space press in `parts/airshaft/facts.md`; the meaning of each position remains open |
| The three airshaft selections are proton beam, PKR bomb and shield | open | Manual |
| Hold fire and aim a bomb up or down; release to detonate | open | Manual |
| Sawing monsters can sever the cable | open | Manual |
| Broadway: steer the fireball | confirmed | `$8C59`, `$91DD–$9220` and VICE trials in `parts/broadway/facts.md` |
| Broadway: shoot ghosts to protect the Statue of Liberty | open | Manual |
| Broadway displays the Statue of Liberty against a city backdrop | live | VICE capture using the forced route described in `orientation.md` |
| Statue hits and replacement fireballs consume slime | open | Manual |
| Street pedestrians collect slime drops; Space moves them | open | Manual |
| Museum: control Ghostbusters, select a team member and arrange weapons | open | Manual and C64-Wiki |
| Museum: a Ghostbuster descends on a rope before the floor scene | live | VICE capture using the forced route and alternate disk described in `orientation.md` |
| Museum: up opens the hands on the rope and down closes them | open | C64-Wiki; a controlled descent needs checking on this disk |
| Museum: joystick up and down control the descent value | confirmed | `$C74C–$C7BD`; VICE trials and measurements in `parts/museum/facts.md` |
| Museum: Space selects a Ghostbuster | confirmed | `$B372` and controlled VICE comparison in `parts/museum/facts.md` |
| Museum: Return opens the equipment screen | confirmed | `$CAA8`, `$CCDC` and a VICE panel trial in `parts/museum/facts.md` |
| Joystick controls the action; P pauses in the first two episodes | open | Manual |
