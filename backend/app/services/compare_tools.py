"""Deterministic truth for the agentic node-comparison workflow.

The language model is allowed to choose which function to call next. It is not allowed
to decide what changed, choose target values, perform arithmetic, or declare success.
Those responsibilities live here and nowhere else.
"""

from __future__ import annotations

from typing import Any, Literal

MOD_KEYS = ("engine", "exhaust", "wheels", "brakes")
ModKey = Literal["engine", "exhaust", "wheels", "brakes"]


def normalize_mod(value: str | None) -> str | None:
    """Normalize database empty strings to the comparison's null representation."""
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def determine_operation(
    current_mod: str | None,
    target_mod: str | None,
) -> Literal["add", "remove", "replace", "unchanged"]:
    """Return the only valid operation for two normalized slot values."""
    current = normalize_mod(current_mod)
    target = normalize_mod(target_mod)
    if current == target:
        return "unchanged"
    if current is None:
        return "add"
    if target is None:
        return "remove"
    return "replace"


def calculate_mod_changes(node_a: dict, node_b: dict) -> list[dict]:
    """Compare all four slots; this is the authoritative change detector."""
    changes: list[dict] = []
    for mod_key in MOD_KEYS:
        current = normalize_mod((node_a.get("mods") or {}).get(mod_key))
        target = normalize_mod((node_b.get("mods") or {}).get(mod_key))
        changes.append(
            {
                "mod_key": mod_key,
                "current": current,
                "target": target,
                "operation": determine_operation(current, target),
            }
        )
    return changes


def get_mod_details(
    catalogue: dict,
    car_id: str,
    mod_key: str,
    mod_name: str | None,
) -> dict | None:
    """Return an exact catalogue match; prices are never fuzzy-matched."""
    normalized_name = normalize_mod(mod_name)
    if normalized_name is None:
        return None

    for part in (catalogue.get(car_id) or {}).get(mod_key, []):
        if part.get("name") == normalized_name:
            return part
    return None


def add_mod(working_node: dict, target_node: dict, mod_key: ModKey) -> dict:
    """Copy an empty slot's authoritative value from the target node."""
    _require_mod_key(mod_key)
    current = normalize_mod((working_node.get("mods") or {}).get(mod_key))
    target = normalize_mod((target_node.get("mods") or {}).get(mod_key))
    if current is not None:
        raise ValueError("Current node already has a modification.")
    if target is None:
        raise ValueError("Target node contains no modification.")

    working_node["mods"][mod_key] = target
    return {"operation": "add", "mod_key": mod_key, "added": target}


def remove_mod(working_node: dict, mod_key: ModKey) -> dict:
    """Remove the current value from one working-node slot."""
    _require_mod_key(mod_key)
    current = normalize_mod((working_node.get("mods") or {}).get(mod_key))
    if current is None:
        raise ValueError("There is no modification to remove.")

    working_node["mods"][mod_key] = None
    return {"operation": "remove", "mod_key": mod_key, "removed": current}


def replace_mod(working_node: dict, target_node: dict, mod_key: ModKey) -> dict:
    """Replace a non-null value with the authoritative target-node value."""
    _require_mod_key(mod_key)
    current = normalize_mod((working_node.get("mods") or {}).get(mod_key))
    target = normalize_mod((target_node.get("mods") or {}).get(mod_key))
    if current is None:
        raise ValueError("No current modification exists. Use add_mod.")
    if target is None:
        raise ValueError("No target modification exists. Use remove_mod.")
    if current == target:
        raise ValueError("The modifications already match.")

    working_node["mods"][mod_key] = target
    return {
        "operation": "replace",
        "mod_key": mod_key,
        "removed": current,
        "added": target,
    }


def calculate_costs(operations: list[dict], catalogue: dict, car_id: str) -> dict:
    """Price all added and removed values with exact catalogue lookups."""
    new_parts_cost = 0.0
    removed_parts_value = 0.0
    unresolved_added: list[str] = []
    unresolved_removed: list[str] = []

    for operation in operations:
        mod_key = operation["mod_key"]
        kind = operation["operation"]

        if kind in ("add", "replace"):
            added_name = operation["added"]
            part = get_mod_details(catalogue, car_id, mod_key, added_name)
            if part is None or part.get("price") is None:
                unresolved_added.append(added_name)
            else:
                new_parts_cost += float(part["price"])

        if kind in ("remove", "replace"):
            removed_name = operation["removed"]
            part = get_mod_details(catalogue, car_id, mod_key, removed_name)
            if part is None or part.get("price") is None:
                unresolved_removed.append(removed_name)
            else:
                removed_parts_value += float(part["price"])

    return {
        "new_parts_cost": round(new_parts_cost, 2),
        "removed_parts_value": round(removed_parts_value, 2),
        # This is a catalogue-value delta, not money the owner necessarily spends.
        "build_value_difference": round(new_parts_cost - removed_parts_value, 2),
        "pricing_complete": not unresolved_added,
        "unresolved_added_parts": unresolved_added,
        "unresolved_removed_parts": unresolved_removed,
    }


def validate_comparison(working_node: dict, target_node: dict) -> dict:
    """Prove the temporary node's four slots match the target exactly."""
    mismatches: list[dict] = []
    for mod_key in MOD_KEYS:
        working = normalize_mod((working_node.get("mods") or {}).get(mod_key))
        target = normalize_mod((target_node.get("mods") or {}).get(mod_key))
        if working != target:
            mismatches.append(
                {"mod_key": mod_key, "working": working, "target": target}
            )
    return {"matches_target": not mismatches, "mismatches": mismatches}


def normalized_mods(node: dict) -> dict[str, str | None]:
    """Return only the normalized mechanical state for the API response."""
    return {
        mod_key: normalize_mod((node.get("mods") or {}).get(mod_key))
        for mod_key in MOD_KEYS
    }


def _require_mod_key(mod_key: Any) -> None:
    if mod_key not in MOD_KEYS:
        raise ValueError(f"Unknown modification key '{mod_key}'.")
