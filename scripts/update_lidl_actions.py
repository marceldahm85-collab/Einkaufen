#!/usr/bin/env python3
from __future__ import annotations

import hashlib, html, json, math, re, sys, time
from datetime import datetime, date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
DATA_PATH=ROOT/"data"/"lidl.json"
ACTION_URL="https://www.lidl.at/"
MIN_PRODUCTS=100
MIN_ACTIONS=20
MAX_AGE_DAYS=14
UA="Mozilla/5.0 PreisPilot-Osttirol-GitHubAction/1.0"

def now():
    return datetime.now(ZoneInfo("Europe/Vienna")).replace(microsecond=0).isoformat()
def today():
    return datetime.now(ZoneInfo("Europe/Vienna")).date()
def num(v):
    try:
        x=float(str(v).replace("€","").replace(" ","").replace("\xa0","").replace(",","."))
        return x if math.isfinite(x) else None
    except: return None
def norm(v):
    return re.sub(r"\s+"," ",html.unescape(str(v or "")).replace("\xa0"," ")).strip()
def nname(v): return norm(v).casefold()
def fetch(url, attempts=4):
    last=None
    for i in range(attempts):
        try:
            req=Request(url,headers={"Accept":"text/html,application/xhtml+xml","Accept-Language":"de-AT,de;q=0.9","Accept-Encoding":"identity","Cache-Control":"no-cache","User-Agent":UA})
            with urlopen(req,timeout=90) as r:
                data=r.read(); enc=r.headers.get_content_charset() or "utf-8"; text=data.decode(enc,errors="replace")
                if len(text)<20000: raise RuntimeError(f"Lidl-Seite unplausibel klein ({len(text)} Zeichen)")
                return text
        except Exception as e:
            last=e
            if i+1<attempts: time.sleep(2**i)
    raise RuntimeError(f"Lidl-Angebotsseite nicht erreichbar: {last}")

class Node:
    def __init__(self,tag="document",attrs=None,parent=None):
        self.tag=tag; self.attrs=dict(attrs or []); self.parent=parent; self.children=[]; self.parts=[]
    def text(self):
        return norm(" ".join(self.parts+[c.text() for c in self.children]))
class Parser(HTMLParser):
    void={"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    def __init__(self):
        super().__init__(convert_charrefs=True); self.root=Node(); self.stack=[self.root]
    def handle_starttag(self,t,a):
        p=self.stack[-1]; n=Node(t,a,p); p.children.append(n)
        for k in ("alt","aria-label","title"):
            if n.attrs.get(k): n.parts.append(str(n.attrs[k]))
        if t.lower() not in self.void: self.stack.append(n)
    def handle_startendtag(self,t,a): self.handle_starttag(t,a); self.stack.pop() if t.lower() not in self.void else None
    def handle_endtag(self,t):
        t=t.lower()
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag.lower()==t: del self.stack[i:]; return
    def handle_data(self,d):
        if d: self.stack[-1].parts.append(d)
def walk(n):
    for c in n.children:
        yield c; yield from walk(c)
def ancestors(n,limit=12):
    out=[]; p=n.parent
    for _ in range(limit):
        if not p: break
        out.append(p); p=p.parent
    return out
def product_id(url):
    path=urlparse(url).path
    m=re.findall(r"(\d{6,})",path)
    return m[-1] if m else None
def dates(text):
    m=re.search(r"(?:Filiale\s+(?:von\s+)?)?(\d{2})\.(\d{2})\.\s*(?:-|–)\s*(\d{2})\.(\d{2})",text,re.I)
    if not m: return None,None
    y=today().year
    try:
        start=date(y,int(m.group(2)),int(m.group(1))); end=date(y,int(m.group(4)),int(m.group(3)))
        if end<start: end=end.replace(year=y+1)
        return start,end
    except: return None,None
def prices(text):
    return [num(x) for x in re.findall(r"(?<!\d)(\d{1,4}(?:[.,]\d{2}))\s*€",text) if num(x) is not None]
def parse(anchor,href):
    text=anchor.text()
    if len(text)<30: 
        for a in ancestors(anchor):
            if len(text)<30: text=a.text()
            if len(text)>30 and ("in der Filiale" in text or "Filiale" in text): break
    text=norm(text)
    start,end=dates(text)
    if not start or not end: return None
    t=today()
    if start>t or end<t or start<t.replace(day=1) and (t-start).days>MAX_AGE_DAYS: return None
    ps=prices(text)
    if not ps: return None
    sale=ps[0]
    regular=None
    m=re.search(r"(?:vorher|statt)\s*:?\s*(\d{1,4}(?:[.,]\d{2}))\s*€",text,re.I)
    if m: regular=num(m.group(1))
    amount=None; unit=None
    m=re.search(r"(?:je|bei\s+\d+\s+Stk\.?\s+je)\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|Stk\.?|Stück)\b",text,re.I)
    if m:
        amount=num(m.group(1)); unit={"stück":"Stk","stk.":"Stk"}.get(m.group(2).lower(),m.group(2).lower())
    bundle=re.search(r"\b(\d+)\s*\+\s*(\d+)\s*gratis\b",text,re.I)
    qty=re.search(r"\b(?:ab|bei)\s+(\d+)\s*(?:Stk\.?|Stück)\b",text,re.I)
    loyalty=bool(re.search(r"\bmit\s+lidl\s+plus\b",text,re.I))
    label="Lidl Aktion"
    promo={"type":"price_drop","label":label,"officialLabel":label,"verified":True,"source":ACTION_URL,"loyaltyRequired":loyalty,"loyaltyProgram":"Lidl Plus" if loyalty else None}
    if bundle:
        paid,free=map(int,bundle.groups())
        promo.update(type="bundle",paidQuantity=paid,freeQuantity=free,requiredQuantity=paid+free,label=f"{paid}+{free} gratis",officialLabel=f"{paid}+{free} gratis")
    elif qty:
        req=int(qty.group(1)); promo.update(type="quantity",requiredQuantity=req,label=f"ab {req} Stück",officialLabel=f"ab {req} Stück")
    name=text
    name=re.sub(r"\b(?:in der Filiale|je\s+\d+.*$|vorher:.*$)","",name,flags=re.I).strip(" -–")
    if not name: return None
    return {"id":product_id(href),"url":href,"name":name,"salePrice":round(sale,2),"regularPrice":round(regular,2) if regular is not None else None,"amount":amount,"unit":unit,"promotion":promo,"validFrom":start.isoformat(),"validUntil":end.isoformat()}

def idset(v):
    s=str(v or "").strip(); d=re.sub(r"\D+","",s)
    return {s.casefold(),d,d.lstrip("0") or "0"} if s else set()
def find(products,a):
    aid=idset(a.get("id"))
    if aid:
        for p in products:
            if aid & (idset(p.get("retailerProductId"))|idset(p.get("remoteObjectId"))): return p
    key=nname(a["name"])
    for p in products:
        if nname(p.get("name"))==key: return p
    return None
def clear(products):
    for p in products:
        if p.get("promotionVerified") or p.get("promotion"):
            p.update(salePrice=None,promotion=None,promotionVerified=False,validFrom=None,validUntil=None,optimizerEligible=False)
def main():
    payload=json.loads(DATA_PATH.read_text(encoding="utf-8"))
    products=payload.get("products") or []
    if len(products)<MIN_PRODUCTS: raise SystemExit("Lidl-Grundbestand fehlt oder ist unplausibel klein.")
    try:
        parser=Parser(); parser.feed(fetch(ACTION_URL)); parser.close()
        actions=[]; seen=set()
        for a in walk(parser.root):
            if a.tag.lower()!="a": continue
            href=urljoin(ACTION_URL,html.unescape(str(a.attrs.get("href") or "").strip())).split("?",1)[0]
            if "lidl.at" not in urlparse(href).netloc or not ("/p/" in urlparse(href).path.lower() or "/c/" not in urlparse(href).path.lower()): continue
            item=parse(a,href)
            if not item: continue
            key=item.get("id") or nname(item["name"])
            if key in seen: continue
            seen.add(key); actions.append(item)
        if len(actions)<MIN_ACTIONS: raise RuntimeError(f"Unplausibel wenige Lidl-Aktionen erkannt: {len(actions)}")
        clear(products); matched=0; appended=0
        for a in actions:
            p=find(products,a)
            if p is None:
                pid=a.get("id") or "lidl-action-"+hashlib.sha1(a["name"].encode()).hexdigest()[:16]
                p={"store":"lidl","remoteObjectId":pid,"retailerProductId":pid,"name":a["name"],"description":"","amount":a.get("amount") or 1,"unit":a.get("unit") or "Stk","currentPrice":a["salePrice"],"unitPrice":None,"unitPriceUnit":"Stk","source":"lidl.at (Aktuelle Angebote)","history":[]}
                products.append(p); appended+=1
            else: matched+=1
            p["salePrice"]=a["salePrice"]; p["regularPrice"]=a.get("regularPrice") or p.get("regularPrice")
            p["promotion"]=a["promotion"]; p["promotionVerified"]=True; p["promotionObservedAt"]=now()
            p["validFrom"]=a["validFrom"]; p["validUntil"]=a["validUntil"]; p["promotionSource"]=ACTION_URL; p["promotionProductUrl"]=a["url"]
            if a.get("amount") and a.get("unit"):
                p["amount"]=a["amount"]; p["unit"]=a["unit"]; p["packageAmount"]=a["amount"]; p["packageUnit"]=a["unit"]; p["packageAmountKnown"]=True; p["optimizerEligible"]=True
            elif p.get("amount") and p.get("unit"):
                p["optimizerEligible"]=True
            else: p["optimizerEligible"]=False
        payload.update(productCount=len(products),promotionCount=len(actions),promotionUpdatedAt=now(),promotionObservedAt=now(),promotionSource=ACTION_URL,promotionStale=False,promotionLastError=None,promotionParserVersion=1)
        DATA_PATH.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        print(f"Lidl-Aktionen: {len(actions)} erkannt; {matched} bestehende Produkte; {appended} ergänzt.")
        return 0
    except Exception as e:
        payload["promotionStale"]=True; payload["promotionLastError"]=str(e)
        DATA_PATH.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        print(f"WARNUNG: Lidl-Aktionen nicht frisch importiert: {e}",file=sys.stderr)
        return 0
if __name__=="__main__": raise SystemExit(main())
