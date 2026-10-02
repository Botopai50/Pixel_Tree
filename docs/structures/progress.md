# SDD ledger — plan: docs/superpowers/plans/2026-10-02-structures.md

Execution: native, approved by user with “prossiga”.
Baseline: work/structures-checkpoints/nature-baseline; 30 tests, TypeScript, build passing before edits.
Ruling: active project is a non-Git extracted workspace; use external source checkpoints instead of Git-only helper scripts/worktrees, as approved plan specifies. Cost: no commit history; checkpoint retained for review/rollback.
Pre-flight: tasks 1→2→3→4→5 share AssetConfig/StructurePlan/AssetInstance; tasks 6–11 consume same plan and resource ownership; contracts consistent.
Task 1: started.
Task 1: complete — structureConfig.test.ts RED→GREEN, 1/1 passing; descriptors=31; streams independent.
Task 2: started.
Task 2: complete — structurePlans.test.ts RED→GREEN; four house grammars ×16 seeds; JSON deterministic and support/opening validation passing.
Task 3: started.
Task 3: core geometries green — real opening raycast, roof/triangle closure, stairs heights; additional seam/annex tests pending before visual gate.
Task 4: started.
Task 4: core renderer green — deterministic finite meshes, owned resources discarded once; TypeScript passing. Visual seam gate pending.
Task 5: started.
Ruling: retain existing nature control-panel body behind a typed dispatcher; structure body shares visual placement and common callbacks. Reason: avoid rewriting 1,995 lines of validated nature controls. Cost if wrong: minor shell styling drift, checked in mobile/desktop QA.
Task 3: shared-wall regression RED→GREEN; boundary partition eliminates interior skins and framing duplicates.
Task 5: core catalog/viewport/panel integration green; UI visual gate pending.
Task 6: started.
Task 6: core damage RED→GREEN, five integrity levels monotonic; debris grounded; dependent parts collapse. Roof/wall fragmentation and visual gate pending.
Task 7: started.

Task 7: core rural/civil grammars GREEN — nine types ×16 seeds; support and distinctive roles checked.
Task 8: started — fortified/ancient regression RED before implementation.

Task 8/9: 31 grammar registry GREEN across 16 seeds per new type; all presets now exposed. Visual and functional refinement remains in QA.
Task 6: physical roof holes and jagged wall contours RED→GREEN; degenerate hip facets corrected.
Task 10: vegetation placement and living tree support RED→GREEN; reuses original flowers/leaves/rocks, branching and leaf silhouettes; detached nature generator owns its resources.
Task 11: started — OBJ instances and cutaway tests RED.
Ruling: compact living-tree adapter reuses existing SCA and pixel leaf silhouettes with owned DataTextures; does not invoke full tree presentation/wind pipeline — avoids duplicate ground and shared canvas cache ownership — cost: foliage lighting differs slightly from standalone trees.
Ruling: ancient grammars share fortified.ts; settlement/regional grammars share special.ts — preserve shared builder and distinct algorithms without file-only indirection — cost: these files may need splitting when expanded.

Task 11: OBJ instance expansion/cutaway RED→GREEN; front-facing structure camera, bounds-relative shadows and fog implemented.
Task 12: matrix 31×16×5 GREEN; default/min/max rendering GREEN. Physical QA fixes: tent floor, village spacing, temple portico, subterranean connections, turret foundations, stair landings, shed gables, all RED→GREEN.
Task 12: headless Edge renders all 31 presets, zero page/shader errors; desktop/mobile integrated controls and nature→structure switching GREEN. Material color space corrected after visual inspection; architecture batching reduces castle render calls from 593 to 69 (including shadows and nature accessories).
Ruling: use a headless browser test of project code for captures/QA after native Windows browser control rejected URL verification — this tests the app without interacting with the user’s open browser — cost: cannot claim the embedded-browser-specific environment was inspected.

Task 10: climbing ivy added using existing flower-kit leaf silhouettes, opening masks and instancing; regression GREEN.
Task 12: asymmetric ridge/end-gable consistency RED→GREEN; multilevel stairwell landings GREEN. Final matrix/build/browser sweep pending.
Task 13: README documents 31 types, deterministic ruin, controls and actual OBJ limits; CI includes tests and TypeScript before build. No remote publication or ZIP replacement.

Final review: six Important findings confirmed; one covering fix pass started. Hip orientation, causal structural supports, specialized roofing, tower circulation, capability-based controls and water presentation have reproduction tests. Exterior terrace/wall stair landing gap also reproduced.
minor (deferred): compressed one-line functions reduce maintainability; format and split existing structure modules in a follow-up, without changing generation.

2026-10-02 — Reference art revision approved by the user. Shared materials rewritten as seeded painted DataTextures; face-distance UVs and timber grain axes; stronger framing, window recesses, shutters, fascias/ridges; individual bridge boards and wood approaches; stepped stone temple, roof-supported upper shrine and carved niches. Nature generators untouched.
Independent art review: one Important curved-column UV defect reproduced RED and corrected with a face-stable projection GREEN. No Critical findings. Shared hidden roof-fragment edges also removed after the existing fragmentation test reproduced their surface overhead.
Final automated verification: 65/65 tests GREEN, TypeScript GREEN, Vite production build GREEN (existing bundle-size warning). Matrix 31×16×5 and 93 dimension-extreme render cases remain GREEN. All31 browser captures, integrated desktop/mobile UI, and resource cleanup checked. See 2026-10-02-revisao-visual.md for art decisions, review dispositions and captures.
Tasks 12/13: implementation and verification complete; retained locally, without Git publication or ZIP replacement.
