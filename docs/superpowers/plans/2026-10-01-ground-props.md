# Ground props implementation plan

Goal: Three standalone biome categories: wildflowers, crystals and dry leaf piles.
Approved design: separate tabs, biome palettes, size/count/spread controls, existing pixel scale; crystals retain painted 3D faces and cross sparkles.
Architecture: groundProps presets/config and an independent generator; reuse the existing standalone asset framing and export path. Ground geometry remains separate from the asset. No new dependencies.

- [ ] Add seeded generation regression tests for all three categories, all biomes, zero count, geometry export and resource cleanup; observe failure.
- [ ] Implement presets and procedural 3D flowers, bent stepped leaves, and mineral-painted crystal clusters.
- [ ] Add controls and categories to both preset selectors with live counts; preserve existing categories.
- [ ] Run regression suite, typecheck/build and visually inspect each category in the browser; review and package the result.

Review focus: zero counts keep finite framing; repeated seeds reproduce geometry; size and spread stay on the island; OBJ contains props and excludes glints; pixel palette and outlines remain readable at the existing scale.
