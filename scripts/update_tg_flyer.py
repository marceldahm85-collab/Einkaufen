#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "tg.json"
STATUS_PATH = ROOT / "data" / "update-status.json"
TMP_PDF = ROOT / "data" / ".tg-flyer.pdf"

MIN_FLYER_PRODUCTS = 20

UNIT_LINE_RX = re.compile(r"€\s*/", re.I)
PRICE_ONLY_RX = re.compile(r"^\d{1,4}(?:[.,]\d{2})$")

MEASURE_START_RX = re.compile(
    r"(?:\bca\.\s*)?\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:kg|g|l|ml)\b"
    r"|\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|Blatt)\b"
    r"|\d+(?:[.,]\d+)?\s*m\s*x\s*\d+(?:[.,]\d+)?\s*cm\b"
    r"|\bper\s+(?:kg|stück)\b|\baus\s+(?:Österreich|Tirol)\b",
    re.I,
)


def local_today():
    return datetime.now(ZoneInfo("Europe/Vienna")).date()


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def number(value):
    try:
        if value is None or value == "":
            return None
        n = float(str(value).replace("€", "").replace(",", ".").strip())
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


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


def normalize_flowpaper_pdf_url(url):
    value = str(url or "").replace("\\/", "/").strip()
    if not value:
        return None

    parts = urllib.parse.urlsplit(value)
    path = parts.path

    path = re.sub(
        r"_\[\s*\*\s*,\s*\d+\s*(?:,\s*(?:true|false)\s*)?\]\.pdf$",
        ".pdf",
        path,
        flags=re.I,
    )

    return urllib.parse.urlunsplit((
        parts.scheme,
        parts.netloc,
        path,
        parts.query,
        parts.fragment,
    ))


def resolve_pdf_url(viewer_url):
    raw, headers = fetch_bytes(viewer_url)
    source = decode_text(raw, headers)

    match = re.search(
        r'["\']PDFFile["\']\s*:\s*["\']([^"\']+)["\']',
        source,
        flags=re.I,
    )

    if not match:
        match = re.search(
            r'PDFFile\s*:\s*["\']([^"\']+)["\']',
            source,
            flags=re.I,
        )

    if not match:
        raise RuntimeError("FlowPaper PDFFile wurde im T&G-Flugblatt nicht gefunden.")

    candidate = urllib.parse.urljoin(viewer_url, match.group(1))
    return normalize_flowpaper_pdf_url(candidate)


def download_pdf(viewer_url):
    pdf_url = resolve_pdf_url(viewer_url)
    raw, headers = fetch_bytes(pdf_url)

    content_type = str(headers.get("Content-Type") or "")
    if raw[:5] != b"%PDF-" and "application/pdf" not in content_type.casefold():
        raise RuntimeError("Der normalisierte T&G-Flugblatt-Link liefert keine PDF.")

    TMP_PDF.write_bytes(raw)
    return pdf_url


def extract_page_texts(pdf_path):
    try:
        from pypdf import PdfReader
    except Exception as exc:
        raise RuntimeError("pypdf ist nicht installiert.") from exc

    reader = PdfReader(str(pdf_path))
    result = []

    for page in reader.pages:
        text = page.extract_text() or ""
        result.append("\n".join(line.rstrip() for line in text.splitlines()))

    return result


def extract_page_layouts(pdf_path):
    """Extract positioned text fragments with pypdf's visitor callback.

    This is supplementary evidence only. If coordinates are unusable, the
    importer falls back to the proven plain-text logic instead of guessing.
    """
    try:
        from pypdf import PdfReader
    except Exception as exc:
        raise RuntimeError("pypdf ist nicht installiert.") from exc

    reader = PdfReader(str(pdf_path))
    pages = []

    for page in reader.pages:
        fragments = []

        def visitor(text, cm, tm, font_dict, font_size):
            raw = " ".join(str(text or "").split())
            if not raw:
                return

            try:
                x = float(tm[4])
                y = float(tm[5])
                size = max(5.0, float(font_size or 9.0))
            except Exception:
                return

            # Width is an approximation used only to split concatenated labels
            # like "AB 2 PKG.AB 2 FL." into separate spatial markers.
            width = max(size * 0.5 * len(raw), size)

            fragments.append({
                "text": raw,
                "x": x,
                "y": y,
                "fontSize": size,
                "width": width,
            })

        page.extract_text(visitor_text=visitor)
        pages.append(fragments)

    return pages


def compact_layout_text(value):
    value = str(value or "").casefold()
    value = value.replace(",", ".")
    value = value.replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", "", value)


def unit_price_signature(description):
    matches = re.findall(
        r"(\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?"
        r"\s*€\s*/\s*[0-9.,]*\s*(?:kg|g|l|ml|Stk\.?|Rolle|m))",
        str(description or ""),
        flags=re.I,
    )
    return compact_layout_text(matches[-1]) if matches else ""


def _marker_x(fragment, start, end):
    text_len = max(1, len(fragment["text"]))
    center_fraction = ((start + end) / 2) / text_len
    return fragment["x"] + fragment["width"] * center_fraction


def extract_layout_markers(layout):
    quantity = []
    bundles = []

    quantity_rx = re.compile(
        r"\bAB\s+(\d+)\s*(PKG\.?|FL\.?|DS\.?|STK\.?|KISTEN?|GL\.?|TRAYS?)",
        flags=re.I,
    )
    bundle_rx = re.compile(
        r"(?<!\d)(\d{1,2})\s*\+\s*(\d{1,2})(?!\d)",
        flags=re.I,
    )

    for fragment in layout or []:
        text = fragment.get("text") or ""

        for match in quantity_rx.finditer(text):
            required = int(match.group(1))
            unit = match.group(2).rstrip(".").upper()
            quantity.append({
                "x": _marker_x(fragment, match.start(), match.end()),
                "y": fragment["y"],
                "requiredQuantity": required,
                "unit": unit,
                "raw": match.group(0),
            })

        for match in bundle_rx.finditer(text):
            paid = int(match.group(1))
            free = int(match.group(2))
            total = paid + free

            # Guard against concatenated text such as "1+12+1" becoming 1+12.
            if paid <= 0 or free <= 0 or total > 24:
                continue

            bundles.append({
                "x": _marker_x(fragment, match.start(), match.end()),
                "y": fragment["y"],
                "paidQuantity": paid,
                "freeQuantity": free,
                "requiredQuantity": total,
                "raw": match.group(0),
            })

    return quantity, bundles


def _name_tokens(name):
    return [
        token for token in normalize_name(name).split()
        if len(token) >= 2
    ]


def find_product_anchor(product, layout):
    if not layout:
        return None

    signature = unit_price_signature(product.get("description"))
    unit_candidates = []

    if signature:
        for fragment in layout:
            compact = compact_layout_text(fragment.get("text"))
            if signature in compact or compact in signature:
                unit_candidates.append(fragment)

    tokens = _name_tokens(product.get("name"))
    name_candidates = []

    if tokens:
        for fragment in layout:
            text = normalize_name(fragment.get("text"))
            if not text:
                continue

            score = 0
            if tokens[0] in text.split() or text.startswith(tokens[0]):
                score += 2
            if len(tokens) > 1 and tokens[1] in text:
                score += 2
            if len(tokens) > 2 and tokens[2] in text:
                score += 1

            if score >= 2:
                name_candidates.append((score, fragment))

    if unit_candidates and name_candidates:
        pairs = []
        for unit in unit_candidates:
            for name_score, name in name_candidates:
                dx = abs(unit["x"] - name["x"])
                dy = abs(unit["y"] - name["y"])
                if dx <= 125 and dy <= 170:
                    pairs.append((dx * 1.4 + dy - name_score * 8, unit))

        if pairs:
            return min(pairs, key=lambda item: item[0])[1]

    if len(unit_candidates) == 1:
        return unit_candidates[0]

    if name_candidates:
        name_candidates.sort(key=lambda item: (-item[0], item[1]["y"], item[1]["x"]))
        if len(name_candidates) == 1 or name_candidates[0][0] > name_candidates[1][0]:
            return name_candidates[0][1]

    return None


def spatial_distance(anchor, marker):
    dx = abs(float(anchor["x"]) - float(marker["x"]))
    dy = abs(float(anchor["y"]) - float(marker["y"]))

    if dx > 95 or dy > 120:
        return None

    return dx * 1.8 + dy


def assign_markers_to_products(products, layout, markers, blocked_products=None):
    blocked_products = set(blocked_products or [])
    anchors = {
        index: find_product_anchor(product, layout)
        for index, product in enumerate(products)
        if index not in blocked_products
    }

    marker_candidates = {}

    for marker_index, marker in enumerate(markers):
        candidates = []

        for product_index, anchor in anchors.items():
            if not anchor:
                continue

            distance = spatial_distance(anchor, marker)
            if distance is None or distance > 135:
                continue

            candidates.append((distance, product_index))

        candidates.sort(key=lambda item: item[0])

        if not candidates:
            continue

        # Require a clear winner. If two product cards are almost equally near,
        # the marker stays unresolved instead of being guessed.
        if len(candidates) > 1 and candidates[1][0] - candidates[0][0] < 20:
            continue

        marker_candidates[marker_index] = candidates[0]

    pairs = [
        (distance, marker_index, product_index)
        for marker_index, (distance, product_index) in marker_candidates.items()
    ]
    pairs.sort(key=lambda item: item[0])

    used_products = set()
    assignments = {}

    for distance, marker_index, product_index in pairs:
        if product_index in used_products:
            continue

        used_products.add(product_index)
        assignments[product_index] = markers[marker_index]

    return assignments


def quantity_unit_label(unit):
    labels = {
        "PKG": "Packungen",
        "FL": "Flaschen",
        "DS": "Dosen",
        "STK": "Stück",
        "KISTE": "Kisten",
        "KISTEN": "Kisten",
        "GL": "Gläser",
        "TRAY": "Trays",
        "TRAYS": "Trays",
    }
    return labels.get(str(unit or "").upper(), str(unit or "").upper())


def apply_spatial_conditions(products, layout, text_matched_indices):
    if not layout:
        return 0

    quantity_markers, bundle_markers = extract_layout_markers(layout)
    quantity_assignments = assign_markers_to_products(
        products,
        layout,
        quantity_markers,
        blocked_products=text_matched_indices,
    )

    newly_safe = 0

    for product_index, marker in quantity_assignments.items():
        product = products[product_index]
        required = int(marker["requiredQuantity"])

        if required <= 1 or product.get("displayPrice") is None:
            continue

        # A bundle label is only accepted when it is spatially near the same
        # product AND its total quantity agrees with the independently found
        # "AB N" marker. This avoids false parsing of concatenated labels.
        anchor = find_product_anchor(product, layout)
        compatible_bundles = []

        for bundle in bundle_markers:
            if bundle["requiredQuantity"] != required or not anchor:
                continue
            distance = spatial_distance(anchor, bundle)
            if distance is not None and distance <= 125:
                compatible_bundles.append((distance, bundle))

        bundle = min(compatible_bundles, key=lambda item: item[0])[1] if compatible_bundles else None

        product["currentPrice"] = product["displayPrice"]
        product["salePrice"] = product["displayPrice"]
        product["promotionConditionKnown"] = True
        product["optimizerEligible"] = True
        product["promotionMatchMethod"] = "pdf-position"
        product.pop("displayOnlyReason", None)

        if bundle:
            paid = bundle["paidQuantity"]
            free = bundle["freeQuantity"]
            product["promotion"] = {
                "type": "bundle",
                "label": f"{paid}+{free} gratis",
                "requiredQuantity": required,
                "paidQuantity": paid,
                "freeQuantity": free,
                "conditionUnit": marker["unit"],
                "verified": True,
                "source": "T&G Osttirol Flugblatt (Positionszuordnung)",
            }
        else:
            label_unit = quantity_unit_label(marker["unit"])
            product["promotion"] = {
                "type": "quantity",
                "label": f"ab {required} {label_unit}",
                "requiredQuantity": required,
                "conditionUnit": marker["unit"],
                "verified": True,
                "source": "T&G Osttirol Flugblatt (Positionszuordnung)",
            }

        newly_safe += 1

    return newly_safe


def stable_id(name, description):
    material = f"{name}|{description}".casefold()
    return "tg-flyer-" + hashlib.sha256(material.encode("utf-8")).hexdigest()[:20]


def normalize_name(value):
    value = str(value or "").casefold()
    value = value.replace("’", "'").replace("‘", "'")
    value = re.sub(r"[-\s]+", " ", value)
    value = re.sub(r"[^\wäöüß' ]+", "", value, flags=re.UNICODE)
    return " ".join(value.split())


def is_boundary_line(line):
    s = str(line or "").strip()
    if not s:
        return True

    if PRICE_ONLY_RX.fullmatch(s):
        return True

    if re.match(r"^\d+\s+(?:PKG|FL|KISTE|DS|STK|TRAY)\.", s, re.I):
        return True

    if re.match(r"^BEI\s+\d+", s):
        return True

    if re.match(r"^(?:AB|JE|PER)\s+", s) and s == s.upper():
        return True

    if re.match(r"^GÜLTIG", s):
        return True

    if re.fullmatch(r"\d{1,2}\.\d{2}\.\s*[–-]\s*\d{1,2}\.\d{2}\.", s):
        return True

    if re.match(r"^-\s*\d{1,2}%", s):
        return True

    if re.match(r"^\d{1,2}\+\d{1,2}", s):
        return True

    if s.upper() in {
        "TIEFKÜHLFRISCH",
        "TIEFKÜHLFRISCH TIEFKÜHLFRISCH",
        "VITAMINE",
        "PUR!",
        "DA HAST DU MEHR DAVON.",
    }:
        return True

    if re.match(r"^auf (?:alle|ESSIG|FRUCHT)", s, re.I):
        return True

    folded = s.casefold()
    if any(fragment in folded for fragment in (
        "newsletter",
        "öffnungszeiten",
        "umweltzeichen",
        "druckfehler",
        "medieninhaber",
        "www.tundg.at",
        "unbenannt-1",
    )):
        return True

    if s.startswith("tundg.atAngebote"):
        return True

    return False


def trim_leading(lines):
    result = list(lines)

    while result:
        s = result[0].strip()

        if re.fullmatch(r"\d+\s*[Ll]", s):
            result.pop(0)
            continue

        if re.match(r"^(?:exkl\.|versch\.|Einweg,)", s, re.I):
            result.pop(0)
            continue

        if is_boundary_line(s):
            result.pop(0)
            continue

        break

    if result:
        result[0] = re.sub(
            r"^\d{1,3}(?:[.,]\d{2})\s*",
            "",
            result[0],
        ).strip()

    return [line for line in result if line.strip()]


def extract_product_blocks(page_text):
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]
    blocks = []
    previous_unit_line = -1

    for index, line in enumerate(lines):
        if not UNIT_LINE_RX.search(line):
            continue

        start = previous_unit_line + 1

        for pos in range(start, index):
            if is_boundary_line(lines[pos]):
                start = pos + 1

        block = trim_leading(lines[start:index + 1])

        while block and block[0].upper() in {
            "TIEFKÜHLFRISCH",
            "TIEFKÜHLFRISCH TIEFKÜHLFRISCH",
        }:
            block.pop(0)

        if block:
            blocks.append(block)

        previous_unit_line = index

    return blocks


def split_name_description(block):
    description_start = None

    for index, line in enumerate(block):
        if MEASURE_START_RX.search(line):
            description_start = index
            break

    if description_start is None:
        description_start = max(1, len(block) - 1)

    name_lines = block[:description_start]
    description_lines = block[description_start:]

    name = ""

    for line in name_lines:
        line = re.sub(
            r"^\d{1,3}(?:[.,]\d{2})\s*",
            "",
            line,
        ).strip()

        if not line:
            continue

        if name.endswith("-"):
            name = name[:-1] + line
        else:
            name = f"{name} {line}".strip()

    description = " ".join(description_lines).strip()

    return name.strip(), description


def parse_unit_price(description):
    range_match = re.search(
        r"(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)"
        r"\s*€\s*/\s*([0-9.,]*\s*(?:kg|g|l|ml|Stk\.?|Rolle|m))",
        description,
        flags=re.I,
    )

    if range_match:
        values = sorted([
            float(range_match.group(1).replace(",", ".")),
            float(range_match.group(2).replace(",", ".")),
        ])
        return values, range_match.group(3).strip()

    match = re.search(
        r"(\d+(?:[.,]\d+)?)\s*€\s*/\s*"
        r"([0-9.,]*\s*(?:kg|g|l|ml|Stk\.?|Rolle|m))",
        description,
        flags=re.I,
    )

    if not match:
        return None, None

    return [float(match.group(1).replace(",", "."))], match.group(2).strip()


def parse_amount(description):
    multipack = re.search(
        r"(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        description,
        flags=re.I,
    )

    if multipack:
        count = int(multipack.group(1))
        quantity = float(multipack.group(2).replace(",", "."))
        unit = multipack.group(3).lower()
        total = count * quantity

        if unit == "g":
            return total, "g"
        if unit == "ml":
            return total, "ml"
        return total, unit

    range_match = re.search(
        r"(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        description,
        flags=re.I,
    )

    if range_match:
        lo, hi = sorted([
            float(range_match.group(1).replace(",", ".")),
            float(range_match.group(2).replace(",", ".")),
        ])
        return [lo, hi], range_match.group(3).lower()

    simple = re.search(
        r"(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        description,
        flags=re.I,
    )

    if simple:
        return float(simple.group(1).replace(",", ".")), simple.group(2).lower()

    if re.search(r"\bper\s+kg\b", description, flags=re.I):
        return 1, "kg"

    if re.search(r"\bper\s+stück\b", description, flags=re.I):
        return 1, "Stk"

    return 1, "Stk"


def _quantity_range_in_base_unit(description):
    multipack = re.search(
        r"(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        description,
        flags=re.I,
    )

    if multipack:
        count = int(multipack.group(1))
        quantity = float(multipack.group(2).replace(",", "."))
        unit = multipack.group(3).lower()
        total = count * quantity

        if unit == "g":
            return total / 1000, total / 1000, "kg"
        if unit == "ml":
            return total / 1000, total / 1000, "l"
        return total, total, unit

    range_match = re.search(
        r"(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        description,
        flags=re.I,
    )

    if range_match:
        lo, hi = sorted([
            float(range_match.group(1).replace(",", ".")),
            float(range_match.group(2).replace(",", ".")),
        ])
        unit = range_match.group(3).lower()

        if unit == "g":
            return lo / 1000, hi / 1000, "kg"
        if unit == "ml":
            return lo / 1000, hi / 1000, "l"
        return lo, hi, unit

    simple = re.search(
        r"(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",
        description,
        flags=re.I,
    )

    if simple:
        quantity = float(simple.group(1).replace(",", "."))
        unit = simple.group(2).lower()

        if unit == "g":
            return quantity / 1000, quantity / 1000, "kg"
        if unit == "ml":
            return quantity / 1000, quantity / 1000, "l"
        return quantity, quantity, unit

    if re.search(r"\bper\s+kg\b", description, flags=re.I):
        return 1, 1, "kg"

    if re.search(r"\bper\s+stück\b", description, flags=re.I):
        return 1, 1, "Stk"

    return None, None, None


def derive_display_price(description):
    rates, denominator = parse_unit_price(description)

    if not rates or not denominator:
        return None

    compact_denominator = denominator.casefold().replace(" ", "")

    if compact_denominator == "rolle":
        match = re.search(r"(\d+)\s*[x×]\s*\d+\s*Blatt", description, flags=re.I)
        return round(rates[0] * int(match.group(1)), 2) if match else None

    if compact_denominator == "m":
        match = re.search(
            r"(\d+(?:[.,]\d+)?)\s*m\s*x",
            description,
            flags=re.I,
        )
        if not match:
            return None
        return round(
            rates[0] * float(match.group(1).replace(",", ".")),
            2,
        )

    if compact_denominator in {"stk", "stk."}:
        return round(rates[0], 2)

    denominator_amount = 1.0
    base_unit = compact_denominator

    denominator_match = re.fullmatch(
        r"(\d+(?:[.,]\d+)?)(g|kg|ml|l)",
        compact_denominator,
        flags=re.I,
    )

    if denominator_match:
        denominator_amount = float(
            denominator_match.group(1).replace(",", ".")
        )
        base_unit = denominator_match.group(2).lower()

        if base_unit == "g":
            denominator_amount /= 1000
            base_unit = "kg"
        elif base_unit == "ml":
            denominator_amount /= 1000
            base_unit = "l"

    elif compact_denominator not in {"kg", "l"}:
        return None

    if (
        base_unit == "kg"
        and denominator_amount == 1
        and re.search(r"\b(?:per\s+kg|ca\.)", description, flags=re.I)
    ):
        return round(rates[0], 2)

    quantity_lo, quantity_hi, quantity_unit = _quantity_range_in_base_unit(
        description
    )

    if quantity_lo is None or quantity_unit != base_unit:
        return None

    if len(rates) == 1:
        return round(
            rates[0] * (quantity_lo / denominator_amount),
            2,
        )

    low_rate, high_rate = rates
    price_a = low_rate * (quantity_hi / denominator_amount)
    price_b = high_rate * (quantity_lo / denominator_amount)

    if abs(price_a - price_b) <= max(0.15, 0.03 * max(price_a, price_b)):
        return round((price_a + price_b) / 2, 2)

    return None


def extract_standalone_prices(page_text):
    result = []

    for line in page_text.splitlines():
        line = line.strip()

        if PRICE_ONLY_RX.fullmatch(line):
            result.append(float(line.replace(",", ".")))

    return result


def snap_display_price(derived, page_prices):
    if derived is None:
        return None

    if not page_prices:
        return round(derived, 2)

    nearest = min(page_prices, key=lambda value: abs(value - derived))
    tolerance = max(0.03, min(0.15, derived * 0.015))

    if abs(nearest - derived) <= tolerance:
        return round(nearest, 2)

    return round(derived, 2)


def extract_explicit_quantity_records(page_text):
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]
    records = []

    for index in range(len(lines) - 2):
        if not PRICE_ONLY_RX.fullmatch(lines[index]):
            continue

        regular = re.fullmatch(
            r"1\s+(PKG|FL|KISTE|DS|STK|TRAY)\.?\s+"
            r"(\d{1,4}(?:[.,]\d{2}))",
            lines[index + 1],
            flags=re.I,
        )

        if not regular:
            continue

        quantity = re.match(
            r"BEI\s+(\d+)\s+([A-ZÄÖÜ]+)",
            lines[index + 2],
            flags=re.I,
        )

        if not quantity:
            continue

        sale_price = float(lines[index].replace(",", "."))
        regular_price = float(regular.group(2).replace(",", "."))
        required = int(quantity.group(1))
        unit = regular.group(1).upper()

        paid = required
        bundle = None

        if regular_price > 0 and required > 0:
            estimated_paid = round(required * sale_price / regular_price)
            predicted = (
                regular_price * estimated_paid / required
                if estimated_paid > 0
                else sale_price
            )

            if (
                0 < estimated_paid < required
                and abs(predicted - sale_price)
                <= max(0.03, sale_price * 0.03)
            ):
                paid = estimated_paid
                bundle = (paid, required - paid)

        records.append({
            "salePrice": round(sale_price, 2),
            "regularPrice": round(regular_price, 2),
            "requiredQuantity": required,
            "unit": unit,
            "bundle": bundle,
        })

    return records


def _unit_match_score(product, record):
    text = f"{product['name']} {product['description']}".casefold()
    unit = record["unit"]

    score = 0

    if unit == "KISTE":
        score += 4 if "kiste" in text else -3

    elif unit == "DS":
        score += 3 if "dose" in text else -2

    elif unit == "TRAY":
        score += 3 if "tray" in text else 0
        score += 1 if "mineralwasser" in text else 0

    elif unit == "FL":
        beverage_words = (
            "wein", "prosecco", "vodka", "sirup", "mineralwasser",
            "eistee", "lillet", "lugana", "saft", "alco pops",
        )
        score += 2 if any(word in text for word in beverage_words) else 0
        score -= 2 if ("pack" in text and "flasche" not in text) else 0

    return score


def match_quantity_records(products, records):
    assigned = {}
    used_products = set()

    for record in records:
        candidates = []

        for index, product in enumerate(products):
            if index in used_products:
                continue

            price = product.get("displayPrice")
            if price is None or abs(price - record["salePrice"]) > 0.02:
                continue

            candidates.append((
                _unit_match_score(product, record),
                index,
            ))

        if not candidates:
            continue

        candidates.sort(reverse=True)

        if len(candidates) == 1 or candidates[0][0] > candidates[1][0]:
            index = candidates[0][1]
            assigned[index] = record
            used_products.add(index)

    return assigned


def extract_validity(page_texts):
    combined = "\n".join(page_texts)

    match = re.search(
        r"(?:ab\s+\w+,\s*)?"
        r"(\d{1,2})\.(\d{1,2})\.(\d{4})"
        r"\s+bis\s+(?:\w+,\s*)?"
        r"(\d{1,2})\.(\d{1,2})\.(\d{4})",
        combined,
        flags=re.I,
    )

    if match:
        start = date(
            int(match.group(3)),
            int(match.group(2)),
            int(match.group(1)),
        )
        end = date(
            int(match.group(6)),
            int(match.group(5)),
            int(match.group(4)),
        )
        return start.isoformat(), end.isoformat()

    compact = re.search(
        r"(\d{1,2})\.(\d{1,2})\.\s*[–-]\s*"
        r"(\d{1,2})\.(\d{1,2})\.(\d{4})",
        combined,
    )

    if compact:
        year = int(compact.group(5))
        start = date(year, int(compact.group(2)), int(compact.group(1)))
        end = date(year, int(compact.group(4)), int(compact.group(3)))
        return start.isoformat(), end.isoformat()

    return None, None


def extract_category_actions(page_text, page_number, valid_from, valid_until):
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]
    result = []

    for index, line in enumerate(lines):
        match = re.match(
            r"^-\s*(\d{1,2})\s*%\s+auf\s+(.+)$",
            line,
            flags=re.I,
        )

        if match:
            percent = int(match.group(1))
            category = match.group(2).strip()

            if category.casefold() in {"alle", "alle artikel von"}:
                category = ""

            look = index + 1
            while look < len(lines) and len(category) < 60:
                next_line = lines[look]

                if is_boundary_line(next_line) or UNIT_LINE_RX.search(next_line):
                    break

                if PRICE_ONLY_RX.fullmatch(next_line):
                    break

                if next_line.upper() != next_line:
                    break

                category = f"{category} {next_line}".strip()
                look += 1

            if category:
                result.append({
                    "store": "tg",
                    "remoteObjectId": stable_id(
                        f"-{percent}% {category}",
                        f"category-page-{page_number}",
                    ),
                    "retailerProductId": stable_id(
                        f"-{percent}% {category}",
                        f"category-page-{page_number}",
                    ),
                    "sourceKind": "flyer",
                    "kind": "category",
                    "name": category,
                    "description": f"-{percent} % auf {category}",
                    "page": page_number,
                    "amount": 1,
                    "unit": "Stk",
                    "displayPrice": None,
                    "currentPrice": None,
                    "regularPrice": None,
                    "salePrice": None,
                    "unitPrice": None,
                    "unitPriceUnit": None,
                    "validFrom": valid_from,
                    "validUntil": valid_until,
                    "promotionVerified": True,
                    "promotionConditionKnown": True,
                    "optimizerEligible": False,
                    "promotion": {
                        "type": "percentage",
                        "label": f"-{percent} % auf {category}",
                        "discountPercent": percent,
                        "verified": True,
                        "source": "T&G Osttirol Flugblatt",
                    },
                    "source": "T&G Osttirol Flugblatt",
                })

    return result


def build_page_products(
    page_text,
    page_number,
    viewer_url,
    pdf_url,
    valid_from,
    valid_until,
    page_layout=None,
):
    page_prices = extract_standalone_prices(page_text)
    products = []

    for block in extract_product_blocks(page_text):
        name, description = split_name_description(block)

        if not name or len(name) < 2:
            continue

        derived = derive_display_price(description)
        display_price = snap_display_price(derived, page_prices)

        if display_price is None:
            continue

        amount, unit = parse_amount(description)
        unit_rates, unit_rate_unit = parse_unit_price(description)

        unit_price = (
            round(unit_rates[0], 2)
            if unit_rates and len(unit_rates) == 1
            else None
        )

        product_id = stable_id(name, description)

        products.append({
            "store": "tg",
            "remoteObjectId": product_id,
            "retailerProductId": product_id,
            "sourceKind": "flyer",
            "kind": "product",
            "name": name,
            "description": description,
            "page": page_number,
            "amountText": description,
            "amount": amount,
            "unit": unit,
            "displayPrice": display_price,
            "currentPrice": None,
            "regularPrice": None,
            "salePrice": None,
            "unitPrice": unit_price,
            "unitPriceUnit": unit_rate_unit,
            "validFrom": valid_from,
            "validUntil": valid_until,
            "promotionVerified": True,
            "promotionConditionKnown": False,
            "optimizerEligible": False,
            "displayOnlyReason": (
                "Flugblattpreis erkannt, Aktionsbedingung aber nicht "
                "eindeutig diesem Produkt zugeordnet."
            ),
            "promotion": {
                "type": "flyer",
                "label": "Flugblatt-Aktion",
                "verified": True,
                "source": "T&G Osttirol Flugblatt",
            },
            "source": "T&G Osttirol Flugblatt",
            "sourceUrl": viewer_url,
            "pdfUrl": pdf_url,
        })

    records = extract_explicit_quantity_records(page_text)
    matched = match_quantity_records(products, records)

    for index, record in matched.items():
        product = products[index]

        product["currentPrice"] = product["displayPrice"]
        product["salePrice"] = product["displayPrice"]
        product["regularPrice"] = record["regularPrice"]
        product["promotionConditionKnown"] = True
        product["optimizerEligible"] = True
        product["promotionMatchMethod"] = "pdf-text"
        product.pop("displayOnlyReason", None)

        bundle = record.get("bundle")

        if bundle:
            paid, free = bundle
            label = f"{paid}+{free} gratis"
            promotion_type = "bundle"
        else:
            label = f"bei {record['requiredQuantity']} Stück"
            promotion_type = "quantity"
            paid = None
            free = None

        promotion = {
            "type": promotion_type,
            "label": label,
            "requiredQuantity": record["requiredQuantity"],
            "verified": True,
            "source": "T&G Osttirol Flugblatt",
        }

        if bundle:
            promotion["paidQuantity"] = paid
            promotion["freeQuantity"] = free

        product["promotion"] = promotion

    spatial_matched = apply_spatial_conditions(
        products,
        page_layout,
        text_matched_indices=set(matched.keys()),
    )

    return products, len(matched), spatial_matched


def merge_history(item, previous):
    history = []
    seen = set()

    if isinstance(previous, dict):
        for entry in previous.get("history") or []:
            if not isinstance(entry, dict):
                continue

            d = str(entry.get("date") or "")
            p = number(entry.get("price"))

            if not d or p is None:
                continue

            key = (d, round(p, 2))
            if key in seen:
                continue

            seen.add(key)
            history.append({"date": d, "price": round(p, 2)})

    price = item.get("salePrice")
    if price is None:
        price = item.get("displayPrice")

    if price is not None:
        d = local_today().isoformat()
        key = (d, round(float(price), 2))

        if key not in seen:
            history.append({"date": d, "price": key[1]})

    history.sort(key=lambda entry: entry["date"])
    item["history"] = history[-250:]


def load_status():
    try:
        payload = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return payload
    except Exception:
        pass

    return {"schemaVersion": 1, "updatedAt": None, "stores": {}}


def update_status(
    state,
    flyer_count,
    linkable_count,
    error=None,
):
    status = load_status()
    status.setdefault("stores", {}).setdefault("tg", {})
    status["stores"]["tg"]["flyer"] = {
        "status": state,
        "productCount": flyer_count,
        "linkableCount": linkable_count,
        "updatedAt": now_iso(),
        "error": error,
        "source": "T&G Osttirol Flugblatt",
    }

    STATUS_PATH.write_text(
        json.dumps(status, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    if not DATA_PATH.exists():
        raise RuntimeError("data/tg.json fehlt.")

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    existing_products = payload.get("products") or []

    previous_flyer = {
        str(item.get("retailerProductId")): item
        for item in existing_products
        if isinstance(item, dict)
        and item.get("sourceKind") == "flyer"
        and item.get("retailerProductId")
    }

    previous_flyer_count = int(payload.get("flyerProductCount") or 0)

    flyer = payload.get("flyer") or {}
    viewer_url = str(flyer.get("url") or "").strip()

    if not viewer_url:
        raise RuntimeError("Kein T&G-Osttirol-Flugblatt-Link in data/tg.json.")

    try:
        pdf_url = download_pdf(viewer_url)
        page_texts = extract_page_texts(TMP_PDF)

        try:
            page_layouts = extract_page_layouts(TMP_PDF)
        except Exception as layout_error:
            print(
                f"WARNUNG: PDF-Positionsdaten konnten nicht gelesen werden: {layout_error}",
                file=sys.stderr,
            )
            page_layouts = [None] * len(page_texts)

        valid_from, valid_until = extract_validity(page_texts)

        flyer_products = []
        text_linkable = 0
        spatial_linkable = 0

        for page_number, page_text in enumerate(page_texts, start=1):
            page_layout = (
                page_layouts[page_number - 1]
                if page_number - 1 < len(page_layouts)
                else None
            )

            products, text_matched, spatial_matched = build_page_products(
                page_text,
                page_number,
                viewer_url,
                pdf_url,
                valid_from,
                valid_until,
                page_layout=page_layout,
            )
            flyer_products.extend(products)
            text_linkable += text_matched
            spatial_linkable += spatial_matched

            flyer_products.extend(
                extract_category_actions(
                    page_text,
                    page_number,
                    valid_from,
                    valid_until,
                )
            )

        unique = []
        seen_ids = set()

        for item in flyer_products:
            product_id = str(item.get("retailerProductId") or "")
            if not product_id or product_id in seen_ids:
                continue

            seen_ids.add(product_id)
            merge_history(item, previous_flyer.get(product_id))
            unique.append(item)

        flyer_products = unique

        priced_flyer = [
            item for item in flyer_products
            if item.get("displayPrice") is not None
        ]

        if len(priced_flyer) < MIN_FLYER_PRODUCTS:
            raise RuntimeError(
                f"Unplausibel wenige T&G-Flugblattprodukte "
                f"({len(priced_flyer)})."
            )

        specials = [
            item for item in existing_products
            if not isinstance(item, dict)
            or item.get("sourceKind") != "flyer"
        ]

        special_names = {
            normalize_name(item.get("name"))
            for item in specials
            if isinstance(item, dict) and item.get("name")
        }

        merged_flyer = [
            item for item in flyer_products
            if normalize_name(item.get("name")) not in special_names
        ]

        combined = specials + merged_flyer

        payload["products"] = combined
        payload["updatedAt"] = now_iso()
        payload["promotionCount"] = len(combined)
        payload["productCount"] = sum(
            1 for item in combined
            if isinstance(item, dict)
            and (
                item.get("salePrice") is not None
                or item.get("displayPrice") is not None
            )
        )
        payload["linkableCount"] = sum(
            1 for item in combined
            if isinstance(item, dict)
            and item.get("optimizerEligible") is True
            and item.get("salePrice") is not None
        )
        payload["flyerProductCount"] = len(priced_flyer)
        payload["flyerLinkableCount"] = text_linkable + spatial_linkable
        payload["flyerTextLinkableCount"] = text_linkable
        payload["flyerSpatialLinkableCount"] = spatial_linkable
        payload["flyerUpdatedAt"] = now_iso()
        payload["flyerStale"] = False
        payload.pop("flyerLastError", None)

        payload["flyer"] = {
            **flyer,
            "pdfUrl": pdf_url,
            "validFrom": valid_from,
            "validUntil": valid_until,
            "pageCount": len(page_texts),
        }

        payload["validFrom"] = valid_from or payload.get("validFrom")
        payload["validUntil"] = valid_until or payload.get("validUntil")

        temp = DATA_PATH.with_suffix(".json.tmp")
        temp.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        temp.replace(DATA_PATH)

        update_status(
            "ok",
            len(priced_flyer),
            text_linkable + spatial_linkable,
        )

        print("=== T&G OSTTIROL FLUGBLATT-IMPORT ===")
        print(f"PDF-Seiten: {len(page_texts)}")
        print(f"Flugblattprodukte mit erkanntem Preis: {len(priced_flyer)}")
        print(f"Sicher über Textstruktur zugeordnet: {text_linkable}")
        print(f"Zusätzlich über PDF-Positionen zugeordnet: {spatial_linkable}")
        print(f"Insgesamt sicher verknüpfbar: {text_linkable + spatial_linkable}")
        print(
            "Weitere Flugblattpreise werden in der App angezeigt, "
            "aber aus Sicherheitsgründen noch nicht für den Optimierer verwendet."
        )
        print(f"Gültigkeit: {valid_from or '—'} bis {valid_until or '—'}")
        print(f"Gesamte T&G-Einträge nach Zusammenführung: {len(combined)}")
        return 0

    except Exception as exc:
        if previous_flyer_count >= MIN_FLYER_PRODUCTS:
            payload["flyerStale"] = True
            payload["flyerLastError"] = str(exc)

            temp = DATA_PATH.with_suffix(".json.tmp")
            temp.write_text(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
                encoding="utf-8",
            )
            temp.replace(DATA_PATH)

            update_status(
                "stale",
                previous_flyer_count,
                int(payload.get("flyerLinkableCount") or 0),
                error=str(exc),
            )

            print(
                f"WARNUNG: T&G-Flugblatt konnte nicht aktualisiert werden. "
                f"{previous_flyer_count} zuletzt erkannte Flugblattprodukte "
                f"bleiben erhalten. Fehler: {exc}",
                file=sys.stderr,
            )
            return 0

        update_status(
            "error",
            0,
            0,
            error=str(exc),
        )

        print(f"FEHLER: {exc}", file=sys.stderr)
        return 1

    finally:
        try:
            TMP_PDF.unlink(missing_ok=True)
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
