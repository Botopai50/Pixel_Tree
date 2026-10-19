# Sistema de cidades (Pixel Tree)

Gerador procedural de assentamentos: vilarejo, vila, cidade e cidade fortificada. Determinístico por semente.

- `src/settlements/` — planejador (`planner.ts`), montagem 3D (`builder.ts`), terreno (`terrain.ts`, interface `TerrainSampler`), validação, tipos.
- `src/structures/` — geradores de estruturas que as cidades reutilizam (casas, muralhas, portões, torre de pedra, escadas, etc.).
- `src/components/SettlementControls.tsx` — controles da interface.
- `tests/settlement.test.ts` — testes (`npx tsx --test tests/settlement.test.ts`).

As estruturas dependem dos geradores de árvores/pedras do projeto (`src/services`, `src/constants`), por isso o zip leva o projeto inteiro.

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
```

No visualizador escolha `structure_hamlet`, `structure_village`, `structure_town` ou `structure_fortifiedTown`
(ou `?asset=structure_village` na URL). Para ligar a outro terreno, registre um provedor com
`registerTerrainProvider` (`src/settlements/terrain.ts`); sem isso usa-se um terreno de teste.
