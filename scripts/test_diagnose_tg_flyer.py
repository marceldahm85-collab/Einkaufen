import importlib.util
from pathlib import Path

path = Path(__file__).with_name("diagnose_tg_flyer.py")
spec = importlib.util.spec_from_file_location("diagnose_tg_flyer", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

split = (
    "https://brochures.mpreis.at/flugblatt/tundg/osttirol/2026/kw35/docs/"
    "T-G_KW35_36_2026_Osttirol_[*,2,true].pdf?reload=1787207674206"
)
expected = (
    "https://brochures.mpreis.at/flugblatt/tundg/osttirol/2026/kw35/docs/"
    "T-G_KW35_36_2026_Osttirol.pdf?reload=1787207674206"
)

assert mod.normalize_flowpaper_pdf_url(split) == expected

img = (
    "https://brochures.mpreis.at/x/docs/"
    "T-G_KW35_36_2026_Osttirol.pdf_{page}.jpg?reload=1"
)
assert mod.normalize_flowpaper_pdf_url(img) == (
    "https://brochures.mpreis.at/x/docs/"
    "T-G_KW35_36_2026_Osttirol.pdf?reload=1"
)

jsn = (
    "https://brochures.mpreis.at/x/docs/"
    "T-G_KW35_36_2026_Osttirol.pdf_{page}.bin?reload=1"
)
assert mod.normalize_flowpaper_pdf_url(jsn) == (
    "https://brochures.mpreis.at/x/docs/"
    "T-G_KW35_36_2026_Osttirol.pdf?reload=1"
)

assert mod.is_demo_pdf_url("https://mydomain.com/abc.pdf") is True
assert mod.is_demo_pdf_url(expected) is False

html = """
<script>
PDFFile : 'docs/T-G_KW35_36_2026_Osttirol_[*,2,true].pdf?reload=9',
IMGFiles : 'docs/T-G_KW35_36_2026_Osttirol.pdf_{page}.jpg?reload=9',
JSONFile : 'docs/T-G_KW35_36_2026_Osttirol.pdf_{page}.bin?reload=9',
var demo='https://mydomain.com/abc.pdf';
</script>
"""

items = mod.extract_pdf_candidates(
    html,
    "https://brochures.mpreis.at/flugblatt/tundg/osttirol/2026/kw35/index.html"
)

assert len(items) == 1
assert items[0].endswith(
    "/docs/T-G_KW35_36_2026_Osttirol.pdf?reload=9"
)

print("OK")
