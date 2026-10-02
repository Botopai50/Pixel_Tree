# Estruturas procedurais — especificação para revisão

Data: 2 de outubro de 2026. Estado: especificação aprovada pelo usuário em 2 de outubro de 2026 (“prossiga”). Plano de implementação criado para revisão; nenhum gerador de estruturas implementado nesta etapa.

## Intenção e escopo

Adicionar Estruturas como categoria principal na barra inferior existente, com contagem, setas, catálogo completo, painel de parâmetros, mesma cena, semente, enquadramento, PNG e OBJ. Preservar os 117 presets naturais e seus ajustes recentes.

A referência é a linguagem visual de Breath of the Wild: volumes legíveis, proporções expressivas, madeira artesanal, pedra pintada, natureza e assimetria controlada. Criar arquitetura original. Não importar os modelos da tentativa anterior nem reproduzir edifícios de Zelda.

Cobrir os 31 tipos pedidos. Cada tipo possui regras próprias para planta, suporte, cobertura, acessos, composição e conservação. Compartilhar módulos geométricos é desejável; trocar apenas um nome ou uma cor no mesmo prédio não satisfaz o requisito.

Esta proposta pressupõe geração de assets e pequenos conjuntos para um jogo, no visualizador atual. Não inclui sistema de jogo, NPCs ou simulação física em tempo real. Portas e janelas terão aberturas reais e interior básico coerente; não pressupõe interiores totalmente mobiliados.

## Modelo e integração

AssetConfig será união de TreeConfig e StructureAssetConfig. StructureAssetConfig contém identificador, nome, seed e StructureConfig, sem parâmetros botânicos fictícios. TreeConfig e seus geradores permanecem disponíveis.

StructureConfig: tipo, bioma, escala, limites de largura/profundidade/altura, andares, complexidade arquitetônica, família de telhado, inclinação, beiral, assimetria, acabamento, densidade de aberturas, varandas/anexos quando suportados, ruína, vegetação, neve, densidade de textura e paletas. Parâmetros não aplicáveis ficam ocultos no painel. Dimensões ajustam a planta respeitando portas, circulação e suporte mínimos.

Ruína é o nome exibido para o parâmetro de deterioração: 0 intacto, 1 totalmente destruído. Integridade, se exibida como informação, equivale a 1 menos Ruína. Evitar um slider com direção ambígua.

AssetInstance possui grupo de cena, grupo exportável, bounds, update, dispose e capacidades opcionais. Um adaptador atende as instâncias naturais atuais; createAsset despacha natureza ou estruturas. Structures não possuem capacidade de derrubar árvore.

TREE_PRESETS e STRUCTURE_PRESETS alimentam um catálogo comum. O preset define valores iniciais e identidade de tipo; não contém geometria pronta. Um classificador único serve SpeciesBar e filtros do painel. As famílias internas facilitam navegação sem criar uma aplicação ou um canvas separado.

## Pipeline arquitetônico

1. Normalizar parâmetros e iniciar streams determinísticos por etapa.
2. Escolher gramática do tipo e linguagem do bioma.
3. Resolver planta e circulação: polígonos, corredores, pátios, entradas, acessos e zonas excluídas.
4. Definir volumes, níveis, fundações e topologia de suporte.
5. Criar paredes e esquemas de aberturas conforme dimensões disponíveis.
6. Resolver armação, vigas, pilares e conexões.
7. Resolver superfícies de telhado a partir dos contornos de apoio.
8. Materializar aberturas, frontões, escadas, varandas e chaminés.
9. Aplicar imperfeições mantendo pontos de conexão consistentes.
10. Aplicar deterioração espacial e propagação por suporte.
11. Assentar escombros, props e vegetação nas regiões permitidas.
12. Validar relações, produzir bounds e geometria de renderização/exportação.

A saída intermediária StructurePlan é serializável e não depende do DOM. Contém Footprint, Volume, Level, Wall, Opening, RoofSurface, Joint, Support, Access e DamageRegion com IDs estáveis. Cada módulo declara pontos de ligação, superfície de apoio e dependências. A construção de meshes ocorre somente depois da validação deste plano.

Streams derivados da seed e IDs estáveis: planta, volumes, telhados, aberturas, detalhes, ruína, materiais e vegetação. Mesma seed/configuração reproduz plano, geometria e pintura. Mudar somente a densidade de vegetação ou cores preserva a arquitetura.

## Gramáticas específicas dos 31 tipos

| Tipo | Regras de geração e variação estrutural |
| --- | --- |
| Casa simples | Planta retangular ou anexo conectado; um pavimento, porta no nível de acesso, ritmo de janelas, varanda opcional e telhado correspondente. |
| Casa grande | Dois ou mais volumes, L/T, pavimentos com proporções distintas, entrada hierarquizada, telhados em alturas relacionadas e sacada apoiada. |
| Cabana | Estrutura de troncos ou tábuas, poucas aberturas, planta compacta, beiral amplo, cobertura de palha/madeira e pequeno alpendre. |
| Casa abandonada | Gramática de casa com portas tortas, venezianas danificadas, falhas localizadas de cobertura, madeira exposta e vegetação acumulada em zonas úmidas. |
| Casa em ruínas | Planta ainda reconhecível, desmoronamento de paredes/cobertura ligado à perda de suporte, bordas partidas e material caído próximo. |
| Fazenda | Casa, área de cultivo, cerca e caminhos organizados por circulação; terreno dividido em parcelas, anexo e depósito posicionados funcionalmente. |
| Celeiro | Nave longitudinal, vãos largos, tesouras de cobertura, portas duplas e mezanino ou ventilação superior conforme tamanho. |
| Estábulo | Fileiras de baias, corredor ou frente aberta, apoios em ritmo regular, cobertura grande, cercado e acesso desobstruído. |
| Torre de vigia | Altura e plataformas variáveis, pilares até a fundação, travamentos diagonais, escada conectada e posto de observação coberto ou aberto. |
| Torre em ruínas | Núcleo remanescente, perda de pisos superiores conforme suporte, escada interrompida por dano e pedras/tábuas assentadas abaixo. |
| Moinho | Corpo estreito ou torre, suporte do eixo, conjunto de pás com folga em relação ao edifício, capota e entrada conectados. |
| Fortaleza pequena | Recinto defensivo e pátio, entrada protegida, torres/guaritas em posições de canto e circulação sobre muralhas. |
| Castelo | Pátios, corpo principal, alas, torres e recinto com hierarquia; passagens e níveis conectados por acessos reais. |
| Castelo em ruínas | Plano de castelo com regiões de destruição correlacionadas, silhueta quebrada, arcos remanescentes e escombros coerentes. |
| Ruínas antigas | Planta de salão ou recinto perdido, colunas a partir de eixos regulares, fragmentos de arcos, piso e bases que revelam a construção anterior. |
| Templo antigo | Percurso de entrada, escadaria, terraço, pórtico e santuário; repetição rítmica de colunas e volumes escalonados com identidade original. |
| Pontes | Dois encontros, vão e perfil definidos; madeira com vigas/travamento ou pedra com arcos e apoios; tabuleiro contínuo e guarda-corpo. |
| Muralhas | Traçado segmentado ou curvo, espessura e altura coerentes, fundação, caminho superior e ameias; cantos resolvidos por juntas. |
| Portões | Abertura de passagem, pilares ou torres laterais, travessa/arco apoiado, folhas de porta no vão e acesso dos dois lados. |
| Acampamentos | Clareira, área central e tendas com estacas/cordas; fogueira/depósitos em zonas reservadas, entrada e caminhos livres. |
| Aldeias | Malha de caminhos e espaço comum; lotes ocupados por casas distintas, orientação para acessos, distâncias e variedade limitada por orçamento. |
| Postos avançados | Plataforma ou perímetro compacto, vigia, barraca/cabana, paliçada, portão e área de suprimentos ligados por circulação. |
| Mansões | Corpo central e alas, entrada dominante, varanda/sacada, pisos e telhados hierarquizados; assimetria moderada em anexos. |
| Casas em árvores | Árvore com pontos de suporte definidos; plataforma presa ao tronco/galhos adequados, abrigo leve, escada e guarda-corpo conectados. |
| Estruturas de deserto | Pátios sombreados, reboco e arenito, terraços, aberturas recuadas, coberturas planas ou abobadadas e proteção solar. |
| Estruturas de pântano | Palafitas apoiadas abaixo da plataforma, passarelas, escada ou doca, cobertura leve, musgo e folhagem nas zonas úmidas. |
| Estruturas nevadas | Corpo compacto, fundação de pedra, telhado mais inclinado, entrada protegida, madeira espessa e neve nos apoios voltados para cima. |
| Minas | Boca de mina ligada à rocha, armação de contenção, trecho inicial de túnel, trilhos/rampa e depósito externo; sem bloquear entrada com vegetação. |
| Docas | Linha de costa/água de apresentação, estacas, tabuleiro em trechos, braços conectados e acesso à terra. |
| Faróis | Torre de perfil variável, escada/entrada, galeria apoiada, lanterna e cobertura superior; implantação com rochedo costeiro. |
| Estruturas subterrâneas | Salas e túneis por grafo de conexões, pilares/arcos, escadas e entrada; corte de apresentação permite enxergar o conjunto. |

Abandonado e arruinado reutilizam a planta do tipo íntegro e acrescentam regras de conservação próprias. O desgaste altera efetivamente geometria, não somente paleta. As gramáticas devem demonstrar variedade de planta, cobertura ou composição ao longo de múltiplas seeds.

## Biblioteca modular e regras de conexão

Geometria procedural para fundação, piso, plataforma, paredes de pedra/madeira/reboco, pilares, vigas, arcos, escadas e torres. Telhados de duas/quatro águas, uma água, palha, tábuas, telhas e variações danificadas. Aberturas simples/duplas/arqueadas e janelas proporcionais. Detalhes incluem venezianas, suportes, sacadas, varandas, chaminés, bandeiras, tecidos e cordas quando cabíveis.

Paredes com aberturas serão tesselações do contorno restante; não colocar retângulos escuros em paredes inteiras como substituto de furos. Molduras têm espessura e faces únicas. Cobertura usa contorno de beiral e cumeeira; o frontão preenche precisamente o espaço entre parede e telhado.

Uma conexão pertence a um único Joint. Vigas terminam em faces de encaixe calculadas, com cortes de topo/chanfros e remoção de faces internas quando necessário. Peças podem penetrar internamente de maneira plausível; superfícies expostas não podem ocupar o mesmo plano. Não corrigir z-fighting simplesmente empilhando camadas ou deslocando tudo para fora.

Escadas possuem base, patamar e destino; altura dos degraus deriva da diferença de nível. Chaminés seguem a interseção calculada com o telhado e incluem remate. Portas terminam em piso/soleira/escada, torres têm cadeia de suporte até a fundação, e entradas não recebem props aleatórios.

## Imperfeição controlada

Deformar a peça em torno de pontos compartilhados e manter apoios como restrições. Madeira pode afinar, arquear levemente ou mudar espessura; o encontro continua conectado. Telhados variam inclinação, beiral e altura de cumeeira dentro de limites. Blocos possuem juntas, faces irregulares e pequenas variações de tamanho. Assimetria atua primeiro na planta e nos volumes, depois no acabamento.

Silhueta validada com material preto: entrada, corpo principal, cobertura e partes secundárias precisam continuar legíveis. Não exigir milhares de detalhes para identificar o tipo.

## Ruína e abandono

Campo de dano espacial determinístico escolhe regiões de infiltração, envelhecimento e impacto. Componentes recebem limiares estáveis; aumentar Ruína não restaura suporte perdido. Remover uma peça exige verificar seus dependentes: partes superiores ficam expostas, quebram ou colapsam, sem permanecer flutuando.

Paredes quebram por contornos irregulares ligados a juntas/blocos. Tábuas e telhas se perdem em conjuntos locais. Escombros derivam das peças danificadas e são posicionados no chão, fora de acessos preservados quando apropriado. Em Ruína=1 restam fundações, material caído e vegetação; não há edifício íntegro escondido por cor escura.

É uma simulação visual baseada em suporte, não uma simulação física contínua. Musgo, trepadeiras e plantas usam máscaras de umidade, orientação e acesso. Sistemas naturais são reutilizados mediante adaptadores que removem apresentação duplicada e mantêm o descarte sob responsabilidade do recurso original.

## Pintura procedural e biomas

Reutilizar buildWoodRamp, buildFoliageRamp, pixelTextureLightDir, mossStyle e os tons de neve. Criar materiais arquitetônicos para madeira serrada, reboco, alvenaria, telhas, palha e metal discreto.

Grade de pintura em metros, com orientação por superfície. Mais dimensões significam mais células. Controlar densidade e detalhe separadamente: textura mais fina não significa granulação aleatória. Grandes manchas, sombra sob beiral, planos claros/escuros e poucas linhas de junta. Musgo/neve compartilham escala espacial e regras de transição com a natureza existente.

Os 12 biomas influenciam material, cobertura, vegetação e implantação; estruturas de deserto/pântano/neve possuem gramáticas adicionais além da troca de paleta. Casas rurais, ruínas e templos recebem formas originais, sem copiar edifícios específicos da referência.

## Câmera, desempenho e exportação

Bounds do asset definem órbita, distância, clipping e extensão de sombras. Grupo de apresentação separado permite exportar só a estrutura e seus acessórios permanentes. Subterrâneos usam corte de visualização sem apagar permanentemente a geometria da versão integral.

Agrupar geometria por material; instanciar peças repetidas somente com suporte à exportação. Limites explícitos de complexidade e quantidade para aldeias/castelos. Medir geração, draw calls, triângulos, recursos GPU e FPS em desktop e viewport móvel. Não prometer um FPS sem medição. Caso geração síncrona bloqueie a interface, extrair cálculo puro do plano para worker; decidir com medições, não adicionar dependências preventivamente.

PNG mantém a aparência. OBJ preserva geometria, aberturas e dano; efeitos procedurais não viram automaticamente texturas. Expandir instâncias ao exportar. Deixar esta limitação explícita no README, sem prometer materiais que o formato atual não inclui.

## Critérios de aceitação

- Categoria integrada, contagem correta e todos os 31 tipos disponíveis, com controles aplicáveis.
- Mesmo plano/meshes/pintura para seed e parâmetros iguais; não usar tempo/Math.random para arquitetura.
- Amostra de pelo menos 16 seeds por tipo mostra mudanças significativas de planta, proporções, cobertura ou composição; quantidade de tipos não pode mascarar modelos fixos.
- Portas no piso, janelas dentro das paredes, escadas conectadas, torres apoiadas, vigas conectadas, telhados cobrindo volumes e frontões preenchidos.
- Juntas sem faces expostas coincidentes. Inspeção de órbita verifica ausência de cintilação; testes geométricos validam relações.
- Ruína em 0, .25, .5, .75 e 1 produz dano crescente, dependências plausíveis e escombros apoiados.
- Acessórios/vegetação respeitam máscaras, limites e apoios. Reutilização não introduz ilhas de chão dentro do prédio.
- Alterar cor/vegetação não troca planta. Configuração da natureza mantém resultados de regressão.
- Recursos criados têm proprietário e são descartados uma vez; alternar naturezas/estruturas repetidamente não apresenta crescimento persistente de recursos.
- OBJ finito com meshes de instâncias expandidas; PNG e câmera utilizáveis; console sem erro de shader.
- Testes atuais, novos testes, TypeScript e build passam. Verificação visual em vistas frontal, lateral, traseira, superior e órbita, incluindo mobile.

## Sequência proposta, sem reduzir o escopo

1. Contrato comum, catálogo, painel e enquadramento integrado.
2. Plano arquitetônico, módulos de juntas, aberturas, telhados e materiais; casa simples e grande como referência visual.
3. Ruína/abandono e comparação com as casas intactas, com sementes idênticas.
4. Construções rurais e torres, pontes, muralhas e portões.
5. Fortificações, templos e ruínas antigas.
6. Conjuntos habitados, arquiteturas por bioma, árvores, minas, docas, faróis e subterrâneos.
7. Matriz de seeds, recursos, exportação, integração, QA visual e documentação/ZIP.

A implementação detalhada será planejada depois da revisão desta especificação. Não publicar no Git nem substituir o ZIP entregue enquanto o usuário não solicitar uma nova entrega/publicação.
