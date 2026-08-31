# Como contribuir

## Preparando o ambiente

```bash
git clone <url-do-repositorio>
cd ASSINATURA
python3 -m http.server 8000
```

Abra <http://localhost:8000>. Não abra o `index.html` com duplo clique: sem
servidor HTTP o navegador bloqueia a exportação em PNG.

## Fluxo de trabalho

1. Crie um branch a partir de `main`: `git checkout -b escudo-99bpm`.
2. Faça a alteração e teste no navegador (gere uma assinatura de ponta a ponta,
   nos três temas e nos modelos disponíveis).
3. Commit com mensagem no imperativo e em português:
   `git commit -m "Adiciona escudo do 99º BPM"`.
4. Abra um Pull Request descrevendo o que mudou e como testar.

## O que vai em cada arquivo

| Mudança | Arquivo |
| --- | --- |
| Novo escudo / unidade | `assets/js/shields.js` + PNG em `assets/img/shields/` |
| Cores, temas, espaçamento da tela | `assets/css/styles.css` |
| Campos do formulário, textos da página | `index.html` |
| Regras de desenho, layouts, exportação | `assets/js/app.js` |
| Nova fonte | `assets/css/fonts.css` + arquivo em `assets/fonts/` |

## Regras

- **Não edite `dist/index.html`.** Ele é gerado por `tools/build.py` e qualquer
  alteração feita lá é perdida no próximo build.
- **Não altere `id` de escudos já publicados.** Usuários têm essa preferência
  gravada no navegador e passariam a ver o escudo errado.
- **Mantenha os assets leves.** Os escudos são PNG com fundo transparente, 500 px
  de altura, reduzidos a 200 cores — um escudo exportado direto do editor pesa
  ~120 KB e some para ~20 KB sem diferença visível. Antes de commitar um escudo
  novo, rode:

  ```bash
  python3 -c "from PIL import Image; f='assets/img/shields/NOVO.png'; \
  Image.open(f).convert('RGBA').quantize(colors=200, method=Image.FASTOCTREE) \
  .save(f, optimize=True)"
  ```
- Um assunto por Pull Request. Mudança de escudo e mudança de layout são PRs
  diferentes.
