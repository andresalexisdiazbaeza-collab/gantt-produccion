import hashlib
import json
from typing import Any


def _norm(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        return f"{value:.4f}".rstrip("0").rstrip(".")
    s = str(value).strip()
    if s in ("-", "—", "none", "None"):
        return ""
    return s


def build_fingerprint(data: dict[str, Any]) -> str:
    payload = {
        "order_number": _norm(data.get("order_number")),
        "raw_material": _norm(data.get("raw_material")),
        "titulo": _norm(data.get("titulo")),
        "customer": _norm(data.get("customer")),
        "matriz_mm": _norm(data.get("matriz_mm")),
        "meshes": _norm(data.get("meshes")),
        "color": _norm(data.get("color")),
        "treatment": _norm(data.get("treatment")),
        "pieces": _norm(data.get("pieces")),
        "piece_length": _norm(data.get("piece_length")),
        "kg_totales": _norm(data.get("kg_totales")),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


def build_match_key(data: dict[str, Any]) -> str:
    """Secondary key when fingerprint differs (e.g. customer/kg changed)."""
    payload = {
        "order_number": _norm(data.get("order_number")),
        "titulo": _norm(data.get("titulo")),
        "color": _norm(data.get("color")),
        "matriz_mm": _norm(data.get("matriz_mm")),
        "pieces": _norm(data.get("pieces")),
        "piece_length": _norm(data.get("piece_length")),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


def build_loose_key(data: dict[str, Any]) -> str:
    """Tertiary key: order + color + matriz (tolerates piece/kg differences)."""
    payload = {
        "order_number": _norm(data.get("order_number")),
        "color": _norm(data.get("color")),
        "matriz_mm": _norm(data.get("matriz_mm")),
        "pieces": _norm(data.get("pieces")),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()
