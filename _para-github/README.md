# Gerador de Assinatura PMMG

Aplicação web para gerar assinaturas de e-mail padronizadas da Polícia Militar
de Minas Gerais. Roda inteiramente no navegador: nenhum dado é enviado a
servidores e as informações preenchidas ficam salvas apenas no navegador do
usuário (`localStorage`).

## Como usar

**Online (GitHub Pages):** acesse a página publicada, escolha a unidade,
preencha os dados e clique em **Salvar PNG**.

**Local, para desenvolvimento:** o projeto usa arquivos separados, então
precisa ser servido por HTTP (abrir com duplo clique quebra o salvamento em
PNG por restrição de segurança do navegador).

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

**Local, arquivo único:** para distribuir por e-mail/pendrive ou usar offline
sem servidor, gere a versão autocontida:

```bash
python3 tools/build.py     # cria dist/index.html com tudo embutido
```

## Estrutura

```
.
├── index.html                  # marcação da página
├── assets/
│   ├── css/
│   │   ├── fonts.css           # @font-face da fonte Rawline (5 variantes)
│   │   └── styles.css          # temas, layout e componentes da tela
│   ├── fonts/                  # rawline-*.woff2
│   ├── img/
│   │   ├── fundo-classico.png  # fundo do modelo clássico
│   │   └── shields/            # um PNG por unidade
│   └── js/
│       ├── shields.js          # catálogo de escudos (ver abaixo)
│       └── app.js              # estado, formulário e desenho no canvas
├── tools/
│   └── build.py                # gera dist/index.html (arquivo único)
├── .nojekyll                   # evita processamento Jekyll no GitHub Pages
└── README.md
```

## Adicionar uma nova unidade

1. Salve o escudo em `assets/img/shields/` como PNG com fundo transparente
   (recomendado: 512 px no lado maior).
2. Acrescente uma entrada em `assets/js/shields.js`:

   ```js
   { id: "99bpm", label: "99º BPM", group: "Unidades", src: "assets/img/shields/99bpm.png" },
   ```

   - `id` — identificador único, sem espaços ou acentos. É o que fica gravado
     na preferência do usuário, então **não mude ids já publicados**.
   - `group` — define em qual bloco o escudo aparece na tela de seleção.

3. Teste com o servidor local e abra um Pull Request.

## Publicar no GitHub Pages

Em **Settings → Pages**, selecione *Deploy from a branch*, branch `main` e
pasta `/ (root)`. O arquivo `.nojekyll` já está no repositório para que pastas
e arquivos sejam servidos sem alteração.

## Notas técnicas

- A assinatura é montada em um `<canvas>` e exportada com `toDataURL`. Por
  isso, servida por HTTP as imagens são de mesma origem e a exportação
  funciona; aberta via `file://` o navegador considera as imagens externas e
  bloqueia o download — use `dist/index.html` nesse caso.
- A fonte Rawline é a fonte institucional do padrão digital de governo,
  embutida em WOFF2 para garantir renderização idêntica no canvas. Só as cinco
  variantes efetivamente usadas no desenho estão no repositório.
- Cor do texto, alinhamento e tamanho de exportação são fixos, por decisão de
  padronização: a assinatura sai igual para todo mundo. Os valores estão em
  `INK` e `EXPORT_MODES`, no `app.js`.
- O histórico deste projeto começou como um único `index.html` de 2,3 MB com
  todos os assets em base64 — inviável de revisar, exibir ou editar no GitHub.
  A estrutura acima separa código de assets; `tools/build.py` reconstrói o
  arquivo único quando ele é necessário.
