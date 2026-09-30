# Castle Master — features

Sources: [game documentation](https://mocagh.org/miscgame/castlemaster-alt3-manual.pdf) and the contributor’s annotated listing, consulted 30 September 2026. The documentation supplies the feature inventory; technical status comes from the listing.

| Feature | Status | Evidence or open work |
|---|---|---|
| First-person movement and stone throwing | traced | $47C5 main loop; gameplay reached live, individual action paths not replayed |
| 3D rooms and objects | traced | $9D00 database; $3730 transform; $3C05 projection |
| Object and room interactions | traced | $4A58 condition dispatcher |
| Language and character selection | live | Restored menu through to WILDERNESS |
| Saving and loading | traced | $0423 and $7B03; round trip remains open |
| Full rescue route | open | Database and scripts are preserved; no end-to-end input replay |

“Traced” means supported by the imported analysis. It does not imply a fresh live replay in this publication pass. Scope exclusions are described in `orientation.md`.
