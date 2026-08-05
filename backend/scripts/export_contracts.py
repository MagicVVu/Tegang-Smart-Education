"""Export deterministic JSON Schema, TypeScript declarations, and examples.

Usage from the repository root:

    python backend/scripts/export_contracts.py
    python backend/scripts/export_contracts.py --check

The first command writes generated artifacts. ``--check`` performs an in-memory
regeneration and fails if committed artifacts drift from the Pydantic source.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

from pydantic import BaseModel, create_model

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.schemas.common import CONTRACT_SCHEMA_VERSION  # noqa: E402
from backend.app.schemas.examples import build_examples  # noqa: E402
from backend.app.schemas.registry import CONTRACT_MODELS  # noqa: E402

SCHEMA_DIR = REPO_ROOT / "docs" / "contracts" / "schemas"
EXAMPLE_DIR = REPO_ROOT / "docs" / "contracts" / "examples"
TYPES_PATH = REPO_ROOT / "packages" / "types" / "src" / "contracts.generated.ts"
MANIFEST_PATH = REPO_ROOT / "docs" / "contracts" / "manifest.json"


def _json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _slug(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower()


def _snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def _schema_id(name: str) -> str:
    return f"urn:tegang:smart-education:contracts:{CONTRACT_SCHEMA_VERSION}:{_slug(name)}"


def _model_schema(model: type[BaseModel]) -> dict[str, Any]:
    schema = model.model_json_schema(mode="validation")
    schema["$id"] = _schema_id(model.__name__)
    schema["x-contract-schema-version"] = CONTRACT_SCHEMA_VERSION
    schema["x-contract-source"] = f"backend.app.schemas.{model.__module__.rsplit('.', 1)[-1]}.{model.__name__}"
    return schema


def _catalog_schema() -> dict[str, Any]:
    fields = {_snake(model.__name__): (model, ...) for model in CONTRACT_MODELS}
    catalog = create_model("ContractCatalog", **fields)
    schema = catalog.model_json_schema(mode="validation")
    schema["$id"] = f"urn:tegang:smart-education:contracts:{CONTRACT_SCHEMA_VERSION}:catalog"
    schema["title"] = "Special Steel Education Contract Catalog"
    schema["description"] = "Combined Pydantic-derived schema catalog. Database schema is explicitly out of scope."
    schema["x-contract-schema-version"] = CONTRACT_SCHEMA_VERSION
    schema["x-contract-source"] = "backend.app.schemas.registry.CONTRACT_MODELS"
    return schema


def _ts_name(name: str) -> str:
    return f"Contract{name}"


def _ts_literal(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(value, ensure_ascii=False)


def _ts_type(schema: dict[str, Any]) -> str:
    if "$ref" in schema:
        return _ts_name(schema["$ref"].rsplit("/", 1)[-1])
    if "const" in schema:
        return _ts_literal(schema["const"])
    if "enum" in schema:
        return " | ".join(_ts_literal(value) for value in schema["enum"])
    for union_key in ("anyOf", "oneOf"):
        if union_key in schema:
            parts = []
            for item in schema[union_key]:
                rendered = _ts_type(item)
                if rendered not in parts:
                    parts.append(rendered)
            return " | ".join(parts) if parts else "unknown"
    if "allOf" in schema:
        return " & ".join(_ts_type(item) for item in schema["allOf"])

    schema_type = schema.get("type")
    if isinstance(schema_type, list):
        return " | ".join(_ts_type({**schema, "type": item}) for item in schema_type)
    if schema_type == "string":
        return "string"
    if schema_type in {"integer", "number"}:
        return "number"
    if schema_type == "boolean":
        return "boolean"
    if schema_type == "null":
        return "null"
    if schema_type == "array":
        item_type = _ts_type(schema.get("items", {}))
        return f"Array<{item_type}>"
    if schema_type == "object" or "properties" in schema or "additionalProperties" in schema:
        properties = schema.get("properties", {})
        required = set(schema.get("required", []))
        lines: list[str] = []
        for name, prop in properties.items():
            optional = "" if name in required else "?"
            lines.append(f"  {name}{optional}: {_ts_type(prop)};")
        additional = schema.get("additionalProperties")
        if additional is True:
            lines.append("  [key: string]: unknown;")
        elif isinstance(additional, dict):
            lines.append(f"  [key: string]: {_ts_type(additional)};")
        if not lines:
            return "Record<string, unknown>"
        return "{\n" + "\n".join(lines) + "\n}"
    return "unknown"


def _comment(schema: dict[str, Any]) -> list[str]:
    description = schema.get("description")
    if not description:
        return []
    safe = str(description).replace("*/", "* /").replace("\n", " ")
    return ["/**", f" * {safe}", " */"]


def _generate_typescript(catalog_schema: dict[str, Any]) -> str:
    definitions: dict[str, dict[str, Any]] = catalog_schema.get("$defs", {})
    lines = [
        "// @generated by backend/scripts/export_contracts.py; DO NOT EDIT MANUALLY.",
        "// Source of truth: backend/app/schemas (Pydantic v2).",
        "",
        f'export const CONTRACT_SCHEMA_VERSION = "{CONTRACT_SCHEMA_VERSION}" as const;',
        "",
    ]
    for name in sorted(definitions):
        schema = definitions[name]
        lines.extend(_comment(schema))
        ts_name = _ts_name(name)
        if schema.get("type") == "object" and "properties" in schema:
            rendered = _ts_type(schema)
            lines.append(f"export type {ts_name} = {rendered};")
        else:
            lines.append(f"export type {ts_name} = {_ts_type(schema)};")
        lines.append("")

    root_names = [model.__name__ for model in CONTRACT_MODELS]
    rendered_names = ",\n  ".join(json.dumps(name) for name in root_names)
    lines.extend(
        [
            "export const CONTRACT_MODEL_NAMES = [",
            f"  {rendered_names}",
            "] as const;",
            "export type ContractModelName = (typeof CONTRACT_MODEL_NAMES)[number];",
            "",
        ]
    )
    return "\n".join(lines)


def generate_outputs() -> dict[Path, str]:
    """Return every generated file as deterministic path/content pairs."""

    outputs: dict[Path, str] = {}
    schema_entries: list[dict[str, Any]] = []
    for model in CONTRACT_MODELS:
        schema = _model_schema(model)
        path = SCHEMA_DIR / f"{_slug(model.__name__)}.schema.json"
        content = _json_text(schema)
        outputs[path] = content
        schema_entries.append(
            {
                "model": model.__name__,
                "python_source": schema["x-contract-source"],
                "json_schema": path.relative_to(REPO_ROOT).as_posix(),
                "typescript_type": _ts_name(model.__name__),
                "sha256": _sha256(content),
            }
        )

    catalog = _catalog_schema()
    catalog_path = SCHEMA_DIR / "contracts.schema.json"
    catalog_content = _json_text(catalog)
    outputs[catalog_path] = catalog_content
    outputs[TYPES_PATH] = _generate_typescript(catalog)

    example_entries: list[dict[str, str]] = []
    for name, (model_type, model) in build_examples().items():
        validated = model_type.model_validate(model.model_dump(mode="json"))
        path = EXAMPLE_DIR / f"{name}.json"
        content = _json_text(validated.model_dump(mode="json", exclude_none=True))
        outputs[path] = content
        example_entries.append(
            {
                "name": name,
                "model": model_type.__name__,
                "path": path.relative_to(REPO_ROOT).as_posix(),
                "sha256": _sha256(content),
            }
        )

    manifest = {
        "schema_version": CONTRACT_SCHEMA_VERSION,
        "source_of_truth": "backend/app/schemas",
        "generator": "backend/scripts/export_contracts.py",
        "combined_schema": catalog_path.relative_to(REPO_ROOT).as_posix(),
        "typescript_output": TYPES_PATH.relative_to(REPO_ROOT).as_posix(),
        "database_schema_in_scope": False,
        "models": schema_entries,
        "examples": example_entries,
    }
    outputs[MANIFEST_PATH] = _json_text(manifest)
    return outputs


def _check(outputs: dict[Path, str]) -> int:
    drift: list[str] = []
    for path, expected in outputs.items():
        if not path.exists():
            drift.append(f"missing: {path.relative_to(REPO_ROOT)}")
            continue
        actual = path.read_text(encoding="utf-8")
        if actual != expected:
            drift.append(f"changed: {path.relative_to(REPO_ROOT)}")

    expected_schema_names = {path.name for path in outputs if path.parent == SCHEMA_DIR}
    if SCHEMA_DIR.exists():
        for path in SCHEMA_DIR.glob("*.schema.json"):
            if path.name not in expected_schema_names:
                drift.append(f"stale: {path.relative_to(REPO_ROOT)}")

    if drift:
        print("Contract artifacts are out of date:")
        for item in drift:
            print(f"- {item}")
        return 1
    print(f"Contract artifacts are current ({len(outputs)} files).")
    return 0


def _write(outputs: dict[Path, str]) -> None:
    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
    print(f"Generated {len(outputs)} contract artifacts.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail when generated artifacts drift.")
    args = parser.parse_args()
    outputs = generate_outputs()
    if args.check:
        return _check(outputs)
    _write(outputs)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
