# Revisão visual das estruturas — 02/10/2026

Direção aprovada: usar as sete referências do ZIP do WhatsApp para refazer a pintura e melhorar os modelos existentes, mantendo geração procedural, 3D e pixel art. As imagens orientam materiais, volumes e detalhes; não foram convertidas em fachadas planas.

## Resultado

- Pintura de madeira com veios direcionais, nós e juntas de tábuas; pedra com blocos escalonados, sombra nas juntas, bordas claras e desgaste por grupos de pixels; telhas com sombras e luz próprias; palha em feixes. O reboco recebe poucas manchas maiores, em vez de ruído por toda a superfície.
- Mapas DataTexture gerados pela semente, com filtro nearest, sem mipmaps e escala em metros. O padrão inicial passou para 32 pixels por metro. Cada face recebe uma projeção ortonormal; veios acompanham a direção de peças de madeira, e telhas acompanham a inclinação da cobertura.
- Casas e demais construções recebem postes e vigas mais encorpados, beirais, cumeeiras, caixilhos, janelas recuadas, venezianas e ferragens nas portas. As construções de pedra usam pilastras e cintas de pedra.
- Pontes têm tábuas independentes com pequenas variações, apoios e acessos de madeira. Cada tábua depende do tabuleiro para a transformação de ruína.
- O templo automático tem base em três degraus, terraço, santuário elevado apoiado na cobertura inferior, colunas com bases e capitéis e nichos com relevos. O piso é de pedra. Os demais tipos de telhado continuam selecionáveis.
- Bordas internas compartilhadas entre fragmentos do telhado foram eliminadas; as laterais externas e dos buracos permanecem fechadas.

## Verificação

Comandos executados após a correção da revisão independente:

```text
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=2 tests/*.test.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
```

Resultado: 65 testes passaram, TypeScript sem erros e build concluído. O aviso existente de tamanho do bundle permanece.

A suíte inclui 31 tipos × 16 sementes × 5 níveis de ruína, renderização em dimensões padrão/mínimas/máximas, exportação, descarte de recursos e todos os testes de natureza. Os novos testes reproduziram UVs de telhado sem área, ausência de mapas pintados, ausência de tábuas individuais e compressão da pintura de colunas; passaram depois das correções.

O navegador headless Edge renderizou os 31 presets sem erros de página ou shader. A interface integrada foi verificada em 1440×960 e 390×844, incluindo seleção de Castelo, alteração de semente e alternância entre pedra e estrutura. A varredura visual usa frente, lado, trás, topo e silhueta: 155 vistas. Após oito ciclos de criação/descarte, a contagem voltou para zero geometrias e três texturas estáveis do ambiente de renderização.

Capturas atualizadas em `screenshots/`: `contact-sheet.png`, `orbit-silhouettes.png`, imagens de cada preset e `reference-art-preview.png`. Os resultados instrumentados estão em `browser-metrics.json`, `ui-results.json` e `sweep-results.json`. São testes do projeto no navegador headless; não medem especificamente o navegador embutido do usuário.

## Revisão independente e decisões

Uma revisão somente de leitura encontrou um problema importante: usar a normal suave de cada vértice comprimía a pintura ao redor de colunas. Um teste com coluna centrada e transladada reproduziu a falha. A correção usa a base fixa de cada triângulo, mantendo as normais de iluminação; o teste passou. Não foram encontrados problemas críticos.

Comportamentos considerados pela revisão:

- A adição de tábuas altera o consumo de números aleatórios da ponte: decisão aceita; a mesma semente com os mesmos parâmetros continua reproduzível. Não se promete a geometria antiga para a mesma semente.
- Empacotamento de texturas no OBJ: permanece a limitação existente. PNG preserva a pintura; OBJ exporta geometria e coordenadas UV, sem arquivos de material/textura.
- Dependências de vigas e entablamentos preexistentes: mantidas; o sistema é uma transformação artística de ruína, não simulação física.
- Bordas em coberturas parcialmente danificadas: permanecem ligadas à cobertura e desaparecem quando ela é removida; cada ornamento também participa do dano.
- Costuras e compressão em partes curvas: o defeito reproduzido foi corrigido; cada face mantém escala física de pintura.
- Semelhança artística exata: as referências guiam a direção, com adaptações para formas procedurais em 3D; as capturas permitem avaliar o resultado.
- Folha de contato desatualizada: regenerada para incluir os modelos atuais.

O projeto ativo continua sem Git. A cópia anterior foi preservada fora dele em `work/structures-checkpoints/before-reference-art-pass`. Esta revisão não publicou o repositório nem substituiu o ZIP entregue anteriormente.
