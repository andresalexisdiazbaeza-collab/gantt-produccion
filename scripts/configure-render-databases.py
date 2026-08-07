#!/usr/bin/env python3
"""Configure Render env vars for Gantt (Neon) and Inventario (MongoDB Atlas).

Usage:
  export NEON_DATABASE_URL='postgresql://...'
  export MONGODB_URI='mongodb+srv://...'   # optional if already set on Render
  python3 scripts/configure-render-databases.py

Reads ~/.render/cli.yaml for the Render API key.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

GANTT_SERVICE_ID = "srv-d94a9rgjs32c73e1nu30"
INVENTARIO_SERVICE_NAME = "respaldo-inventario-master"


def load_render_key() -> str:
    cfg = Path.home().joinpath(".render/cli.yaml").read_text()
    for line in cfg.splitlines():
        if line.strip().startswith("key:"):
            return line.split(":", 1)[1].strip()
    raise SystemExit("Render API key not found in ~/.render/cli.yaml")


def api(method: str, path: str, key: str, body: dict | None = None) -> object:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"https://api.render.com/v1{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def find_service_id(key: str, name: str) -> str:
    cursor = ""
    while True:
        path = f"/services?limit=100&name={name}"
        if cursor:
            path += f"&cursor={cursor}"
        items = api("GET", path, key)
        for item in items:
            svc = item.get("service") or item
            if svc.get("name") == name:
                return svc["id"]
        cursor = items[-1].get("cursor") if items else ""
        if not cursor:
            break
    raise SystemExit(f"Render service not found: {name}")


def set_env(key: str, service_id: str, env_key: str, value: str) -> None:
    body = {"envVar": {"key": env_key, "value": value}}
    try:
        api("PUT", f"/services/{service_id}/env-vars/{env_key}", key, body)
        print(f"  updated {env_key}")
    except urllib.error.HTTPError as err:
        if err.code == 404:
            api("POST", f"/services/{service_id}/env-vars", key, body)
            print(f"  created {env_key}")
        else:
            raise


def trigger_deploy(key: str, service_id: str) -> None:
    api("POST", f"/services/{service_id}/deploys", key, {"clearCache": "do_not_clear"})
    print("  deploy triggered")


def main() -> None:
    neon_url = os.environ.get("NEON_DATABASE_URL", "").strip()
    mongo_url = os.environ.get("MONGODB_URI", "").strip()

    if not neon_url and not mongo_url:
        print("Set at least one of: NEON_DATABASE_URL, MONGODB_URI", file=sys.stderr)
        sys.exit(1)

    render_key = load_render_key()

    if neon_url:
        if not neon_url.startswith(("postgresql://", "postgres://")):
            print("NEON_DATABASE_URL must be a PostgreSQL connection string", file=sys.stderr)
            sys.exit(1)
        print(f"Gantt ({GANTT_SERVICE_ID}):")
        set_env(render_key, GANTT_SERVICE_ID, "DATABASE_URL", neon_url)
        set_env(
            render_key,
            GANTT_SERVICE_ID,
            "GANTT_APP_URL",
            "https://gantt-produccion.onrender.com",
        )
        trigger_deploy(render_key, GANTT_SERVICE_ID)

    if mongo_url:
        inv_id = find_service_id(render_key, INVENTARIO_SERVICE_NAME)
        print(f"Inventario ({inv_id}):")
        set_env(render_key, inv_id, "MONGODB_URI", mongo_url)
        trigger_deploy(render_key, inv_id)

    print("Done.")


if __name__ == "__main__":
    main()
