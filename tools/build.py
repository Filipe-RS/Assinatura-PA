#!/usr/bin/env python3
"""
Gera dist/index.html: uma versao autocontida (arquivo unico) do gerador,
com CSS, JavaScript, fontes e imagens embutidos em base64.

Use quando precisar distribuir o gerador como um unico arquivo -- por e-mail,
pendrive ou para abrir com duplo clique, sem servidor.

    python3 tools/build.py

O arquivo servido pelo GitHub Pages continua sendo o index.html da raiz;
dist/ e apenas um produto de distribuicao e nao precisa ir para o Git.
"""
import base64
import mimetypes
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
}


def clean(ref: str) -> str:
    """Remove a query de versao (?v=2) para resolver o arquivo em disco."""
    return ref.split("?", 1)[0].split("#", 1)[0]


def data_uri(path: Path) -> str:
    mime = MIME.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return "data:%s;base64,%s" % (mime, base64.b64encode(path.read_bytes()).decode("ascii"))


def inline_css_urls(css: str, css_dir: Path) -> str:
    """Troca url('../fonts/x.woff2') pelo conteudo em base64."""
    def repl(m):
        raw = m.group(1).strip().strip("'\"")
        if raw.startswith(("data:", "http:", "https:", "//")):
            return m.group(0)
        target = (css_dir / clean(raw)).resolve()
        if not target.exists():
            print("  ! aviso: nao encontrado %s" % raw)
            return m.group(0)
        return "url(%s)" % data_uri(target)
    return re.sub(r"url\(([^)]+)\)", repl, css)


def main() -> int:
    index = ROOT / "index.html"
    if not index.exists():
        print("erro: index.html nao encontrado em %s" % ROOT)
        return 1
    html = index.read_text(encoding="utf-8")

    # 1. CSS -> <style>
    def css_repl(m):
        href = m.group(1)
        path = (ROOT / clean(href)).resolve()
        print("  css   %s" % href)
        css = inline_css_urls(path.read_text(encoding="utf-8"), path.parent)
        return "<style>\n/* %s */\n%s\n</style>" % (href, css)

    html = re.sub(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>', css_repl, html)

    # 2. JS -> <script>
    def js_repl(m):
        src = m.group(1)
        path = (ROOT / clean(src)).resolve()
        print("  js    %s" % src)
        return "<script>\n/* %s */\n%s\n</script>" % (src, path.read_text(encoding="utf-8"))

    html = re.sub(r'<script[^>]+src="([^"]+)"[^>]*>\s*</script>', js_repl, html)

    # 3. Caminhos de imagem que sobraram (SHIELDS, BG, <img src>) -> base64
    seen = {}

    def img_repl(m):
        quote, rel = m.group(1), m.group(2)
        path = (ROOT / clean(rel)).resolve()
        if not path.exists():
            print("  ! aviso: imagem nao encontrada %s" % rel)
            return m.group(0)
        if rel not in seen:
            seen[rel] = data_uri(path)
            print("  img   %s" % rel)
        return "%s%s%s" % (quote, seen[rel], quote)

    html = re.sub(r'(["\'])(assets/img/[^"\']+)\1', img_repl, html)

    DIST.mkdir(exist_ok=True)
    out = DIST / "index.html"
    out.write_text(html, encoding="utf-8")
    print("\nok: %s (%.1f MB)" % (out, out.stat().st_size / 1048576))
    return 0


if __name__ == "__main__":
    sys.exit(main())
