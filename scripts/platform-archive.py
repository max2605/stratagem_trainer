#!/usr/bin/env python3
"""Create a downloadable platform tree while excluding local build caches."""
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
platform = sys.argv[1]
if platform not in {"windows", "linux", "macOS", "iphone", "android"}:
    raise SystemExit("Unknown platform")
target = root / sys.argv[2]
target.parent.mkdir(parents=True, exist_ok=True)
excluded = {"node_modules", ".gradle", "build", ".idea", "Pods", "DerivedData", ".swiftpm", ".git"}
with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted((root / platform).rglob("*")):
        relative = file.relative_to(root / platform)
        if file.is_file() and not any(part in excluded for part in relative.parts):
            archive.write(file, file.relative_to(root))
print(target)
