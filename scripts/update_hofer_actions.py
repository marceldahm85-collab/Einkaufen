#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import math
import re
import sys
import time
from datetime import datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "hofer.json"
ACTION_URL = "https://www.hofer.at/angebote"
SOURCE_HOST = "www.hofer.at"
USER_AGENT = "Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0"
MIN_EXPECTED_PRODUCTS = 100
MIN_EXPECTED_ACTIONS = 20
MAX_ACTION_AGE_DAYS = 21

def now_iso():
    return datetime.now(ZoneInfo("Europe/Vienna")).replace(microsecond=0).isoformat()

def today_local():
    return datetime.now(ZoneInfo("Europe/Vienna")).date()

def number(value):
    try:
        if value is None: return None
        value=float(str(value).replace("€","").replace(" ","").replace("\xa0","").replace(",","."))
        return value if math.isfinite(value) else None
    except (TypeError,ValueError):
        return None

def normalize_space(value):
    return re.sub(r"\s+"," ",html.unescape(str(value or "")).replace("\xa0"," ")).strip()

def normalize_name(value):
    return normalize_space(value).casefold()

def id_variants(value):
    text=str(value or "").strip()
    if not text: return set()
    digits=re.sub(r"\D+","",text)
    out={text.casefold()}
    if digits:
        out.update({digits,digits.lstrip("0") or "0"})
        if len(digits)>=6: out.update({digits[-6:],"00-"+digits[-6:]})
        if len(digits)>=8: out.add(digits[-10:])
    return out

def fetch_html(url, attempts=4):
    headers={
        "Accept":"text/html,application/xhtml+xml",
        "Accept-Language":"de-AT,de;q=0.9,en;q=0.7",
        "Accept-Encoding":"identity",
        "Cache-Control":"no-cache",
        "Referer":"https://www.hofer.at/",
        "User-Agent":USER_AGENT,
    }
    last=None
    for attempt in range(attempts):
        try:
            req=Request(url,headers=headers)
            with urlopen(req,timeout=90) as response:
                raw=response.read()
                encoding=response.headers.get_content_charset() or "utf-8"
                text=raw.decode(encoding,errors="replace")
                if len(text)<10000:
                    raise RuntimeError(f"HOFER-Angebotsseite ist unplausibel klein ({len(text)} Zeichen)")
                return text
        except Exception as exc:
            last=exc
            if attempt+1<attempts: time.sleep(2**attempt)
    raise RuntimeError(f"HOFER-Angebotsseite konnte nicht abgerufen werden: {last}")

class Node:
    __slots__=("tag","attrs","parent","children","text_parts","deleted_parts","deleted")
    def __init__(self,tag="document",attrs=None,parent=None,deleted=False):
        self.tag=tag; self.attrs=dict(attrs or []); self.parent=parent
        self.children=[]; self.text_parts=[]; self.deleted_parts=[]; self.deleted=deleted
    def text(self):
        parts=list(self.text_parts)
        for child in self.children: parts.append(child.text())
        return normalize_space(" ".join(parts))
    def deleted_text(self):
        parts=list(self.deleted_parts)
        for child in self.children: parts.append(child.deleted_text())
        return normalize_space(" ".join(parts))

class HoferHTMLParser(HTMLParser):
    VOID_TAGS={"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    DELETED_TAGS={"del","s","strike"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root=Node()
        self.stack=[self.root]
    def handle_starttag(self,tag,attrs):
        parent=self.stack[-1]
        deleted=parent.deleted or tag.lower() in self.DELETED_TAGS
        node=Node(tag,attrs,parent,deleted)
        for key in ("alt","aria-label","title"):
            value=node.attrs.get(key)
            if value:
                (node.deleted_parts if deleted else node.text_parts).append(str(value))
        parent.children.append(node)
        if tag.lower() not in self.VOID_TAGS: self.stack.append(node)
    def handle_startendtag(self,tag,attrs):
        parent=self.stack[-1]
        deleted=parent.deleted or tag.lower() in self.DELETED_TAGS
        node=Node(tag,attrs,parent,deleted)
        for key in ("alt","aria-label","title"):
            value=node.attrs.get(key)
            if value:
                (node.deleted_parts if deleted else node.text_parts).append(str(value))
        parent.children.append(node)
    def handle_endtag(self,tag):
        tag=tag.lower()
        for idx in range(len(self.stack)-1,0,-1):
            if self.stack[idx].tag.lower()==tag:
                del self.stack[idx:]; return
    def handle_data(self,data):
        if not data: return
        (self.stack[-1].deleted_parts if self.stack[-1].deleted else self.stack[-1].text_parts).append(data)

def iter_nodes(node):
    for child in node.children:
        yield child
        yield from iter_nodes(child)

def absolute_url(href):
    return urljoin(ACTION_URL,html.unescape(str(href or "").strip()))

def product_id_from_url(url):
    matches=re.findall(r"(?:^|/)(\d{6,})(?:$|/)",urlparse(url).path)
    return matches[-1] if matches else None

def unit_from_text(text):
    m=re.search(r"(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b",text,re.I)
    return (number(m.group(1)),m.group(2).lower()) if m else (None,None)

def unit_price_from_text(text):
    m=re.search(r"€\s*(\d{1,4}(?:[.,]\d{2}))\s*/\s*(?:(\d+(?:[.,]\d+)?)\s*)?(kg|g|l|ml|stk|stück|pro\s+stück)\b",text,re.I)
    if not m: return None,None
    price=number(m.group(1)); base=number(m.group(2)) or 1.0
    unit=m.group(3).lower().replace("pro ","")
    if price is None: return None,None
    if unit=="g": return round(price*(1000/base),2),"kg"
    if unit=="ml": return round(price*(1000/base),2),"l"
    return round(price/base,2),("Stk" if unit in {"stk","stück"} else unit)

def visible_prices(text):
    out=[]
    for m in re.finditer(r"€\s*(\d{1,4}(?:[.,]\d{2}))",text):
        value=number(m.group(1))
        if value is not None: out.append(value)
    return out

def clean_offer_name(body):
    body=re.sub(r"\([^)]*€/[^)]*\)","",body)
    body=re.sub(r"\bTiefpreisaktion\b","",body,flags=re.I)
    body=re.sub(r"€\s*\d{1,4}(?:[.,]\d{2}).*$","",body).strip()
    amount_match=re.search(r"\b\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml)\b",body,re.I)
    if amount_match: body=body[:amount_match.start()].strip()
    body=re.sub(r"[¹²³⁴⁵⁶⁷⁸⁹˒]+"," ",body)
    return normalize_space(body).strip(" -–")

def parse_action_card(text,today=None):
    text=normalize_space(text)
    if not text: return None
    today=today or today_local()
    m=re.search(r"Verfügbar\s+(?:seit|ab)\s+(\d{2})\.(\d{2})\.(\d{4})",text,re.I)
    if not m: return None
    try: start=datetime(int(m.group(3)),int(m.group(2)),int(m.group(1))).date()
    except ValueError: return None
    if start>today or start<today-timedelta(days=MAX_ACTION_AGE_DAYS): return None
    if re.search(r"\bONLINESHOP\b",text[:140],re.I): return None
    body=text[m.end():].strip()
    price_text=re.sub(r"\([^)]*€\s*[^)]*/[^)]*\)","",body)
    prices=visible_prices(price_text)
    if not prices: return None
    sale=prices[0]
    if sale<=0: return None
    amount,unit=unit_from_text(body)
    unit_price,unit_price_unit=unit_price_from_text(body)
    name=clean_offer_name(body)
    if not name: return None
    is_tiefpreis=bool(re.search(r"\bTiefpreisaktion\b",text,re.I))
    bundle=re.search(r"\b(\d+)\s*\+\s*(\d+)\b",name)
    promotion={
        "type":"price_drop",
        "label":"Tiefpreisaktion" if is_tiefpreis else "HOFER Aktion",
        "officialLabel":"Tiefpreisaktion" if is_tiefpreis else "HOFER Aktion",
        "verified":True,"source":ACTION_URL,"loyaltyRequired":False
    }
    if bundle:
        paid,free=int(bundle.group(1)),int(bundle.group(2))
        if paid>=1 and free>=1:
            promotion={
                "type":"bundle","paidQuantity":paid,"freeQuantity":free,
                "requiredQuantity":paid+free,"label":f"{paid}+{free} gratis",
                "officialLabel":f"{paid}+{free} Aktion","verified":True,
                "source":ACTION_URL,"loyaltyRequired":False
            }
    return {"name":name,"amount":amount,"unit":unit,"salePrice":round(sale,2),
            "unitPrice":unit_price,"unitPriceUnit":unit_price_unit,
            "promotion":promotion,"validFrom":start.isoformat()}

def ancestors(node,depth=12):
    out=[]; cur=node.parent
    for _ in range(depth):
        if cur is None: break
        out.append(cur); cur=cur.parent
    return out

def unique_product_links(node):
    result=set()
    for d in iter_nodes(node):
        if d.tag.lower()!="a": continue
        href=absolute_url(d.attrs.get("href"))
        if href and "/produkt/" in urlparse(href).path.lower():
            result.add(href.split("?",1)[0])
    return result

def candidate_nodes(html_text):
    parser=HoferHTMLParser(); parser.feed(html_text); parser.close()
    for anchor in iter_nodes(parser.root):
        if anchor.tag.lower()!="a": continue
        href=absolute_url(anchor.attrs.get("href"))
        if not href or SOURCE_HOST not in urlparse(href).netloc: continue
        if "/produkt/" not in urlparse(href).path.lower(): continue
        yield anchor,href

def best_card_text(anchor):
    own=anchor.text()
    if len(own)>=25 and "Verfügbar" in own: return own
    for ancestor in ancestors(anchor):
        if len(unique_product_links(ancestor))!=1: continue
        text=ancestor.text()
        if len(text)>=25 and "Verfügbar" in text: return text
    return None

def find_existing_product(products,action_id,action_name):
    id_keys=id_variants(action_id); name_key=normalize_name(action_name)
    for product in products:
        ids=set()
        for key in (product.get("retailerProductId"),product.get("remoteObjectId")): ids.update(id_variants(key))
        if id_keys.intersection(ids): return product
    for product in products:
        if normalize_name(product.get("name"))==name_key: return product
    return None

def clear_old_promotions(products):
    for product in products:
        if product.get("promotionVerified") is True or product.get("promotion"):
            product["salePrice"]=None
            product["promotion"]=None
            product["promotionVerified"]=False
            product["promotionObservedAt"]=None
            product["validFrom"]=None
            product["validUntil"]=None
            product["optimizerEligible"]=False

def apply_action(product,action,source_url):
    product["salePrice"]=action["salePrice"]
    product["promotion"]=action["promotion"]
    product["promotionVerified"]=True
    product["promotionObservedAt"]=now_iso()
    product["validFrom"]=action["validFrom"]
    product["validUntil"]=None
    product["promotionSource"]=ACTION_URL
    product["promotionProductUrl"]=source_url
    product["actionLabel"]=action["promotion"].get("officialLabel") or action["promotion"].get("label")
    if action.get("unitPrice") is not None:
        product["unitPrice"]=action["unitPrice"]
        product["unitPriceUnit"]=action.get("unitPriceUnit")
    if action.get("amount") is not None and action.get("unit"):
        product["amount"]=action["amount"]; product["unit"]=action["unit"]
        product["packageAmount"]=action["amount"]; product["packageUnit"]=action["unit"]
        product["packageAmountKnown"]=True
    product["optimizerEligible"]=bool(action.get("amount") is not None and action.get("unit") and action["salePrice"] is not None)

def main():
    if not DATA_PATH.exists(): raise SystemExit("data/hofer.json fehlt – zuerst HOFER-Grundpreise importieren.")
    payload=json.loads(DATA_PATH.read_text(encoding="utf-8"))
    products=payload.get("products") or []
    if not isinstance(products,list) or len(products)<MIN_EXPECTED_PRODUCTS:
        raise SystemExit("data/hofer.json ist leer oder unplausibel klein.")
    try:
        source_html=fetch_html(ACTION_URL)
        actions=[]; seen=set()
        for anchor,href in candidate_nodes(source_html):
            card=best_card_text(anchor)
            if not card: continue
            action=parse_action_card(card)
            if not action: continue
            product_id=product_id_from_url(href)
            key=product_id or normalize_name(action["name"])
            if key in seen: continue
            seen.add(key)
            actions.append({"id":product_id,"url":href,**action})
        if len(actions)<MIN_EXPECTED_ACTIONS:
            raise RuntimeError(f"Unplausibel wenige HOFER-Aktionsartikel erkannt: {len(actions)}")
        clear_old_promotions(products)
        matched=appended=0
        for action in actions:
            product=find_existing_product(products,action.get("id"),action["name"])
            if product is None:
                action_id=action.get("id") or ("action-"+str(abs(hash(action["name"]))))
                product={
                    "store":"hofer","remoteObjectId":action_id,"retailerProductId":action_id,
                    "name":action["name"],"description":"",
                    "amount":action.get("amount") if action.get("amount") is not None else 1,
                    "unit":action.get("unit") or "Stk",
                    "currentPrice":action["salePrice"],"unitPrice":action.get("unitPrice"),
                    "unitPriceUnit":action.get("unitPriceUnit"),
                    "source":"hofer.at (Aktuelle Angebote)","history":[]
                }
                products.append(product); appended+=1
            else:
                matched+=1
            apply_action(product,action,action["url"])
        payload["productCount"]=len(products)
        payload["promotionCount"]=len(actions)
        payload["promotionUpdatedAt"]=now_iso()
        payload["promotionObservedAt"]=now_iso()
        payload["promotionSource"]=ACTION_URL
        payload["promotionStale"]=False
        payload["promotionLastError"]=None
        payload["promotionParserVersion"]=1
        serialized = json.dumps(payload,ensure_ascii=False,separators=(",",":"))+ "\n"
        temp_path = DATA_PATH.with_suffix(".json.tmp")
        temp_path.write_text(serialized,encoding="utf-8")
        with temp_path.open("r",encoding="utf-8") as fh:
            json.load(fh)
        temp_path.replace(DATA_PATH)
        print(f"HOFER-Aktionen: {len(actions)} erkannt; {matched} bestehende Produkte aktualisiert; {appended} Aktionsprodukte ergänzt.")
        return 0
    except Exception as exc:
        payload["promotionStale"]=True
        payload["promotionLastError"]=str(exc)
        serialized = json.dumps(payload,ensure_ascii=False,separators=(",",":"))+ "\n"
        temp_path = DATA_PATH.with_suffix(".json.tmp")
        temp_path.write_text(serialized,encoding="utf-8")
        with temp_path.open("r",encoding="utf-8") as fh:
            json.load(fh)
        temp_path.replace(DATA_PATH)
        print(f"WARNUNG: HOFER-Aktionen konnten nicht frisch importiert werden: {exc}",file=sys.stderr)
        return 0

if __name__=="__main__":
    raise SystemExit(main())
