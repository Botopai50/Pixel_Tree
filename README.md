# Gerador de Árvores e Pedras BotW

Gerador procedural React + Three.js com vegetação e pedras independentes, em estilo pintado e pixelado inspirado em Breath of the Wild.

## Abrir a versão pronta no Windows

Extraia todo o ZIP e abra **iniciar-pronto.bat**. Ele inicia um servidor local em http://localhost:8788/ e abre o navegador. Mantenha a janela aberta durante o uso; Ctrl+C encerra o servidor. Não requer Node.js, instalação de dependências nem chave de API. Sem internet, as fontes externas são substituídas por fontes locais.

Se a porta estiver ocupada, execute `powershell -NoProfile -ExecutionPolicy Bypass -File servir-build.ps1 -Port 8789`.

## Gerar pedras

1. Escolha uma árvore e clique em **Pedras** na barra inferior. O preset inicial acompanha seu bioma.
2. Escolha outro bioma na barra, no catálogo completo ou no seletor **Bioma**.
3. Ajuste formato, dimensões, irregularidade, detalhe, quantidade e dispersão.
4. Ajuste cores, musgo, neve, fissuras, tamanho dos pixels e tons da paleta.
5. Troque a semente para gerar outra composição. A mesma semente e os mesmos parâmetros reproduzem o modelo.

Há 12 biomas: Hyrule, Satori, Akkala, Hebra, Hebra Nevada, Faron, Floresta Korok, Pântano, Gerudo, Savana, Terras Secas e Tundra. Adultas, mudas e arbustos compartilham o mapeamento; bordos usam Akkala, samambaias usam Korok e juncos usam Pântano.

As pedras têm volumes assimétricos, base achatada e faces discretas. Faron usa maior detalhe para rochas arredondadas; Gerudo e Hebra oferecem formações altas desgastadas.

Em **Cogumelos nas pedras**, ative ou desative os pequenos grupos, ajuste a quantidade desejada e o tamanho. Pântano, Faron, Korok e Satori os ativam por padrão. Os cogumelos procuram trechos com musgo na superfície real, evitam neve e respeitam o espaço disponível; a quantidade final pode ser menor que a solicitada. São sprites próprios em pixel art, com hastes curtas, tons terrosos e lilás suave.

**Capturar** salva a cena em PNG, incluindo os cogumelos. **Exportar 3D** salva somente a geometria das pedras em OBJ, sem a ilha, a grama ou os cogumelos em sprites. O shader procedural, as cores, o musgo e a neve são visuais e não são incorporados ao OBJ. O botão de corte fica desativado para pedras.

## Pedrinhas e cascalho

A aba **Pedrinhas e cascalho** gera pequenos grupos independentes, sem uma rocha grande no centro. Há presets para os mesmos 12 biomas, usando as cores da pedra, musgo discreto e neve quando apropriado. Ajuste os grupos, o tamanho das pedrinhas e a dispersão; a mesma semente reproduz a composição. Em áreas muito densas, o espaço disponível pode limitar a quantidade final.

As peças têm formatos variados, bases apoiadas no chão e distância entre si. A captura PNG preserva a pintura; a exportação OBJ inclui apenas a geometria das pedrinhas e do cascalho.

## Pedras com minérios

A aba **Pedras com minérios** fica ao lado de **Pedras**, com presets separados para os mesmos 12 biomas. Em **Depósitos de minério**, escolha entre 15 tipos: ferro, cobre, quartzo, ouro, diamante, mithril, oricalcum, chumbo, carvão, estanho, prata, ametista, rubi, esmeralda e safira. Ajuste a quantidade de depósitos e o tamanho.

Cada tipo tem sua própria paleta. Há pepitas e nódulos, lâminas metálicas, fragmentos de carvão, cristais pontudos, gemas de faces triangulares e prismas de esmeralda com topo achatado. Os veios seguem o mesmo tamanho de pixel da pedra e a neve pode cobri-los.

Os fragmentos têm reflexos em degraus e pequenos pontos de luz na grade de pixels, que mudam conforme a câmera gira. Gemas usam reflexos mais claros e concentrados; metais recebem brilhos mais amplos na própria cor. Chumbo e carvão têm brilho mais discreto.

Cada depósito se apoia na superfície real. A mesma semente e os mesmos controles reproduzem os minérios; ajustar seus controles não altera a geometria da pedra. Em pedras pequenas ou lotadas, pode haver menos depósitos que o solicitado. Definir a quantidade como zero remove o minério.

O OBJ inclui a geometria da pedra e dos fragmentos de minério. Os veios pintados, as cores e as texturas procedurais são preservados na captura PNG, não no OBJ.

## Editar o código

Com Node.js instalado:

```sh
npm install
npm run dev
```

O servidor abre em http://localhost:3000/. Após alterar o código, execute `npm run build` para atualizar a versão pronta em dist/.

Verificação:

```sh
npm run lint
npm test
npm run build
```

Os testes verificam associação de biomas, dimensões e parâmetros, repetibilidade, base apoiada no chão, exportação OBJ e liberação dos recursos 3D.

_preview.html e _preview-server.ps1 são a alternativa original que compila o código no navegador e depende de bibliotecas externas. Prefira iniciar-pronto.bat para usar a versão compilada.

## Flores, cristais e folhas secas

Três categorias independentes, cada uma com 12 presets de biomas. Flores têm quatro formatos (margarida, papoula, campânula e estrelada), pétalas e folhas dobradas em 3D. Cristais usam seis tipos (quartzo, ametista, esmeralda, rubi, safira e diamante), pintura pixelada e brilhos em cruz. Folhas secas se sobrepõem em montinhos baixos com nervuras pixeladas. Todas têm controles de semente, quantidade, tamanho, dispersão, densidade e pixels; o OBJ exporta a geometria sem a ilha de apresentação ou os brilhos.
