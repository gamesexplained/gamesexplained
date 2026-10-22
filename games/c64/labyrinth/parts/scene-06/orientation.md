# Stone Corridor orientation

The analysed image is work/stone-corridor-play.vsf, SHA-256 66aa881ca41ee56f2489eaad4cfa80f56ec45aabce570b1c1fef36443783ee27. It is the actual scene6/entry7 arrival reached through the ninth MANICURE WALL from scene5. The route retains the earlier controlled guard setup and one explicitly supplied shears unit; ordinary acquisition remains open. Continue work/wall-manicure-eighth-inspect/after600.vsf with ordinary MANICURE WALL, release Return at$90E2, then allow the descent to request6/7. Continue its actual loader with the recorded fire/Space prompt helper to$59DC; after120 frames without input, X480/depth6 and the Stone Corridor are visible.

work/stone-corridor-loader-return.vsf captures the later loader return, not the first initialization instruction. Two replays armed the known hook stubs, including$8C80–$8C95, after loader$5098; the first recorded stop was$59DC. The first instruction of initialization remains open. Earlier forced entry/play/capture files are preserved separately in work/forced-original and are not compared as this route's entry. Build with the explicit matching comparison image:

```
python3 kit/scripts/symbols_export.py games/c64/labyrinth/parts/scene-06
python3 kit/scripts/listing.py games/c64/labyrinth/parts/scene-06 games/c64/labyrinth/parts/scene-06/work/stone-corridor-play.vsf --entry games/c64/labyrinth/parts/scene-06/work/stone-corridor-loader-return.vsf
```

The root orientation records boot, disk images, VICE v3.13.2 and the passed capability checks. Do not run the reset check over this state. At the loader return the live CPU-bank port read was$0000=7,$0001=$15; a RAM-bank read of those addresses returned$FF/$FF. The snapshot's RAM bytes are not substituted for that live port observation. The play RAM vector$FFFE/$FFFF is$127C; the raster chain's consumers remain unanalysed here. The disassembler was started through tools.py on the actual play snapshot and answered on its own port3014. Every client call names this part.

Resource matches and loaded-data limits are in facts.md. The independent resident scope overlaps earlier parts, and the later return comparison cannot reveal initialization-only bytes already overwritten before$59DC.
