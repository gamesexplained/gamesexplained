# Castle Master — checked facts

- **Boot and selection (live):** the Dualis disk reaches its intro from a hard reset; Space dismisses it. Language 1, Return, character 1, Return reaches WILDERNESS. Captures: `reference/original-menu.png` and `reference/play-settled.png`; exact recipe in `orientation.md`.
- **Imported image comparison (byte comparison):** the disk-boot menu matches all 27,968 code-typed bytes and all 778 word-typed bytes in the supplied analysis. 57 byte-typed bytes differ. This checks the image relationship, not the descriptions.
- **Shared storage (byte comparison):** menu and gameplay differ at 3,552 bytes within `$87CC–$95DB` and at 3,218 bytes within `$E000–$FF3F`. The database `$9D00–$BF8F` and interpreter tables `$13AE–$13ED` are unchanged.
- **Vectors (live memory read):** menu and play have IRQ `$0314=$737F`, NMI `$0318=$7579`, hardware IRQ `$FFFE=$FF48`, hardware NMI `$FFFA=$7579`. The port is `$35`, DDR `$2F` in the menu snapshot.

## Verification work

Projection arithmetic, signed rotation, interpreter events, painter ordering, music and save/load behavior remain leads from the imported annotations. None is verified merely by importing it. The drafted article is kept privately until these claims are traced and cheaply testable behavior is exercised in `60-verify`.
