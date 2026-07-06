from __future__ import annotations

import json
from typing import Any, Optional, TypedDict

from .models import User

APP_MODULES = (
    "dashboard",
    "gantt",
    "active_orders",
    "optimize",
    "import",
    "completed",
    "materials",
    "machines",
    "users",
)

ITEM_FIELDS = (
    "machine",
    "start_date",
    "pieces",
    "piece_length",
    "notes",
    "meters_produced",
    "complete",
    "delete_all",
)

ITEM_FIELD_TO_PAYLOAD = {
    "machine": "machine_id",
    "start_date": "start_date",
    "pieces": "pieces",
    "piece_length": "piece_length",
    "notes": "notes",
    "meters_produced": "meters_produced",
}


class PermissionEntry(TypedDict):
    view: bool
    modify: bool


class UserPermissions(TypedDict):
    modules: dict[str, PermissionEntry]
    items: dict[str, PermissionEntry]


def _entry(view: bool = False, modify: bool = False) -> PermissionEntry:
    return {"view": view, "modify": modify}


def _modules(**kwargs: PermissionEntry) -> dict[str, PermissionEntry]:
    return {m: kwargs.get(m, _entry()) for m in APP_MODULES}


def _items(**kwargs: PermissionEntry) -> dict[str, PermissionEntry]:
    return {f: kwargs.get(f, _entry(view=True)) for f in ITEM_FIELDS}


DEFAULT_BY_ROLE: dict[str, UserPermissions] = {
    "admin": {
        "modules": _modules(**{m: _entry(True, True) for m in APP_MODULES}),
        "items": _items(**{f: _entry(True, True) for f in ITEM_FIELDS}),
    },
    "production": {
        "modules": _modules(
            dashboard=_entry(True, False),
            gantt=_entry(True, True),
            active_orders=_entry(True, True),
            optimize=_entry(True, True),
            **{"import": _entry(True, True)},
            completed=_entry(True, True),
            materials=_entry(True, False),
            machines=_entry(True, False),
            users=_entry(True, True),
        ),
        "items": _items(
            machine=_entry(True, True),
            start_date=_entry(True, True),
            pieces=_entry(True, True),
            piece_length=_entry(True, True),
            notes=_entry(True, True),
            meters_produced=_entry(True, True),
            complete=_entry(True, True),
            delete_all=_entry(True, True),
        ),
    },
    "sales": {
        "modules": _modules(
            dashboard=_entry(True, False),
            gantt=_entry(True, False),
            active_orders=_entry(True, False),
            completed=_entry(True, False),
        ),
        "items": _items(
            notes=_entry(True, True),
            meters_produced=_entry(True, True),
        ),
    },
    "quality": {
        "modules": _modules(
            dashboard=_entry(True, False),
            gantt=_entry(True, False),
            active_orders=_entry(True, False),
            completed=_entry(True, False),
        ),
        "items": _items(
            notes=_entry(True, True),
            meters_produced=_entry(True, True),
        ),
    },
    "confection": {
        "modules": _modules(
            dashboard=_entry(True, False),
            gantt=_entry(True, False),
            active_orders=_entry(True, False),
            completed=_entry(True, False),
        ),
        "items": _items(
            notes=_entry(True, True),
            meters_produced=_entry(True, True),
        ),
    },
}


USER_MANAGEMENT_ROLES = frozenset({"admin", "production"})


def default_permissions_for_role(role: str) -> UserPermissions:
    return DEFAULT_BY_ROLE.get(role, DEFAULT_BY_ROLE["sales"])


def normalize_permissions(raw: Optional[dict[str, Any]], role: str) -> UserPermissions:
    base = default_permissions_for_role(role)
    if not raw:
        return base

    modules: dict[str, PermissionEntry] = {}
    for key in APP_MODULES:
        entry = raw.get("modules", {}).get(key, {})
        modules[key] = _entry(bool(entry.get("view", base["modules"][key]["view"])),
                              bool(entry.get("modify", base["modules"][key]["modify"])))

    items: dict[str, PermissionEntry] = {}
    for key in ITEM_FIELDS:
        entry = raw.get("items", {}).get(key, {})
        items[key] = _entry(bool(entry.get("view", base["items"][key]["view"])),
                            bool(entry.get("modify", base["items"][key]["modify"])))

    return {"modules": modules, "items": items}


def load_user_permissions(user: User) -> UserPermissions:
    if not user.permissions_json:
        return default_permissions_for_role(user.role)
    try:
        raw = json.loads(user.permissions_json)
    except json.JSONDecodeError:
        return default_permissions_for_role(user.role)
    return normalize_permissions(raw, user.role)


def save_user_permissions(perms: UserPermissions) -> str:
    return json.dumps(perms)


def can_manage_users(user: User) -> bool:
    if user.role not in USER_MANAGEMENT_ROLES:
        return False
    perms = load_user_permissions(user)
    return perms["modules"]["users"]["modify"]


def can_view_module(user: User, module: str) -> bool:
    if user.role == "admin":
        return load_user_permissions(user)["modules"].get(module, _entry())["view"]
    perms = load_user_permissions(user)
    return perms["modules"].get(module, _entry())["view"]


def can_modify_module(user: User, module: str) -> bool:
    perms = load_user_permissions(user)
    return perms["modules"].get(module, _entry())["modify"]


def can_modify_item_field(user: User, field: str) -> bool:
    perms = load_user_permissions(user)
    return perms["items"].get(field, _entry())["modify"]


def permissions_schema() -> dict[str, Any]:
    return {
        "modules": list(APP_MODULES),
        "items": list(ITEM_FIELDS),
        "roles": list(DEFAULT_BY_ROLE.keys()),
        "defaults": DEFAULT_BY_ROLE,
    }
