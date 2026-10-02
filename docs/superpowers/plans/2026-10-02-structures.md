# Estruturas procedurais — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Entregar os 31 tipos de estruturas procedurais na interface atual, com arquitetura coerente, pintura compatível com a natureza e ruína por perda de suporte.

**Architecture:** Gerar primeiro StructurePlan puro e serializável, com planta, superfícies, aberturas, conexões e suporte. Converter o plano validado em geometria/material, aplicando deterioração antes da construção dos meshes. Um contrato comum de asset integra o subsistema ao catálogo e ao viewport existentes sem reescrever os geradores naturais.

**Tech Stack:** React 19, TypeScript, Three.js, Vite, node:test e tsx já instalados; nenhuma dependência adicional prevista.

**Spec:** docs/structures/2026-10-02-especificacao.md, aprovada pelo usuário em 2 de outubro de 2026 com “prossiga”.

Estado deste plano: pronto para revisão; método de execução ainda não selecionado. Um único plano é apropriado porque as gramáticas dependem do mesmo contrato, plano arquitetônico e biblioteca de conexões. As etapas produzem incrementos verificáveis.

## Global Constraints

- Preservar os 117 presets naturais e seus ajustes recentes.
- Cobrir os 31 tipos pedidos.
- Mesma seed/configuração reproduz plano, geometria e pintura.
- Ruína: 0 intacto, 1 totalmente destruído.
- Portas e janelas terão aberturas reais e interior básico coerente.
- Compartilhar módulos geométricos é desejável; trocar apenas um nome ou uma cor no mesmo prédio não satisfaz o requisito.
- Não importar os modelos da tentativa anterior nem reproduzir edifícios de Zelda.
- Não publicar no Git nem substituir o ZIP entregue enquanto o usuário não solicitar uma nova entrega/publicação.
- PNG mantém a aparência; efeitos procedurais não viram automaticamente texturas no OBJ.
- Amostra de pelo menos 16 seeds por tipo; ruína testada em 0, .25, .5, .75 e 1.

## Review Focus

1. Dimensões mínimas com muitos vãos: portas/janelas devem caber, com parede e apoio suficientes. Teste da tarefa 3.
2. Mudança apenas de cor ou vegetação: preservar planta, aberturas e telhado. Testes das tarefas 1 e 10.
3. Ruína total e quase total: grupo finito, enquadramento utilizável e nenhum andar flutuante. Testes das tarefas 6 e 11.
4. Alternância repetida entre natureza, aldeia e subterrâneo: sem recursos vazando e sem corte/partículas indevidos. Testes das tarefas 5, 10 e 12.
5. Escala máxima em celular: câmera não corta o asset nem o painel encobre seus controles; medições de custo informam limites. Verificação da tarefa 12.

## Organização dos arquivos e contratos

Criar src/structures/types.ts para StructureKind, StructureConfig, StructureAssetConfig e tipos geométricos do plano; src/assets/types.ts para AssetConfig, AssetId e AssetInstance. AssetConfig = TreeConfig | StructureAssetConfig. StructureAssetConfig contém id/name/species/seed/structure, com species no formato structure_<tipo>, sem valores botânicos artificiais.

AssetInstance: group:THREE.Group; assetGroup:THREE.Group; bounds:THREE.Box3; update(time:number):void; dispose():void; canFell:boolean; fell?:()=>FellInfo|null. Os adaptadores naturais encaminham update/dispose/fell para a instância original e não copiam seus recursos.

StructureConfig usa type:StructureKind, biome:RockBiome, scale, width, depth, height, floors, complexity, roof, roofPitch, eaves, asymmetry, finish, openingDensity, annexes, balconies, ruin, vegetation, snow, texelsPerMetre e palette. Valores de ruína/vegetação/neve/assimetria são normalizados a [0,1]; seed é inteira e finita. Tamanhos e andares possuem limites por gramática, declarados nos descritores.

StructurePlan: schemaVersion:1; type:StructureKind; seed:number; volumes; levels; walls; openings; roofs; joints; supports; accesses; damage; debris; propZones. Vetores são tuplas numéricas em metros; IDs são strings estáveis. Campos relacionados apontam para IDs, sem referências cíclicas ou objetos Three.js. Cada suporte identifica componente dependente e componente de apoio, até uma fundação. Cada abertura identifica parede, intervalo horizontal, altura de base/topo e tipo; cada telhado identifica apoios, contorno, beiral e cumeeira. Volume guarda polígono, nível de piso, topo e função arquitetônica. PropZone guarda polígono, elevação, ocupação máxima e máscaras de exclusão.

Gramática: (context:GrammarContext)=>StructurePlan, com context = {config:StructureConfig,seed:number,streams:StructureStreams}. As 31 funções compartilham esta assinatura; a identidade dos algoritmos e o conjunto completo de tipos são os da tabela aprovada na especificação. buildStructurePlan(config:StructureAssetConfig):StructurePlan despacha a função e valida a saída. validateStructurePlan(plan):string[] retorna lista vazia para um plano coerente.

Geometrias em src/structures/geometry/; gramáticas em src/structures/grammars/; materiais em src/structures/materials.ts; renderer e gerenciador de recursos em src/structures/renderer.ts. src/structures/generator.ts combina plano, dano, render e apresentação.

Comandos, executados a partir de work/Pixel_Tree-main:

- Teste específico: node node_modules/tsx/dist/cli.mjs --test tests/<arquivo>.test.ts
- Suíte: node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
- Tipos: node node_modules/typescript/bin/tsc --noEmit
- Build: node node_modules/vite/bin/vite.js build

Não há .git no projeto ativo. Durante execução preservar o ZIP funcional e criar checkpoints de código fora da pasta ativa; não inicializar Git nem usar o clone de publicação silenciosamente. Cada tarefa termina com revisão do diff contra seu checkpoint. Se o usuário posteriormente solicitar commits/publicação, usar o clone correto e somente arquivos verificados.

## Tarefa 1 — Configurações, catálogo e streams determinísticos

**Arquivos:** criar src/structures/types.ts, src/structures/config.ts, src/structures/random.ts, src/structures/catalog.ts, src/assets/types.ts; testar tests/structureConfig.test.ts.

**Interfaces:** normalizeStructureConfig(input:StructureConfig):StructureConfig; structureStreams(seed:number):StructureStreams; streamFor(stage:string,id:string):()=>number dentro de StructureStreams. STRUCTURE_DESCRIPTORS descreve os 31 tipos com nome, família, limites e capacidades. Nenhum descritor contém mesh ou array de modelos prontos.

- [ ] Escrever testes de seed finita/negativa, clamps e 31 identificadores únicos. Comparar duas sequências de streamFor('roof','main') com assert.deepEqual; consumir o stream de vegetação não altera essa sequência. Comparar config arquitetônica após alterações de palette/vegetation.
- [ ] Rodar structureConfig.test.ts e confirmar falha pela ausência das interfaces.
- [ ] Implementar tipos, descritores, normalização e hash determinístico de seed/etapa/ID; nenhum Math.random na arquitetura. Calcular limite mínimo de dimensões por gramática.
- [ ] Rodar teste e TypeScript; exigir saída sem falhas.
- [ ] Revisar interfaces e registrar checkpoint da tarefa.

## Tarefa 2 — Planta e suporte das casas

**Arquivos:** criar src/structures/plan.ts, src/structures/validation.ts, src/structures/grammars/houses.ts e tests/structureFixtures.ts; testar tests/structurePlans.test.ts.

**Interfaces:** buildStructurePlan(config):StructurePlan; validateStructurePlan(plan):string[]; house(context), largeHouse(context), cabin(context), mansion(context):StructurePlan. fixture(type,seed,patch?):StructureAssetConfig em tests/structureFixtures.ts será usado pelos testes seguintes. Ruína ainda não modifica o plano nesta etapa.

- [ ] Escrever teste de reprodução JSON com assert.deepEqual(buildStructurePlan(fixture('house',42)),buildStructurePlan(fixture('house',42))). Em seeds 1..16 exigir pelo menos quatro assinaturas arquitetônicas distintas, ignorando cor, seed e detalhe superficial. Validar portas no nível de acesso, referências existentes e caminhos de suporte sem ciclos.
- [ ] Rodar structurePlans.test.ts; confirmar falha pelas funções ausentes.
- [ ] Implementar retângulo, L, T e anexos conectados conforme capacidades de cada função; resolver níveis, paredes, vãos e planos de cobertura antes de decoração. Usar escolhas de dimensões e topologia da seed, nunca selecionar meshes fixos.
- [ ] Rodar testes com validateStructurePlan retornando [] nas 16 seeds dos quatro tipos.
- [ ] Revisar planta, suportes e diversidade; registrar checkpoint.

## Tarefa 3 — Geometria de paredes, aberturas, juntas e cobertura

**Arquivos:** criar src/structures/geometry/walls.ts, beams.ts, roofs.ts, floors.ts, stairs.ts, arches.ts, joints.ts; testar tests/structureGeometry.test.ts.

**Interfaces:** buildWall(wall,openings):BufferGeometry; buildBeam(start,end,section,jointCuts):BufferGeometry; buildRoof(surface):BufferGeometry; buildFloor(contour,elevation,thickness):BufferGeometry; buildStairs(access):BufferGeometry; buildArch(span,thickness):BufferGeometry; resolveJoint(joint,plan):JointGeometry. JointGeometry contém peças recortadas e suas faces expostas, com recursos sem materiais.

- [ ] Escrever raycast que atravessa o vão de porta/janela e encontra parede ao lado; exigir que topo do frontão coincida com a face inferior do telhado. Verificar extremidades de viga conectadas com distância menor que 1e-5 m e ausência de triângulos expostos duplicados. Testar parede mínima com demanda excessiva de janelas: reduzir quantidade, manter margens e suportes.
- [ ] Rodar structureGeometry.test.ts e observar falha.
- [ ] Tesselar parede ao redor dos furos; gerar cobertura a partir de apoios compartilhados; recortar/chanfrar juntas e eliminar faces internas. Criar degraus a partir de alturas reais e postes a partir dos contatos, preservando apoios ao deformar madeira.
- [ ] Rodar testes de geometria, finitude e normais; todos passam. Não usar polygonOffset para esconder juntas incorretas.
- [ ] Revisar peças em junção e registrar checkpoint.

## Tarefa 4 — Pintura, recursos e renderização das casas

**Arquivos:** criar src/structures/materials.ts, renderer.ts, generator.ts; testar tests/structureRender.test.ts. Reutilizar funções de paleta de pixelArtTextureSystem e mossStyle sem alterar os resultados naturais.

**Interfaces:** createStructureMaterials(config,resources):StructureMaterials; renderStructure(plan,config):StructureRenderResult; createStructure(config):AssetInstance. StructureRenderResult contém assetGroup, bounds, update e dispose, com proprietário único para cada recurso.

- [ ] Escrever testes de geometria finita, bounds acima da base, atributos de pintura e densidade espacial independente do tamanho da parede. Instrumentar dispose: cada recurso próprio emite exatamente um descarte. Reproduzir posições e paletas para seed/config iguais.
- [ ] Rodar structureRender.test.ts e confirmar falha.
- [ ] Construir pintura de tábuas, pedra, reboco, telhas, palha e pequenos metais em grade por metro, direção de material e paleta limitada. Implementar iluminação em degraus e sombras apropriadas; adicionar chão de apresentação separado. Agrupar peças por material sem perder IDs e exportação.
- [ ] Rodar testes e build. Inspecionar casa pequena/grande/cabana/mansão em preto e com materiais, incluindo atrás e sob o beiral; corrigir vãos e z-fighting antes de ampliar catálogo.
- [ ] Revisar aparência em relação às árvores e registrar checkpoint.

## Tarefa 5 — Integração no aplicativo existente

**Arquivos:** criar src/assets/catalog.ts, generator.ts, framing.ts e src/components/StructureControls.tsx; modificar App.tsx, SpeciesBar.tsx, ControlPanel.tsx, Header.tsx, Viewport3D.tsx; testar tests/assetIntegration.test.ts.

**Interfaces:** ASSET_PRESETS:Record<AssetId,AssetConfig>; classifyAsset(config):AssetCategory; createAsset(config):AssetInstance; assetFrame(bounds,aspect,fov):FrameSettings. StructureControls recebe StructureAssetConfig e callback de atualização tipado. Fases intermediárias mostram apenas os tipos já implementados; entrega final mostra 31.

- [ ] Escrever testes de 117 presets naturais preservados, classificação única e adaptador encaminhando update/dispose/fell. Estruturas têm canFell=false e não solicitam LeafParticleSystem. FrameSettings precisa enquadrar caixa larga/alta/baixa com distância e clipping finitos.
- [ ] Rodar assetIntegration.test.ts e confirmar falha.
- [ ] Generalizar somente estado/contratos compartilhados; manter geradores/controles naturais via discriminante. Adicionar Estruturas na barra, contagem, filtros e grid; atualizar HUD e focos de câmera para significado arquitetônico. Clonar configuração aninhada no preset selecionado e manter ajustes de natureza intactos.
- [ ] Rodar testes, TypeScript e build; testar seleção natureza→casa→natureza, seed, painel desktop/mobile, reset/foco/captura e botão de corte.
- [ ] Revisar integração e registrar checkpoint utilizável.

## Tarefa 6 — Deterioração, abandono e escombros

**Arquivos:** criar src/structures/damage.ts, debris.ts; ampliar houses.ts, geometry/walls.ts e roofs.ts; testar tests/structureDamage.test.ts.

**Interfaces:** applyStructureDamage(plan,ruin,streams):StructurePlan; settleDebris(plan):StructurePlan; abandonedHouse(context), ruinedHouse(context):StructurePlan. Ruína é aplicada depois de construir o plano intacto e antes do renderer, sem alterar sua topologia de origem.

- [ ] Escrever teste com ruína [0,.25,.5,.75,1]: conjunto de apoios removidos não diminui, dependentes sem suporte colapsam e escombros estão no chão. Em 1 não permanece corpo habitável intacto; bounds não ficam vazios ou infinitos. Abandono deve mudar geometria, não só cor.
- [ ] Rodar structureDamage.test.ts e observar falha.
- [ ] Aplicar campo de dano correlacionado e limiares estáveis por peça; propagar remoção pelo grafo de suporte. Criar bordas quebradas, grupos de tábuas/telhas ausentes, portas tortas e escombros derivados da peça original; evitar sorteio independente de todos os blocos.
- [ ] Rodar testes em 16 seeds e comparar casa/abandono/ruína com a mesma seed; inspecionar graus intermediários e ruína total.
- [ ] Revisar ausência de partes flutuantes e registrar checkpoint.

## Tarefa 7 — Gramáticas rurais e infraestrutura

**Arquivos:** criar src/structures/grammars/rural.ts e infrastructure.ts; ampliar catálogo/renderer conforme componentes novos; testar tests/structureRural.test.ts.

**Interfaces:** farm, barn, stable, watchtower, ruinedTower, windmill em rural.ts; bridge, wall, gate em infrastructure.ts. Todas consomem GrammarContext e retornam StructurePlan; ruinedTower usa applyStructureDamage.

- [ ] Escrever testes de celeiro com vão duplo e armação; estábulo com baias/circulação; fazenda com parcelas e acessos; moinho com eixo/pás sem cruzar prédio; torre com suporte/plataforma/escada. Ponte tem encontros e tabuleiro contínuo; muralha conecta cantos; portão tem passagem real. Executar 16 seeds por tipo.
- [ ] Rodar structureRural.test.ts e confirmar falha pelos tipos ausentes.
- [ ] Implementar cada regra aprovada da especificação, compartilhando módulos da tarefa 3. Distribuir elementos pela função e circulação, não por posições aleatórias sem restrições.
- [ ] Rodar teste e validação dos planos; inspecionar silhuetas e junções dos nove tipos.
- [ ] Revisar identidade de cada gramática e registrar checkpoint.

## Tarefa 8 — Fortificações, templos e ruínas antigas

**Arquivos:** criar src/structures/grammars/fortified.ts e ancient.ts; testar tests/structureFortified.test.ts.

**Interfaces:** fortress, castle, ruinedCastle em fortified.ts; ancientRuins, temple em ancient.ts, sempre GrammarContext→StructurePlan. Complexidade limita torres/alas/blocos mantendo passagem e identidade.

- [ ] Escrever testes de recinto fechado com entrada, caminho superior apoiado, torres até o chão e níveis conectados. Templo possui percurso, pórtico e santuário hierarquizados; ruínas preservam alinhamentos/base original. Verificar teto/pisos sem dependentes flutuantes após ruína e diversidade de 16 seeds.
- [ ] Rodar structureFortified.test.ts e confirmar falha.
- [ ] Implementar grafos de recintos/pátios e eixos arquitetônicos, cobertura por volume e juntas entre alas/torres. Usar gramática própria para antigas ruínas, sem apenas desmontar casa comum.
- [ ] Rodar testes; inspecionar oclusão de entrada, escala, interior básico e todos os lados de castelo/templo.
- [ ] Revisar coerência e registrar checkpoint.

## Tarefa 9 — Conjuntos, biomas e estruturas especiais

**Arquivos:** criar src/structures/grammars/settlements.ts, regional.ts e special.ts; testar tests/structureSpecial.test.ts.

**Interfaces:** camp, village, outpost em settlements.ts; desert, swamp, snowy em regional.ts; treehouse, mine, dock, lighthouse, underground em special.ts. Cortes de visualização usam setStructureCutaway(instance,enabled):void; plano/asset integral permanece exportável. Esta tarefa completa os 31 tipos com os anteriores.

- [ ] Escrever testes de lotes sem sobreposição e portas voltadas para caminhos; palafitas com apoios abaixo da plataforma; neve em superfícies apropriadas; abrigo desértico com sombra/terraço. Mina tem entrada livre e contenção; doca conecta terra; farol possui galeria apoiada; subterrâneo tem salas conectadas e corte reversível. Casas em árvores precisam registrar suporte vegetal real. Repetir 16 seeds por tipo.
- [ ] Rodar structureSpecial.test.ts e confirmar falha.
- [ ] Implementar composição por caminhos/lotes e gramáticas regionais próprias. Casa em árvore usa adaptador de árvore com pontos de suporte expostos somente onde necessário; não adicionar plataformas em coordenadas arbitrárias. Limitar conjuntos para manter geração e órbita utilizáveis.
- [ ] Rodar testes de todos os tipos e conferir que STRUCTURE_PRESETS contém exatamente 31 geradores válidos. Inspecionar escala e corte subterrâneo sem perder exportação.
- [ ] Revisar escopo completo e registrar checkpoint.

## Tarefa 10 — Vegetação e props existentes nas estruturas

**Arquivos:** criar src/structures/natureAdapters.ts e vegetation.ts; modificar geradores naturais apenas para expor apoio/asset sem apresentação onde necessário; testar tests/structureVegetation.test.ts.

**Interfaces:** buildStructureNature(plan,config):NatureAttachments, com group, bounds, update, dispose; natureAsset(config):NaturalAssetAdapter com ownership encaminhado ao gerador original. Acessórios usam propZones e máscaras de abertura/circulação.

- [ ] Escrever testes de plantas fora de portas, escadas e paredes; um único chão de apresentação; recursos naturais compartilhados não são descartados pelo prédio. Cores/vegetação 0 ou 1 não alteram volumes/roofs/openings do plano, usando assert.deepEqual dessas listas.
- [ ] Rodar structureVegetation.test.ts e confirmar falha.
- [ ] Integrar pedras, cascalho, árvores/arbustos, flores e folhas com limites de densidade; criar trepadeiras sobre suportes calculados e reutilizar musgo/neve dos materiais. Remover apresentação duplicada sem remover peças do asset nem causar descarte duplo.
- [ ] Rodar teste e suíte natural; inspecionar abandono, templo e palafita com cobertura vegetal máxima.
- [ ] Revisar máscaras e ownership e registrar checkpoint.

## Tarefa 11 — Exportação, enquadramento e instâncias

**Arquivos:** modificar exportService.ts e Viewport3D.tsx; criar src/structures/export.ts; testar tests/structureExport.test.ts.

**Interfaces:** geometryExportGroup conserva função atual e expande InstancedMesh em snapshot exportável; exportStructureGroup(instance):THREE.Group usa geometria integral independente do corte de apresentação. FrameSettings da tarefa 5 ajusta near/far e área de sombra a bounds.

- [ ] Escrever testes de OBJ com paredes vazadas, dano, escombros e todas as instâncias; excluir chão, brilhos e cortes visuais. Verificar exportação não modifica cena/originais. Enquadrar ruína quase vazia e castelo máximo sem coordenadas infinitas ou clipping inadequado.
- [ ] Rodar structureExport.test.ts e confirmar falha.
- [ ] Implementar snapshot e expansão de instâncias com transformações, grupos e materiais preservados quando suportados por OBJ; não prometer bake de ShaderMaterial. Generalizar grupo exportável sem depender de RockAsset.
- [ ] Rodar testes naturais de OBJ e novos testes; capturar PNG e importar OBJ num visualizador disponível para conferir geometria.
- [ ] Revisar enquadramento/exportação e registrar checkpoint.

## Tarefa 12 — Matriz completa, desempenho e revisão visual

**Arquivos:** criar tests/structures.test.ts e docs/structures/2026-10-02-validacao.md; ajustes de custo somente nos arquivos responsáveis. Caso as medições exijam, criar src/structures/plan.worker.ts e asyncGeneration.ts mantendo mesmos planos determinísticos.

**Interfaces:** orçamento por tipo fica nos descritores; resultados de medição e limites efetivos ficam documentados. Geração async, se necessária, aceita número de revisão e descarta resultados obsoletos antes de instalar o asset.

- [ ] Escrever matriz 31×16 seeds e cinco graus de ruína com verificações de plano; amostra de render, finitude, descarte e exportação. Exigir mudanças arquitetônicas significativas, não só posições de props. Comparar criação/descarte repetidos e todos os 117 presets naturais.
- [ ] Rodar testes e registrar eventuais falhas; corrigir o responsável antes de QA visual.
- [ ] Medir geração, draw calls, triângulos, renderer.info.memory e FPS para casa, castelo e aldeia em complexidade mínima/máxima. Reduzir detalhes secundários, agrupar meshes e adiar sliders caros sem alterar gramática. Adotar worker somente se a geração do plano causar bloqueio medido.
- [ ] Testar visualmente vistas frontal, traseira, laterais, superior e órbita de todos os tipos; materiais pretos e pintados; mobile e desktop; ruína extrema; várias seeds. Registrar capturas, console e limites reais. Se a ferramenta de browser estiver indisponível, registrar o impedimento sem declarar QA visual concluído.
- [ ] Corrigir problemas encontrados e executar suíte, TypeScript e build completos; revisão final independente conforme método escolhido, com requisitos e riscos documentados.

## Tarefa 13 — Documentação e entrega

**Arquivos:** atualizar README.md, .github/workflows/deploy.yml, docs/structures/2026-10-02-validacao.md e status deste plano. Não alterar o ZIP anterior sem novo pedido.

**Interfaces:** README descreve controles, 31 tipos, ruína e exportação real; workflow executa npm test e npm run lint antes de npm run build. Preservar inicializadores Windows e base relativa do Vite.

- [ ] Conferir documentação contra categorias atuais: flores em Rasteiras, formato por bioma e espigas de juncos corrigidas; instruções de Estruturas refletem implementação verificada.
- [ ] Acrescentar testes/TypeScript no workflow sem publicar ou acionar Git remoto nesta tarefa.
- [ ] Executar verificações finais, confirmar dist atualizado e inicializador pronto. Registrar limitações reais em vez de esconder testes/QA pendentes.
- [ ] Entregar resumo, endereço local e evidências. Gerar novo ZIP ou publicar apenas se o usuário solicitar; incluir código/dist/inicializadores e excluir node_modules/segredos/helpers locais.
- [ ] Marcar tarefas concluídas somente com evidência; preservar checkpoints e informar qualquer requisito não cumprido.

## Autorrevisão do plano

- Contratos comuns e integração: tarefas 1 e 5; nenhum novo aplicativo.
- Todos os 31 tipos: quatro na tarefa 2, duas casas deterioradas na 6, nove na 7, cinco na 8 e onze na 9 = 31.
- Gramáticas, arquitetura, módulos, conexões e imperfeição: tarefas 2–4 e 7–9.
- Dano e natureza: tarefas 6 e 10; exportação/câmera: tarefa 11.
- Determinismo, mínimo de 16 seeds, cinco graus de ruína, descarte e qualidade visual: tarefa 12.
- Os cinco Review Focus possuem testes/verificações nas tarefas indicadas.
- Interfaces compartilhadas mantêm nomes e tipos; nenhuma tarefa depende de função sem produtor declarado.
- Há custos e ferramentas que só podem ser confirmados durante execução, sem prometer desempenho ou QA ainda não medidos.
