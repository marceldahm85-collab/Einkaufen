#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TG_DATA = ROOT / "data" / "tg.json"
OUT = ROOT / "data" / "tg-flyer-diagnostics.json"
TMP_PDF = ROOT / "data" / ".tg-flyer-diagnostic.pdf"

MAX_JS_FILES = 20
MAX_HTML_PREVIEW = 12000
MAX_TEXT_PREVIEW_PER_PAGE = 2200


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fetch_bytes(url, attempts=4, timeout=90):
    headers = {
        "Accept": "*/*",
        "Accept-Language": "de-AT,de;q=0.9",
        "User-Agent": "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0",
    }

    last_error = None

    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read(), response.headers
        except Exception as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"Abruf fehlgeschlagen: {url}: {last_error}")


def decode_text(raw, headers=None):
    charset = None
    try:
        charset = headers.get_content_charset() if headers else None
    except Exception:
        charset = None

    return raw.decode(charset or "utf-8", errors="replace")


def extract_urls(source, base_url):
    urls = []

    patterns = [
        r"(?:src|href)\s*=\s*[\"']([^\"']+)[\"']",
        r"[\"']([^\"']+\.(?:js|json|pdf)(?:\?[^\"']*)?)[\"']",
    ]

    for pattern in patterns:
        for match in re.findall(pattern, source or "", flags=re.I):
            value = str(match).strip()
            if not value or value.startswith(("data:", "javascript:", "#")):
                continue
            urls.append(urllib.parse.urljoin(base_url, value))

    result = []
    seen = set()
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        result.append(url)

    return result


def is_demo_pdf_url(url):
    host = urllib.parse.urlparse(url).netloc.casefold()
    return host in {
        "mydomain.com",
        "www.mydomain.com",
        "example.com",
        "www.example.com",
    }


def normalize_flowpaper_pdf_url(url):
    """
    FlowPaper split mode may expose:
      docs/Name_[*,2,true].pdf?reload=...
    while the original downloadable PDF is:
      docs/Name.pdf?reload=...

    The same original filename can also be inferred from:
      docs/Name.pdf_{page}.jpg
      docs/Name.pdf_{page}.bin
    """
    value = str(url or "").replace("\\/", "/").strip()
    if not value:
        return None

    parts = urllib.parse.urlsplit(value)
    path = parts.path

    # Split-mode template -> original PDF.
    path = re.sub(
        r"_\[\s*\*\s*,\s*\d+\s*(?:,\s*(?:true|false)\s*)?\]\.pdf$",
        ".pdf",
        path,
        flags=re.I,
    )

    # FlowPaper page image / JSON text template -> original PDF.
    path = re.sub(
        r"\.pdf_\{page\}\.(?:jpg|jpeg|png|bin|json)$",
        ".pdf",
        path,
        flags=re.I,
    )

    normalized = urllib.parse.urlunsplit((
        parts.scheme,
        parts.netloc,
        path,
        parts.query,
        parts.fragment,
    ))

    return normalized


def extract_pdf_candidates(source, base_url):
    candidates = []

    patterns = [
        r"PDFFile\s*:\s*[\"']([^\"']+\.pdf(?:\?[^\"']*)?)[\"']",
        r"PDFFile\s*=\s*[\"']([^\"']+\.pdf(?:\?[^\"']*)?)[\"']",
        r"IMGFiles\s*:\s*[\"']([^\"']+\.pdf_\{page\}\.(?:jpg|jpeg|png)(?:\?[^\"']*)?)[\"']",
        r"JSONFile\s*:\s*[\"']([^\"']+\.pdf_\{page\}\.(?:bin|json)(?:\?[^\"']*)?)[\"']",
        r"[\"']([^\"']+\.pdf(?:\?[^\"']*)?)[\"']",
        r"href\s*=\s*[\"']([^\"']+\.pdf(?:\?[^\"']*)?)[\"']",
    ]

    for pattern in patterns:
        for match in re.findall(pattern, source or "", flags=re.I):
            candidates.append(urllib.parse.urljoin(base_url, str(match).strip()))

    result = []
    seen = set()

    for url in candidates:
        normalized = normalize_flowpaper_pdf_url(url)
        if not normalized:
            continue
        if is_demo_pdf_url(normalized):
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)

    return result


def inspect_flowpaper(index_url):
    raw, headers = fetch_bytes(index_url)
    html = decode_text(raw, headers)

    assets = extract_urls(html, index_url)
    pdf_candidates = extract_pdf_candidates(html, index_url)

    js_urls = [
        u for u in assets
        if urllib.parse.urlparse(u).path.lower().endswith(".js")
    ][:MAX_JS_FILES]

    js_diagnostics = []

    for js_url in js_urls:
        try:
            js_raw, js_headers = fetch_bytes(js_url, attempts=2, timeout=45)
            js_text = decode_text(js_raw, js_headers)
            found = extract_pdf_candidates(js_text, js_url)
            pdf_candidates.extend(found)

            js_diagnostics.append({
                "url": js_url,
                "size": len(js_raw),
                "pdfCandidates": found,
                "flowpaperMention": bool(re.search(r"flowpaper", js_text, flags=re.I)),
            })
        except Exception as exc:
            js_diagnostics.append({
                "url": js_url,
                "error": str(exc),
            })

    unique_pdfs = []
    seen = set()

    for url in pdf_candidates:
        if url in seen:
            continue
        seen.add(url)
        unique_pdfs.append(url)

    flowpaper_markers = {
        "flowpaper": bool(re.search(r"flowpaper", html, flags=re.I)),
        "PDFFile": bool(re.search(r"PDFFile", html, flags=re.I)),
        "download": bool(re.search(r"download", html, flags=re.I)),
        "flipbook": bool(re.search(r"flipbook", html, flags=re.I)),
    }

    return {
        "html": html,
        "assets": assets,
        "pdfCandidates": unique_pdfs,
        "js": js_diagnostics,
        "markers": flowpaper_markers,
    }


def choose_working_pdf(candidates):
    attempts = []

    for url in candidates:
        try:
            raw, headers = fetch_bytes(url, attempts=2, timeout=90)
            content_type = str(headers.get("Content-Type") or "")
            is_pdf = raw[:5] == b"%PDF-" or "application/pdf" in content_type.lower()

            attempts.append({
                "url": url,
                "size": len(raw),
                "contentType": content_type,
                "isPdf": is_pdf,
            })

            if is_pdf:
                TMP_PDF.write_bytes(raw)
                return url, attempts

        except Exception as exc:
            attempts.append({
                "url": url,
                "error": str(exc),
            })

    return None, attempts


def extract_pdf_text(pdf_path):
    try:
        from pypdf import PdfReader
    except Exception as exc:
        raise RuntimeError(
            "pypdf ist nicht installiert. Der Workflow muss vor der Diagnose "
            "'python -m pip install pypdf' ausführen."
        ) from exc

    reader = PdfReader(str(pdf_path))

    pages = []
    all_text = []

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        normalized = "\n".join(line.rstrip() for line in text.splitlines())
        all_text.append(normalized)

        pages.append({
            "page": index,
            "characters": len(normalized),
            "preview": normalized[:MAX_TEXT_PREVIEW_PER_PAGE],
            "signals": {
                "billiger": len(re.findall(r"\bBILLIGER\b", normalized, flags=re.I)),
                "gratis": len(re.findall(r"\bGRATIS\b", normalized, flags=re.I)),
                "abQuantity": len(re.findall(r"\bAB\s+\d+\b", normalized, flags=re.I)),
                "prices": len(re.findall(r"\b\d{1,3}[.,]\d{2}\b", normalized)),
            },
        })

    combined = "\n".join(all_text)

    return {
        "pageCount": len(reader.pages),
        "characters": len(combined),
        "signalTotals": {
            "billiger": len(re.findall(r"\bBILLIGER\b", combined, flags=re.I)),
            "gratis": len(re.findall(r"\bGRATIS\b", combined, flags=re.I)),
            "abQuantity": len(re.findall(r"\bAB\s+\d+\b", combined, flags=re.I)),
            "prices": len(re.findall(r"\b\d{1,3}[.,]\d{2}\b", combined)),
        },
        "pages": pages,
    }


def main():
    if not TG_DATA.exists():
        raise RuntimeError("data/tg.json fehlt.")

    tg = json.loads(TG_DATA.read_text(encoding="utf-8"))
    flyer = tg.get("flyer") or {}
    index_url = str(flyer.get("url") or "").strip()

    if not index_url:
        raise RuntimeError("In data/tg.json wurde kein Osttirol-Flugblatt-Link gefunden.")

    print("=== T&G OSTTIROL FLUGBLATT-DIAGNOSE ===")
    print(f"Viewer: {index_url}")

    inspection = inspect_flowpaper(index_url)

    print(
        "FlowPaper-Marker: "
        + " | ".join(
            f"{key}={'ja' if value else 'nein'}"
            for key, value in inspection["markers"].items()
        )
    )

    print(f"Gefundene Assets: {len(inspection['assets'])}")
    print(f"Geprüfte JS-Dateien: {len(inspection['js'])}")
    print(f"PDF-Kandidaten nach FlowPaper-Normalisierung: {len(inspection['pdfCandidates'])}")

    for url in inspection["pdfCandidates"][:20]:
        print(f"  PDF-Kandidat normalisiert: {url}")

    pdf_url, pdf_attempts = choose_working_pdf(inspection["pdfCandidates"])

    result = {
        "generatedAt": now_iso(),
        "region": "Osttirol",
        "viewerUrl": index_url,
        "viewerMarkers": inspection["markers"],
        "assetCount": len(inspection["assets"]),
        "assets": inspection["assets"][:120],
        "javascript": inspection["js"],
        "pdfCandidates": inspection["pdfCandidates"],
        "pdfAttempts": pdf_attempts,
        "pdfUrl": pdf_url,
        "viewerHtmlPreview": inspection["html"][:MAX_HTML_PREVIEW],
        "pdf": None,
    }

    if pdf_url:
        print(f"PDF gefunden: {pdf_url}")

        pdf_info = extract_pdf_text(TMP_PDF)
        result["pdf"] = pdf_info

        print(f"PDF-Seiten: {pdf_info['pageCount']}")
        print(f"Extrahierte Textzeichen: {pdf_info['characters']}")
        print(
            "Textsignale: "
            + " | ".join(
                f"{key}={value}"
                for key, value in pdf_info["signalTotals"].items()
            )
        )

        for page in pdf_info["pages"]:
            print(
                f"Seite {page['page']}: {page['characters']} Zeichen | "
                f"BILLIGER={page['signals']['billiger']} | "
                f"GRATIS={page['signals']['gratis']} | "
                f"AB-Menge={page['signals']['abQuantity']} | "
                f"Preise={page['signals']['prices']}"
            )
    else:
        print(
            "WARNUNG: Noch keine direkt abrufbare PDF gefunden. "
            "Die Asset-/JS-Diagnose wurde trotzdem gespeichert."
        )

    OUT.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    try:
        TMP_PDF.unlink(missing_ok=True)
    except Exception:
        pass

    print(f"Diagnose gespeichert: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
