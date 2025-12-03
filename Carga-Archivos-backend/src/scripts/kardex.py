#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys, json, re, unicodedata
from pathlib import Path

# ---------- Dependencias de extracción ----------
try:
    import pdfplumber  # Para tablas (materias) y texto
except Exception as e:
    raise SystemExit("Instala pdfplumber: pip install pdfplumber") from e

# (Opcional) afinar texto con pdfminer si lo deseas
try:
    from pdfminer_high_level import extract_text as pdfminer_extract_text  # algunos entornos
except Exception:
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract_text
    except Exception:
        pdfminer_extract_text = None


# ============================================================
# Utilidades
# ============================================================
def nfc(s: str) -> str:
    """Normaliza a Unicode NFC (conserva acentos correctamente)."""
    return unicodedata.normalize("NFC", s or "")

def strip_accents(s: str) -> str:
    """Remueve marcas diacríticas para comparaciones acento-insensibles."""
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")

def normalize_spaces(s: str) -> str:
    return re.sub(r"[ \t]+", " ", s or "").strip()

def tofloat(num_s: str | None) -> float | None:
    if not num_s:
        return None
    t = num_s.replace(",", ".")
    try:
        return float(t)
    except Exception:
        return None


# ============================================================
# 1) TEXTO
# ============================================================
def read_text(path: Path) -> str:
    """
    Extrae texto del PDF. Primero pdfplumber; si sale muy corto,
    intenta pdfminer para mayor continuidad de líneas.
    """
    text = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text.append(page_text)
    out = "\n".join(text)

    # Fallback: si salió demasiado corto, intenta pdfminer
    if pdfminer_extract_text and len(out) < 100:
        try:
            mix = pdfminer_extract_text(str(path)) or ""
            if len(mix) > len(out):
                out = mix
        except Exception:
            pass

    return nfc(out)


# ============================================================
# 2) CABECERA
# ============================================================
def extract_header(raw_text: str) -> dict:
    """
    Cabecera típica (variaciones cubiertas):
      PROGRAMA: ...
      PLAN: 2182
      UNIDAD: HERMOSILLO
      EXPEDIENTE: 222202156  NOMBRE COMPLETO
      ESTATUS: A .. Alumno activo....
      Fecha: 21/09/2025
    """
    txt = raw_text

    # Quitar encabezados/pies independientes de tildes
    # "KÁRDEX ELECTRÓNICO" ~ "KARDEX ELECTRONICO"
    noacc = strip_accents(txt).lower()
    def rm_span(anchor_noacc: str, source: str) -> str:
        i = noacc.find(anchor_noacc)
        if i == -1:
            return source
        # quitar sólo el encabezado (hasta el salto doble si existe)
        tail = source[i:]
        m = re.search(r".*?(?:\n\s*\n|$)", tail, re.S)
        return source[:i] + (tail[m.end():] if m else tail)

    txt = re.sub(r"(?i)Pagina\s+\d+\s+de\s+\d+", "", txt)
    txt = txt.replace(".. Alumno activo....", "")

    # Versiones sin acento
    for anc in ("universidad de sonora", "kardex electronico"):
        txt = rm_span(anc, txt)

    def grab(pat, s=txt, flags=re.M):
        m = re.search(pat, s, flags)
        return normalize_spaces(m.group(1)) if m else None

    header = {
        "fecha":      grab(r"(?i)Fecha:\s*(.*)"),
        "programa":   grab(r"(?i)PROGRAMA:\s*(.*)"),
        "plan":       grab(r"(?i)PLAN:\s*([0-9]+)"),
        "unidad":     grab(r"(?i)UNIDAD:\s*(.*)"),
        "expediente": grab(r"(?i)EXPEDIENTE:\s*([0-9]+)"),
        "alumno":     grab(r"(?i)EXPEDIENTE:\s*[0-9]+\s+(.*)"),
        "estatus":    grab(r"(?i)ESTATUS:\s*(.*)"),
    }
    return {k: v for k, v in header.items() if v}


# ============================================================
# 3) MATERIAS (vía tablas)
# ============================================================
def extract_subject_rows(path: Path) -> list:
    """
    Extrae filas de materias leyendo las tablas de cada página.
    Estructura esperada por fila:
      CR, CVE, MATERIA, E1, E2, ORD, REG, CIC, I, R, B
    - Heurísticas tolerantes (CR puede venir 1–2 dígitos, CVE 3–10 alfanum).
    - Deduplica por (CR, CVE, Materia, CIC).
    """
    materias = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables() or []

            for t in tables:
                for row in t:
                    if not row or len(row) < 3:
                        continue

                    # Limpia y normaliza celdas
                    cells = [normalize_spaces(nfc(c or "")) for c in row]

                    CR  = cells[0] if len(cells) > 0 else ""
                    CVE = cells[1] if len(cells) > 1 else ""
                    MAT = cells[2] if len(cells) > 2 else ""

                    # Heurística: CR = 1–2 dígitos (p.ej. 6 o 06 o 12)
                    if not re.fullmatch(r"\d{1,2}", CR):
                        continue
                    # CVE: 3–10 alfanum (algunas carreras usan guion bajo)
                    if not re.fullmatch(r"[A-Z0-9][A-Z0-9_-]{2,9}", CVE):
                        continue
                    # Materia: no vacía
                    if not MAT:
                        continue

                    E1  = cells[3]  if len(cells) > 3  else None
                    E2  = cells[4]  if len(cells) > 4  else None
                    ORD = cells[5]  if len(cells) > 5  else None
                    REG = cells[6]  if len(cells) > 6  else None
                    CIC = cells[7]  if len(cells) > 7  else None
                    I   = cells[8]  if len(cells) > 8  else None
                    R   = cells[9]  if len(cells) > 9  else None
                    B   = cells[10] if len(cells) > 10 else None

                    materias.append({
                        "CR": CR,
                        "CVE": CVE,
                        "Materia": MAT,
                        "E1": E1 or None,
                        "E2": E2 or None,
                        "ORD": ORD or None,
                        "REG": REG or None,
                        "CIC": CIC or None,
                        "I": I or None,
                        "R": R or None,
                        "B": B or None,
                    })

    # Deduplicar por (CR, CVE, Materia, CIC)
    seen, dedup = set(), []
    for m in materias:
        key = (m["CR"], m["CVE"], m["Materia"], m["CIC"])
        if key in seen:
            continue
        seen.add(key)
        dedup.append(m)
    return dedup


# ============================================================
# 4) RESUMEN (PROMEDIO / CRÉDITOS / MATERIAS)
# ============================================================
def extract_summary(raw_text: str) -> dict:
    """
    Busca:
      - PROMEDIOS por periodo (p.ej. 2025-1 93.33 o 93,33) — puede haber varios.
      - PROMEDIO global (si aparece en bloque de PROMEDIO / KARDEX).
      - CRÉDITOS APR/REP/INS (tolerante a 'CREDITOS' sin tilde).
      - MATERIAS APR/REP/NMR/INS.
    """
    resumen: dict = {"promedios": {}, "creditos": {}, "materias": {}}

    cleaned = nfc(raw_text)
    cleaned_noacc = strip_accents(cleaned).lower()

    def block_after(anchor: str, radius: int = 800) -> str | None:
        """
        Selecciona un bloque a partir de 'anchor' (acento-insensible) con un radio fijo.
        """
        i = cleaned_noacc.find(strip_accents(anchor).lower())
        if i == -1:
            return None
        # ubicar índice real en 'cleaned' mediante conteo de caracteres
        # (las longitudes coinciden porque strip_accents solo remueve marcas)
        sub = cleaned[i:i + radius]
        return sub

    # --- Promedios por periodo (pueden aparecer varios) ---
    # Ej.: "2025-1   93.33" o "2025-1 *93,33"
    for m in re.finditer(r"(\d{4}-\d)\s+\*?(\d{1,3}[.,]\d{1,2})", cleaned):
        periodo = m.group(1)
        val = tofloat(m.group(2))
        if val is not None:
            resumen["promedios"][periodo] = val

    # Promedio global (busca en bloque 'PROMEDIO' y/o 'KARDEX')
    prom_blk = block_after("PROMEDIO")
    if prom_blk:
        m = re.search(r"(\d{1,3}[.,]\d{1,2})", prom_blk)
        v = tofloat(m.group(1)) if m else None
        if v is not None:
            resumen["promedios"].setdefault("kardex", v)

    kard_blk = block_after("KARDEX")
    if kard_blk and "kardex" not in resumen["promedios"]:
        m = re.search(r"(\d{1,3}[.,]\d{1,2})", kard_blk)
        v = tofloat(m.group(1)) if m else None
        if v is not None:
            resumen["promedios"]["kardex"] = v

    # --- Créditos ---
    # Soporta "CRÉDITOS" / "CREDITOS"
    cred_blk = block_after("CRÉDITOS") or block_after("CREDITOS")
    if cred_blk:
        m_apr = re.search(r"(?i)APR\D+(\d+)", cred_blk, re.S)
        m_rep = re.search(r"(?i)REP\D+(\d+)", cred_blk, re.S)
        m_ins = re.search(r"(?i)INS\D+(\d+)", cred_blk, re.S)
        if m_apr: resumen["creditos"]["APR"] = int(m_apr.group(1))
        if m_rep: resumen["creditos"]["REP"] = int(m_rep.group(1))
        if m_ins: resumen["creditos"]["INS"] = int(m_ins.group(1))

    # --- Materias ---
    mat_blk = block_after("MATERIAS")
    if mat_blk:
        m_apr2 = re.search(r"(?i)APR\D+(\d+)", mat_blk, re.S)
        m_rep2 = re.search(r"(?i)REP\D+(\d+)", mat_blk, re.S)
        m_nmr2 = re.search(r"(?i)NMR\D+(\d+)", mat_blk, re.S)
        m_ins2 = re.search(r"(?i)INS\D+(\d+)", mat_blk, re.S)
        if m_apr2: resumen["materias"]["APR"] = int(m_apr2.group(1))
        if m_rep2: resumen["materias"]["REP"] = int(m_rep2.group(1))
        if m_nmr2: resumen["materias"]["NMR"] = int(m_nmr2.group(1))
        if m_ins2: resumen["materias"]["INS"] = int(m_ins2.group(1))

    # Garantiza llaves presentes aunque estén vacías
    resumen.setdefault("creditos", {})
    resumen.setdefault("materias", {})
    resumen.setdefault("promedios", {})

    return resumen


# ============================================================
# 5) CLI
# ============================================================
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "PDF path missing"}, ensure_ascii=False))
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(json.dumps({"ok": False, "error": f"No existe el archivo: {pdf_path}"}, ensure_ascii=False))
        sys.exit(1)

    try:
        raw_text = read_text(pdf_path)
        alumno = extract_header(raw_text)
        materias = extract_subject_rows(pdf_path)
        resumen = extract_summary(raw_text)

        out = {
            "ok": True,
            "alumno": alumno,
            "materias": materias,
            "resumen": resumen,
        }
        print(json.dumps(out, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
    