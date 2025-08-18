import json
import os
import importlib
from typing import Dict, Any
from mcp.server import Server
from mcp.types import Tool, CallToolRequest
from sqlalchemy import create_engine, inspect, MetaData
from sqlalchemy.engine.reflection import Inspector

def diff_dicts(a: dict, b: dict) -> Dict[str, Any]:
    """Compare two dictionaries and return added, removed, and changed items."""
    added = {k: b[k] for k in b.keys() - a.keys()}
    removed = {k: a[k] for k in a.keys() - b.keys()}
    changed = {k: {"expected": a[k], "actual": b[k]} for k in a.keys() & b.keys() if a[k] != b[k]}
    return {"added": added, "removed": removed, "changed": changed}

def metadata_signature(md: MetaData) -> Dict[str, Any]:
    """Extract schema signature from SQLAlchemy metadata."""
    sig = {}
    for t in md.tables.values():
        cols = {}
        for c in t.columns:
            cols[c.name] = {
                "type": str(c.type),
                "nullable": c.nullable,
                "default": str(getattr(c.server_default, "arg", None)) if c.server_default else None,
                "pk": c.primary_key,
                "unique": any(i.unique and c.name in [cc.name for cc in i.columns] for i in t.indexes)
            }
        sig[t.name] = {"columns": cols}
    return sig

def db_signature(inspector: Inspector) -> Dict[str, Any]:
    """Extract schema signature from live database."""
    sig = {}
    for t in inspector.get_table_names():
        cols = {}
        for c in inspector.get_columns(t):
            cols[c["name"]] = {
                "type": str(c["type"]),
                "nullable": c.get("nullable", True),
                "default": str(c.get("default")),
                "pk": c.get("primary_key", False),
                "unique": False  # filled by indexes
            }
        # Check unique indexes
        for idx in inspector.get_indexes(t):
            if idx.get("unique"):
                for c in idx.get("column_names", []):
                    if c in cols:
                        cols[c]["unique"] = True
        sig[t] = {"columns": cols}
    return sig

server = Server(
    name="schema-drift-mcp", 
    version="0.1.0"
)

@server.tool(
    Tool(
        name="schema_diff",
        description="Compare declared SQLAlchemy metadata with live Postgres schema.",
        input_schema={
            "type": "object",
            "properties": {
                "db_url": {"type": "string", "description": "Postgres URL"},
                "metadata_module": {"type": "string", "description": "Import path to module exposing 'metadata'"},
            },
            "required": ["db_url", "metadata_module"]
        }
    )
)
def schema_diff(req: CallToolRequest):
    """Compare declared schema with live database schema."""
    db_url = req.params["db_url"]
    metadata_module = req.params["metadata_module"]

    try:
        # Import metadata
        mod = importlib.import_module(metadata_module)
        md: MetaData = getattr(mod, "metadata")

        # Get declared signature
        declared = metadata_signature(md)

        # Get live signature
        eng = create_engine(db_url)
        insp = inspect(eng)
        live = db_signature(insp)

        # Compare schemas
        out = {}
        names = set(declared.keys()) | set(live.keys())
        for t in sorted(names):
            if t not in declared:
                out[t] = {"status": "unexpected_in_db"}
                continue
            if t not in live:
                out[t] = {"status": "missing_in_db"}
                continue
            out[t] = {
                "status": "exists",
                "columns": diff_dicts(declared[t]["columns"], live[t]["columns"])
            }

        return {"content": [{"type": "text", "text": json.dumps(out, indent=2)}]}
    
    except Exception as e:
        return {
            "content": [{
                "type": "text", 
                "text": json.dumps({"error": str(e), "type": type(e).__name__}, indent=2)
            }]
        }

def main():
    """Run the MCP server."""
    server.run_stdio()

if __name__ == "__main__":
    main()
