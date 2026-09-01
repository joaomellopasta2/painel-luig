# -*- coding: utf-8 -*-
"""
Coletor de processos de Luig Almeida Mota (OAB/RJ 183.486) envolvendo
Petrobras / Petroleo Brasileiro / Transpetro.

Fonte: API publica e gratuita do DJEN/CNJ (comunica.pje.jus.br).
Gera ../dados.json (consumido pelo app PWA) e marca as NOVIDADES da rodada,
comparando com o dados.json anterior (mantido no repositorio pelo GitHub).

Rode: python updater/collect.py
"""
import json, re, os, sys, time, urllib.request, urllib.parse
from datetime import datetime, timezone, timedelta

ADVOGADO = "Luig Almeida Mota"
TERMOS_PARTE = ["PETROBRAS", "PETROLEO BRASILEIRO", "TRANSPETRO"]
API = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(BASE, "..", "dados.json"))
BR = timezone(timedelta(hours=-3))  # horario de Brasilia


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Referer": "https://comunica.pje.jus.br/",
    "Origin": "https://comunica.pje.jus.br",
}


def fetch(parte, pagina):
    """Busca uma página. Levanta exceção se falhar em todas as tentativas
    (para o coletor abortar sem sobrescrever dados bons)."""
    q = urllib.parse.urlencode({
        "nomeAdvogado": ADVOGADO,
        "nomeParte": parte,
        "itensPorPagina": 100,
        "pagina": pagina,
    })
    url = f"{API}?{q}"
    ultimo_erro = None
    for tent in range(6):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            ultimo_erro = e
            print(f"  ! erro {parte} p{pagina} tent{tent+1}/6: {e}")
            time.sleep(4 * (tent + 1))
    raise RuntimeError(f"Falha ao buscar {parte} pagina {pagina}: {ultimo_erro}")


def coletar():
    comps = {}  # numero -> processo
    for parte in TERMOS_PARTE:
        pagina = 1
        while True:
            j = fetch(parte, pagina)
            items = j.get("items") or []
            if pagina == 1:
                print(f"[{parte}] count={j.get('count')}")
            for it in items:
                num = it.get("numeroprocessocommascara") or it.get("numero_processo")
                if not num:
                    continue
                p = comps.setdefault(num, {
                    "num": num, "trib": it.get("siglaTribunal"), "coms": {}
                })
                cid = it.get("id")
                p["coms"][cid] = {
                    "id": cid,
                    "data": it.get("data_disponibilizacao"),
                    "tipo": it.get("tipoComunicacao"),
                    "doc": it.get("tipoDocumento"),
                    "classe": it.get("nomeClasse"),
                    "link": it.get("link") or "",
                    "txt": it.get("texto") or "",
                }
            if len(items) < 100:
                break
            pagina += 1
            if pagina > 20:
                break
    return comps


# ---------- classificacao heuristica ----------
CATS = [
    ("Concurso/Seleção Petrobras (PSP)",
     r"processo seletivo|psp|edital.{0,40}petrobras|nomea..o|posse|convoca..o|cadastro de reserva|preteri..o|classifica..o|aprovad"),
    ("Dano moral / indenização",
     r"dano moral|indeniza..o|danos materiais"),
    ("Plano de saúde (AMS)",
     r"plano de sa|assist.ncia.{0,10}sa|reajuste.{0,10}mensalidade|coparticipa"),
    ("Previdência (Petros)",
     r"petros|complementa..o de aposentad|previd.ncia complementar"),
    ("Trabalhista / verbas",
     r"verba|hora extra|adicional|fgts|equipara..o salarial|reintegra"),
]

RE_TRANS = re.compile(r"tr[âa]nsito em julgado|transitad[oa] em julgado", re.I)
RE_MERITO = [
    ("Acordo", r"homolog\w*\s+(o\s+)?acordo|homolog\w*\s+a\s+transa|autocomposi"),
    ("Ganho (procedente)", r"julgo\s+(parcialmente\s+)?proceden|julgo procedentes"),
    ("Perda (improcedente)", r"julgo\s+improceden|julgo improcedentes"),
    ("Recurso provido", r"dou provimento|deram provimento|dar provimento|d(á|a)-se provimento|provejo"),
    ("Recurso negado", r"nega\w*\s+provimento|neg(o|ar|aram)\s+provimento|desprovid|n(ã|a)o\s+provid|não provido"),
    ("Extinto sem mérito / desistência", r"extingo o processo|desist(ê|e)ncia|renúncia|art\.?\s*485"),
]


def instancia(trib, classe):
    c = (classe or "").lower()
    if trib in ("STJ", "STF"):
        return "Superior (" + trib + ")"
    if re.search(r"agravo de instrumento|apela|efeito suspensivo|conflito de compet|tutela provis", c):
        return "2º grau (Tribunal)"
    if re.search(r"recurso especial|agravo em recurso", c):
        return "Superior (STJ)"
    return "1º grau"


def classificar(p):
    coms = sorted(p["coms"].values(), key=lambda c: (c["data"] or ""))
    joined = "  ||  ".join(c["txt"] for c in coms)
    low = joined.lower()
    ultima = coms[-1]
    classe = ultima["classe"] or (coms[0]["classe"] if coms else "")

    # objeto
    sigiloso = bool(re.search(r"processo sigiloso|segredo de justi", low))
    objeto = None
    for nome, rx in CATS:
        if re.search(rx, low):
            objeto = nome
            break
    if not objeto:
        objeto = "Sigiloso (não visível)" if sigiloso else "Outro / procedimental"

    # polo
    petro_ativo = bool(re.search(r"(exequente|autor|apelante|requerente|agravante)\s*:?\s*(petr|transpetro)", low))
    autor = ""
    m = re.search(r"(?:AUTOR|EXEQUENTE|APELANTE|REQUERENTE|AGRAVANTE|IMPETRANTE)[^:\n]{0,4}:\s*([A-ZÀ-Ú][A-Za-zÀ-ú\. ]{3,60})", joined)
    if m:
        autor = re.sub(r"\s+", " ", m.group(1)).strip(" .")
        # corta rótulos que grudam após o nome
        autor = re.split(r"\s+(?:advogad|r[ée]u\b|requerid|executad|apelad|agravad|impetrad|registrad|petr[óo]leo|petrobras|e\s+advogad)", autor, flags=re.I)[0].strip(" .")
        mo = re.search(r"^(.*?)\s+e\s+outros", autor, re.I)  # normaliza "e outros (5)"
        if mo:
            autor = mo.group(1).strip() + " e outros"

    transito = bool(RE_TRANS.search(joined))
    resultado, sinal = "", ""
    for nome, rx in RE_MERITO:
        if re.search(rx, low):
            sinal = nome
            break
    # resultado so quando transitado + sinal de merito claro
    if transito:
        if sinal in ("Ganho (procedente)", "Recurso provido"):
            resultado = "Ganho (a confirmar)" if sinal == "Recurso provido" else "Ganho"
        elif sinal in ("Perda (improcedente)", "Recurso negado"):
            resultado = "Perda"
        elif sinal == "Acordo":
            resultado = "Acordo"
        elif sinal.startswith("Extinto"):
            resultado = "Extinto sem mérito"

    datas = [c["data"] for c in coms if c["data"]]
    di, dfim = (min(datas), max(datas)) if datas else ("", "")
    dur = ""
    try:
        a = datetime.strptime(di, "%Y-%m-%d"); b = datetime.strptime(dfim, "%Y-%m-%d")
        dur = (b - a).days
    except Exception:
        pass

    return {
        "num": p["num"], "trib": p["trib"],
        "instancia": instancia(p["trib"], classe),
        "classe": classe, "objeto": objeto,
        "cliente": autor or ("Petrobras (polo ativo)" if petro_ativo else "—"),
        "polo": "Petrobras/Transpetro no polo ativo" if petro_ativo else "Cliente de Luig × Petrobras/Transpetro",
        "transito": transito, "resultado": resultado, "sinal": sinal,
        "sigiloso": sigiloso,
        "data_inicio": di, "ultima_data": dfim, "duracao_dias": dur,
        "qtd_coms": len(coms),
        "link": ultima["link"] or next((c["link"] for c in reversed(coms) if c["link"]), ""),
        "coms": [{"id": c["id"], "data": c["data"], "tipo": c["tipo"],
                  "doc": c["doc"], "link": c["link"]} for c in coms],
    }


def main():
    print("Coletando DJEN...", datetime.now(BR).isoformat())
    try:
        comps = coletar()
    except Exception as e:
        print(f"ERRO na coleta: {e}")
        print("Abortando SEM sobrescrever dados.json (mantém os dados anteriores).")
        sys.exit(1)
    procs = [classificar(p) for p in comps.values()]

    # ---- travas de segurança: nunca apagar dados bons ----
    prev_total = 0
    if os.path.exists(OUT):
        try:
            prev_total = json.load(open(OUT, encoding="utf-8")).get("total", 0)
        except Exception:
            prev_total = 0
    if len(procs) == 0:
        print("ERRO: 0 processos coletados. Abortando SEM sobrescrever dados.json.")
        sys.exit(1)
    if prev_total >= 20 and len(procs) < prev_total * 0.5:
        print(f"ERRO: coleta caiu de {prev_total} para {len(procs)} (queda anormal). "
              "Abortando SEM sobrescrever.")
        sys.exit(1)

    # ---- diff de novidades vs rodada anterior ----
    ids_ant = set()
    ultima_ant = None
    if os.path.exists(OUT):
        try:
            old = json.load(open(OUT, encoding="utf-8"))
            ultima_ant = old.get("gerado_em")
            for pr in old.get("processos", []):
                for c in pr.get("coms", []):
                    ids_ant.add(c["id"])
        except Exception as e:
            print("aviso: nao li dados.json anterior:", e)

    primeira_rodada = len(ids_ant) == 0
    novidades_total = 0
    for pr in procs:
        novos = [c for c in pr["coms"] if c["id"] not in ids_ant]
        # na 1a rodada nao marca tudo como novo (poluiria)
        pr["novos_ids"] = [] if primeira_rodada else [c["id"] for c in novos]
        pr["novo"] = (not primeira_rodada) and len(novos) > 0
        pr["novos_qtd"] = 0 if primeira_rodada else len(novos)
        if pr["novo"]:
            novidades_total += 1
        for c in pr["coms"]:
            c["novo"] = (not primeira_rodada) and (c["id"] not in ids_ant)

    procs.sort(key=lambda x: (x["ultima_data"] or ""), reverse=True)

    agora = datetime.now(BR)
    saida = {
        "gerado_em": agora.isoformat(timespec="minutes"),
        "gerado_em_label": agora.strftime("%d/%m/%Y %H:%M"),
        "fonte": "DJEN/CNJ (comunica.pje.jus.br)",
        "advogado": ADVOGADO, "oab": "RJ 183.486",
        "termos": TERMOS_PARTE,
        "total": len(procs),
        "novidades_qtd": novidades_total,
        "rodada_anterior": ultima_ant,
        "primeira_rodada": primeira_rodada,
        "processos": procs,
    }
    json.dump(saida, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"OK -> {OUT}")
    print(f"   processos={len(procs)}  novidades={novidades_total}  primeira_rodada={primeira_rodada}")


if __name__ == "__main__":
    main()
