"""Package the checked extension and validate version-specific release inputs."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ARCHIVE = ROOT / "release-artifacts" / "drive-markdown-reader.zip"
VERSION_PATTERN = r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"


def check_version(manifest):
    version = manifest["version"]
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
    versions = {package["version"], lock["version"], lock["packages"][""]["version"]}
    if re.fullmatch(VERSION_PATTERN, version) is None or versions != {version}:
        raise SystemExit("Expected matching x.y.z versions in manifest, package.json and package-lock.json")
    return version


def package_extension():
    check_version(json.loads((DIST / "manifest.json").read_text(encoding="utf-8")))
    if not (DIST / "LICENSE").is_file():
        raise SystemExit("Missing project LICENSE in dist")
    ARCHIVE.parent.mkdir(exist_ok=True)
    with ZipFile(ARCHIVE, "w", compression=ZIP_DEFLATED) as archive:
        for file in sorted(DIST.rglob("*")):
            if file.is_file():
                archive.write(file, file.relative_to(DIST).as_posix())
    digest = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    ARCHIVE.with_suffix(".zip.sha256").write_text(
        f"{digest}  {ARCHIVE.name}\n", encoding="ascii"
    )


def verify_tag(tag):
    with ZipFile(ARCHIVE) as archive:
        version = check_version(json.loads(archive.read("manifest.json")))
    if tag != f"v{version}":
        raise SystemExit(f"Tag {tag} must match packaged version v{version}")
    notes = ROOT / "docs" / "releases" / f"{tag}.md"
    if not notes.is_file() or not notes.read_text(encoding="utf-8").strip():
        raise SystemExit(f"Missing release notes for {tag}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-tag")
    args = parser.parse_args()
    if args.verify_tag is None:
        package_extension()
    else:
        verify_tag(args.verify_tag)
