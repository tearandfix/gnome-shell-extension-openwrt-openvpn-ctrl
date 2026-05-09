#!/usr/bin/env python3
"""
Return the current IP geolocation country as a flag emoji.

The script prints a single-line JSON object:
{"ok": true, "country_code": "US", "flag": "🇺🇸"}
or
{"ok": false, "error": "..."}
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request


DEFAULT_TIMEOUT_SECONDS = 6
SERVICE_URL = "https://ipapi.co/json/"


def country_code_to_flag(country_code: str) -> str:
    code = (country_code or "").strip().upper()
    if len(code) != 2 or not code.isalpha():
        return "🌐"
    base = 0x1F1E6
    return chr(base + ord(code[0]) - ord("A")) + chr(base + ord(code[1]) - ord("A"))


def fetch_country_code(timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS) -> str:
    request = urllib.request.Request(
        SERVICE_URL,
        headers={
            "User-Agent": "country-flag-gnome-extension/1.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = response.read().decode("utf-8")
    parsed = json.loads(payload)

    country_code = (parsed.get("country_code") or "").strip().upper()
    if len(country_code) != 2:
        raise ValueError("Could not read a valid country code from response.")
    return country_code


def main() -> int:
    try:
        country_code = fetch_country_code()
        result = {
            "ok": True,
            "country_code": country_code,
            "flag": country_code_to_flag(country_code),
        }
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        result = {
            "ok": False,
            "error": str(exc),
            "flag": "🌐",
        }
    except Exception as exc:  # noqa: BLE001
        result = {
            "ok": False,
            "error": f"Unexpected error: {exc}",
            "flag": "🌐",
        }

    sys.stdout.write(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
