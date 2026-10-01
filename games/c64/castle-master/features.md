# Castle Master — features

Sources: [game documentation](https://mocagh.org/miscgame/castlemaster-alt3-manual.pdf) and the contributor’s annotated listing, consulted 30 September 2026. The documentation supplies the feature inventory; the imported annotations supply verification leads.

| Feature | Status | Evidence or open work |
|---|---|---|
| First-person movement and stone throwing | open | $47C5 main loop; gameplay reached live, individual action paths not replayed |
| 3D rooms and objects | open | $9D00 database; $3730 transform; $3C05 projection |
| Object and room interactions | open | $4A58 condition dispatcher |
| Language and character selection | live | Hard-reset disk boot through to WILDERNESS |
| Saving and loading | open | $0423 and $7B03; round trip remains open |
| Full rescue route | open | Database and scripts are preserved; no end-to-end input replay |

The imported annotations are leads. Technical claims await tracing or live tests in this kit run. Scope and the disk boot are described in `orientation.md`.
