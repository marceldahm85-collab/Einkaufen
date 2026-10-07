#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "lidl.json"
SOURCE_URL = "https://heisse-preise.io/data/latest-canonical.json"
MIN_EXPECTED_PRODUCTS = 100


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")


def number(value):
    try:
        n=float(value)
        return n if math.isfinite(n) else None
    except (TypeError,ValueError):
        return None


def fetch_json(url, attempts=4):
    headers={"Accept":"application/json","User-Agent":"Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0"}
    last=None
    for attempt in range(attempts):
        try:
            req=urllib.request.Request(url,headers=headers)
            with urllib.request.urlopen(req,timeout=90) as response:
                return json.load(response)
        except Exception as exc:
            last=exc
            if attempt+1<attempts: time.sleep(2**attempt)
    raise RuntimeError(f"Rohdaten-Abruf fehlgeschlagen: {last}")


def stable_id(item):
    material="|".join([str(item.get("store") or ""),str(item.get("name") or ""),str(item.get("quantity") or ""),str(item.get("unit") or ""),str(item.get("description") or "")])
    return "hp-"+hashlib.sha256(material.encode()).hexdigest()[:20]


def normalize_unit(raw):
    unit=str(raw or "stk").strip().lower()
    return {"stk":"Stk","st":"Stk","stück":"Stk","pcs":"Stk","pc":"Stk","g":"g","kg":"kg","ml":"ml","l":"l"}.get(unit,unit or "Stk")


def base_unit(unit):
    if unit in {"g","kg"}: return "kg"
    if unit in {"ml","l"}: return "l"
    return "Stk"


def calc_unit_price(price,quantity,unit):
    price=number(price); quantity=number(quantity)
    if price is None or quantity is None or quantity<=0: return None
    if unit=="g": return round(price/(quantity/1000),2)
    if unit=="kg": return round(price/quantity,2)
    if unit=="ml": return round(price/(quantity/1000),2)
    if unit=="l": return round(price/quantity,2)
    if unit=="Stk": return round(price/quantity,2)
    return None


def normalize_history(raw,current):
    out=[]; seen=set()
    for entry in raw or []:
        if not isinstance(entry,dict): continue
        date=str(entry.get("date") or "").strip(); price=number(entry.get("price"))
        if not date or price is None: continue
        key=(date,round(price,2))
        if key in seen: continue
        seen.add(key); out.append({"date":date,"price":round(price,2)})
    out.sort(key=lambda x:x["date"])
    if not out and current is not None:
        out.append({"date":datetime.now(timezone.utc).date().isoformat(),"price":round(current,2)})
    return out[-250:]


def is_lidl_store(value):
    key = "".join(ch for ch in str(value or "").casefold() if ch.isalnum())
    return key in {"lidl", "lidlat", "lidlosterreich", "lidlösterreich"} or key.startswith("lidl")


def normalize_item(item):
    if not is_lidl_store(item.get("store")): return None
    name=str(item.get("name") or "").strip(); price=number(item.get("price"))
    if not name or price is None: return None
    quantity=number(item.get("quantity"))
    if quantity is None or quantity<=0: quantity=1.0
    unit=normalize_unit(item.get("unit"))
    raw_id=item.get("id") or item.get("productId") or item.get("code") or item.get("sku")
    product_id=str(raw_id).strip() if raw_id is not None else ""
    if not product_id: product_id=stable_id(item)
    description=str(item.get("description") or "").strip()
    amount=int(quantity) if float(quantity).is_integer() else round(quantity,3)
    return {
        "store":"lidl","remoteObjectId":product_id,"retailerProductId":product_id,
        "name":name,"description":description,"amount":amount,"unit":unit,
        "currentPrice":round(price,2),"unitPrice":calc_unit_price(price,quantity,unit),
        "unitPriceUnit":base_unit(unit),"weighted":bool(item.get("isWeighted",False)),
        "bio":bool(item.get("bio",False)),"source":"heisse-preise.io (Lidl)",
        "history":normalize_history(item.get("priceHistory"),price)
    }


def main():
    raw=fetch_json(SOURCE_URL)
    if not isinstance(raw,list): raise RuntimeError("Heisse-Preise-Datenformat unerwartet.")
    products=[p for item in raw if (p:=normalize_item(item))]
    if len(products)<MIN_EXPECTED_PRODUCTS:
        store_counts={}
        for item in raw:
            if isinstance(item,dict):
                key=str(item.get("store") or "").strip()
                if key:
                    store_counts[key]=store_counts.get(key,0)+1
        top=", ".join(f"{key}={count}" for key,count in sorted(store_counts.items(), key=lambda x:x[1], reverse=True)[:20])
        raise RuntimeError(f"Lidl-Datenbestand zu klein: {len(products)}. Erkannte Store-Werte: {top}")
    payload={
      "store":"lidl","region":"Österreich","scope":"Österreich","source":SOURCE_URL,
      "updatedAt":now_iso(),"productCount":len(products),"promotionCount":0,"promotionUpdatedAt":None,
      "promotionStale":False,"products":products
    }
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"LIDL-Produkte gespeichert: {len(products)}")


if __name__=="__main__": main()
