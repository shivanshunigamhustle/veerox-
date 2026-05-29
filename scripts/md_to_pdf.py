"""Convert the client-onboarding markdown docs to styled PDFs.

Pipeline: markdown -> HTML (with tables + fenced code) -> PDF via xhtml2pdf.
Pure-Python so it runs on Windows without GTK/cairo native deps.

Run with:
    uv run --with markdown --with xhtml2pdf python scripts/md_to_pdf.py
"""

from __future__ import annotations

from pathlib import Path

import markdown
from xhtml2pdf import pisa

DOCS_DIR = Path("client-onboarding")

# pisa supports a practical subset of CSS. This is tuned to render cleanly:
# readable body font, bordered tables, shaded code + blockquotes, page margins.
CSS = """
@page { size: A4; margin: 2cm 1.8cm; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a;
       line-height: 1.45; }
h1 { font-size: 20pt; color: #111; border-bottom: 2px solid #444; padding-bottom: 6px;
     margin-bottom: 14px; }
h2 { font-size: 14pt; color: #1a1a1a; margin-top: 20px; margin-bottom: 8px;
     border-bottom: 1px solid #ddd; padding-bottom: 3px; }
h3 { font-size: 12pt; color: #333; margin-top: 14px; margin-bottom: 6px; }
p { margin: 6px 0; }
a { color: #1a56db; text-decoration: none; }
strong { color: #111; }
ul, ol { margin: 6px 0 6px 0; padding-left: 18px; }
li { margin: 3px 0; }
code { font-family: Courier, monospace; font-size: 9.5pt; background-color: #f2f2f2;
       padding: 1px 3px; }
pre { background-color: #f5f5f5; border: 1px solid #ddd; padding: 8px;
      font-family: Courier, monospace; font-size: 9pt; margin: 8px 0; }
pre code { background-color: transparent; padding: 0; }
blockquote { background-color: #fff7e6; border-left: 4px solid #f0a500;
             margin: 8px 0; padding: 6px 10px; color: #5c4500; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; }
th { background-color: #2d3748; color: #ffffff; border: 1px solid #2d3748;
     padding: 6px 8px; text-align: left; font-size: 9.5pt; }
td { border: 1px solid #cccccc; padding: 6px 8px; font-size: 9.5pt;
     vertical-align: top; }
tr:nth-child(even) td { background-color: #f7f7f7; }
hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
"""


def convert(md_path: Path) -> Path:
    pdf_path = md_path.with_suffix(".pdf")
    md_text = md_path.read_text(encoding="utf-8")

    body_html = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "sane_lists"],
    )
    full_html = (
        f"<html><head><meta charset='utf-8'><style>{CSS}</style></head>"
        f"<body>{body_html}</body></html>"
    )

    with pdf_path.open("wb") as out:
        result = pisa.CreatePDF(full_html, dest=out, encoding="utf-8")

    if result.err:
        raise RuntimeError(f"Failed to render {md_path.name} ({result.err} errors)")
    return pdf_path


def main() -> None:
    md_files = sorted(DOCS_DIR.glob("*.md"))
    if not md_files:
        raise SystemExit(f"No markdown files found in {DOCS_DIR}/")
    for md_path in md_files:
        pdf_path = convert(md_path)
        size_kb = pdf_path.stat().st_size / 1024
        print(f"  {md_path.name}  ->  {pdf_path.name}  ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
