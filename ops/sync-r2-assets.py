#!/usr/bin/env python3
"""Synchronize the blog's public visual assets to Cloudflare R2.

The helper intentionally uses only Python's standard library so the production
image does not need an AWS SDK. It uploads public assets with explicit content
types and immutable cache metadata, then optionally verifies every object with
an S3 HEAD request. Credentials are read in-process and are never printed.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import hmac
import mimetypes
import os
import sys
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIRS = ("comics", "images")
CACHE_CONTROL = "public, max-age=31536000, immutable"


def load_env_file(path: Path) -> None:
    """Load simple KEY=value dotenv entries without executing the file."""

    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if value[:1] in {"'", '"'} and value[-1:] == value[:1]:
            value = value[1:-1]
        os.environ.setdefault(key, value)


def required_config() -> tuple[str, str, str, str, str]:
    endpoint = os.environ.get("R2_ENDPOINT", "").strip().rstrip("/")
    bucket = os.environ.get("R2_BUCKET", "").strip()
    access_key = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
    public_url = os.environ.get("R2_PUBLIC_URL", "").strip().rstrip("/")

    missing = [
        name
        for name, value in (
            ("R2_ENDPOINT", endpoint),
            ("R2_BUCKET", bucket),
            ("R2_ACCESS_KEY_ID", access_key),
            ("R2_SECRET_ACCESS_KEY", secret_key),
            ("R2_PUBLIC_URL", public_url),
        )
        if not value
    ]
    if missing:
        raise SystemExit(f"missing required R2 variables: {', '.join(missing)}")

    parsed = urlsplit(endpoint)
    public = urlsplit(public_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise SystemExit("R2_ENDPOINT must be an https URL")
    if public.scheme != "https" or not public.netloc:
        raise SystemExit("R2_PUBLIC_URL must be an https URL")
    return endpoint, bucket, access_key, secret_key, public_url


def encoded(value: str, *, path: bool = False) -> str:
    safe = "/-_.~" if path else "-_.~"
    return quote(value, safe=safe)


def signing_key(secret_key: str, date: str) -> bytes:
    def sign(key: bytes, message: str) -> bytes:
        return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()

    date_key = sign(("AWS4" + secret_key).encode("utf-8"), date)
    region_key = sign(date_key, "auto")
    service_key = sign(region_key, "s3")
    return sign(service_key, "aws4_request")


def s3_request(
    method: str,
    key: str,
    endpoint: str,
    bucket: str,
    access_key: str,
    secret_key: str,
    body: bytes = b"",
    content_type: str | None = None,
) -> int:
    """Make one authenticated path-style S3 request and return its status."""

    from datetime import datetime, timezone

    parts = urlsplit(endpoint)
    host = parts.netloc
    path = f"/{encoded(bucket)}/{encoded(key, path=True)}"
    payload_hash = hashlib.sha256(body).hexdigest()
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    short_date = amz_date[:8]

    headers = {
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    if content_type is not None:
        headers["content-type"] = content_type
    if method == "PUT":
        headers["cache-control"] = CACHE_CONTROL

    canonical_headers = "".join(
        f"{name}:{' '.join(value.strip().split())}\n"
        for name, value in sorted(headers.items())
    )
    signed_headers = ";".join(sorted(headers))
    canonical_request = "\n".join(
        [method, path, "", canonical_headers, signed_headers, payload_hash]
    )
    scope = f"{short_date}/auto/s3/aws4_request"
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    signature = hmac.new(
        signing_key(secret_key, short_date),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    request_headers = {
        name: value for name, value in headers.items() if name != "host"
    }
    request_headers["Host"] = host
    request_headers["Authorization"] = (
        "AWS4-HMAC-SHA256 "
        f"Credential={access_key}/{scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    request = Request(
        f"{endpoint}{path}",
        data=body if method == "PUT" else None,
        headers=request_headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=30) as response:
            response.read(1)
            return response.status
    except HTTPError as error:
        error.read(512)
        return error.code
    except URLError as error:
        raise RuntimeError(f"network failure for {key}: {error.reason}") from error


def content_type(path: Path) -> str:
    known = {
        ".avif": "image/avif",
        ".webp": "image/webp",
        ".png": "image/png",
    }
    return known.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def asset_files(root: Path, selected_dirs: Iterable[str]) -> list[tuple[Path, str]]:
    result: list[tuple[Path, str]] = []
    for directory in selected_dirs:
        directory_root = root / "public" / directory
        if not directory_root.is_dir():
            raise SystemExit(f"asset directory does not exist: {directory_root}")
        for path in sorted(p for p in directory_root.rglob("*") if p.is_file()):
            # Original comic PNGs are build inputs only. The renderer emits
            # AVIF/WebP variants and Docker already excludes these originals.
            if directory == "comics" and path.suffix.lower() == ".png":
                continue
            result.append((path, path.relative_to(root / "public").as_posix()))
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--check", action="store_true", help="verify objects without uploading")
    parser.add_argument("--dry-run", action="store_true", help="list the upload plan without network calls")
    parser.add_argument("--force", action="store_true", help="overwrite objects that already exist")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--include", nargs="+", choices=ASSET_DIRS, default=list(ASSET_DIRS))
    args = parser.parse_args()
    if args.workers < 1 or args.workers > 16:
        raise SystemExit("--workers must be between 1 and 16")

    root = args.root.resolve()
    load_env_file((args.env_file or root / ".env").resolve())
    endpoint, bucket, access_key, secret_key, _public_url = required_config()
    files = asset_files(root, args.include)
    total_bytes = sum(path.stat().st_size for path, _key in files)
    print(f"assets={len(files)} bytes={total_bytes} bucket={bucket}")
    if args.dry_run:
        return 0

    def process(item: tuple[Path, str]) -> tuple[str, str]:
        path, key = item
        if args.check:
            status = s3_request("HEAD", key, endpoint, bucket, access_key, secret_key)
            return key, "ok" if status == 200 else f"missing({status})"

        if not args.force:
            existing = s3_request("HEAD", key, endpoint, bucket, access_key, secret_key)
            if existing == 200:
                return key, "skipped"

        body = path.read_bytes()
        status = s3_request(
            "PUT",
            key,
            endpoint,
            bucket,
            access_key,
            secret_key,
            body,
            content_type(path),
        )
        if status not in {200, 201, 204}:
            return key, f"upload-failed({status})"
        return key, "uploaded"

    counts = {"ok": 0, "missing": 0, "skipped": 0, "uploaded": 0, "failed": 0}
    failures: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(process, item) for item in files]
        for future in concurrent.futures.as_completed(futures):
            key, result = future.result()
            if result.startswith("missing"):
                counts["missing"] += 1
                failures.append(f"{key}: {result}")
            elif result.startswith("upload-failed"):
                counts["failed"] += 1
                failures.append(f"{key}: {result}")
            else:
                counts[result] += 1

    print(" ".join(f"{name}={counts[name]}" for name in ("uploaded", "skipped", "ok", "missing", "failed")))
    if failures:
        for failure in failures[:20]:
            print(f"FAIL {failure}", file=sys.stderr)
        if len(failures) > 20:
            print(f"FAIL ... and {len(failures) - 20} more", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
