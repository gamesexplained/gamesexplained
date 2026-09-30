# Castle Master — facts

## Scope and evidence

The complete physical RAM capture at the language menu. The game reuses menu storage during play; the listing records the menu occupant.

Technical statements below are traced from the contributor’s accurate disassembly and retained evidence ledger. The validation paragraph identifies checks repeated for publication. A traced claim is not labelled as a new live test.

## World database

The database occupies $9D00–$BF8F. Its 34 area offsets are at $9D4F–$9D92. Object, global, and area condition streams are interpreted by the dispatcher at $4A58, in that order.

## View transform

The 72 signed sine/cosine pairs at $123C–$12CB sample angles five degrees apart at scale 64. Matrix multiplication at $36A9 rescales by 64. The point transform at $3730 consumes caller-prepared coordinates.

## Clipping and projection

The clip tests at $3B68 use x+z, y+z, z−x, z−y and z. Projection at $3C05 implements u=60+60x/z and v=60+60y/z, with output limited to 0–119. The page illustrates that relationship in real arithmetic; it is not an emulation of the integer arithmetic routines.

## Painting

The painter ordering routine begins at $348C. The renderer at $3F76 fills the 3,600-byte linear viewport at $87CC–$95DB. The copy at $4B24 rearranges it into the VIC bitmap starting at $E528, with a 320-byte character-row stride.

## Conditions

The condition event mask is $1084. The high two token bits select collision ($01), timer ($08), shot ($04), or activation ($02). The base-token length table is $13AE–$13DE. Opcode 48 transfers to another stream without returning to the outer one.

## Saving and sound

The save payload is 652 bytes: 106 bytes from $2406–$246F and 546 object-state bytes. The load buffer starts at $87CC. Sound initialization is $CF1B and the player tick is $C885. The IRQ handler at $737F is installed by $735D.

## Live checks

The restored snapshot reached the language menu and then the WILDERNESS castle view. Video-register reads confirmed the screen and bitmap bases. The VICE health check passed 56 of 57 checks; its direct instruction-pause test failed, so inspection used the kit pause-plus-frame workaround. No save/load round trip or complete playthrough was performed in this publication pass.

## Import provenance

Source: `castle_master_full_listing.txt`. SHA-256: `79505396ccd9542c55e67fb381b42210284ceba0dc51aa3d7dd1d39df277753d`. Its 65,536 initialized bytes matched the captured snapshot. The source export stays in `work/`; `symbols.json` carries its imported names and comments, and `listing.json` is generated from those symbols and the snapshot.

## Publication checks

The original import compared every initialized byte with the physical RAM dump. The Source listing was rebuilt from the matching snapshot after the import rule changed. The earlier browser pass exercised all article controls and the Source tab in Firefox 157.0, with no script errors and no horizontal overflow at a 390-pixel viewport. These checks do not establish a full-game input route.
