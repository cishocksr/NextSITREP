"""Convert Maven's resolved dependency:tree JSON to OSV's custom lockfile format."""
import json
import sys
from pathlib import Path


def inventory(tree):
    packages = {}

    def visit(node):
        for child in node.get("children", []):
            name = child["groupId"] + ":" + child["artifactId"]
            version, scope = child["version"], child["scope"]
            if not name or not version or scope not in {"compile", "runtime", "test", "provided", "system"}:
                raise ValueError("Invalid resolved Maven dependency")
            if any(c in version for c in "[](),$"):
                raise ValueError("Unresolved Maven version")
            packages.setdefault((name, version), set()).add(scope)
            visit(child)

    visit(tree)
    if not packages:
        raise ValueError("Empty Maven dependency inventory")
    return {"results": [{"packages": [
        {"package": {"ecosystem": "Maven", "name": name, "version": version},
         "dependency_groups": sorted(scopes)}
        for (name, version), scopes in sorted(packages.items())
    ]}]}


if __name__ == "__main__":
    Path(sys.argv[2]).write_text(json.dumps(inventory(json.loads(Path(sys.argv[1]).read_text())), indent=2) + "\n")
