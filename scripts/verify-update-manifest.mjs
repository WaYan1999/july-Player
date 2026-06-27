#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import os from "node:os";

const DEFAULT_MANIFEST_URL = "https://julyres.top/july-player/latest.json";
const REQUIRED_PLATFORMS = [
  "windows-x86_64",
  "windows-x86_64-msi",
  "windows-x86_64-nsis",
  "darwin-aarch64",
  "darwin-x86_64",
];

function usage() {
  console.log(`Usage:
  node scripts/verify-update-manifest.mjs [manifest-url]

Checks that a Tauri updater latest.json is reachable, has the required platform
entries, and that every package URL is directly downloadable.

Default manifest:
  ${DEFAULT_MANIFEST_URL}
`);
}

function curl(args) {
  return spawnSync("curl", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
}

function fetchManifest(url) {
  const result = curl(["-fsSL", "--max-time", "60", "-H", "Accept: application/json", url]);
  if (result.status !== 0) {
    throw new Error(
      `Manifest request failed: ${result.stderr.trim() || result.stdout.trim() || `curl exit ${result.status}`}`,
    );
  }
  return JSON.parse(result.stdout);
}

function packageUrlIsReachable(url) {
  const head = curl([
    "-sSIL",
    "--max-time",
    "60",
    "-o",
    os.devNull,
    "-w",
    "%{http_code} %{size_download}",
    url,
  ]);
  const [headCode, headBytes] = head.stdout.trim().split(/\s+/);
  if (head.status === 0 && /^2\d\d$/.test(headCode)) {
    return {
      ok: true,
      status: headCode,
      bytes: headBytes ?? "",
    };
  }

  const ranged = curl([
    "-fsSL",
    "--max-time",
    "60",
    "-r",
    "0-0",
    "-o",
    os.devNull,
    "-w",
    "%{http_code} %{size_download}",
    url,
  ]);
  const [rangeCode, rangeBytes] = ranged.stdout.trim().split(/\s+/);
  const ok = ranged.status === 0 && /^2\d\d$/.test(rangeCode);

  return {
    ok,
    status: rangeCode || headCode || "ERR",
    statusText: ranged.stderr.trim() || head.stderr.trim(),
    bytes: rangeBytes ?? "",
  };
}

function assertManifestShape(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return ["Manifest is not a JSON object."];
  }
  if (typeof manifest.version !== "string" || !manifest.version.trim()) {
    errors.push("Missing non-empty version.");
  }
  if (!manifest.platforms || typeof manifest.platforms !== "object") {
    errors.push("Missing platforms object.");
    return errors;
  }
  for (const platform of REQUIRED_PLATFORMS) {
    const entry = manifest.platforms[platform];
    if (!entry) {
      errors.push(`Missing platform: ${platform}`);
      continue;
    }
    if (typeof entry.url !== "string" || !entry.url.startsWith("http")) {
      errors.push(`${platform}: missing direct http(s) package url.`);
    }
    if (typeof entry.signature !== "string" || !entry.signature.trim()) {
      errors.push(`${platform}: missing signature content.`);
    } else if (entry.signature.charCodeAt(0) === 0xfeff) {
      errors.push(`${platform}: signature starts with a UTF-8 BOM.`);
    }
  }
  return errors;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const manifestUrl = args[0] || DEFAULT_MANIFEST_URL;
  const manifest = fetchManifest(manifestUrl);
  const shapeErrors = assertManifestShape(manifest);

  console.log(`Manifest OK: ${manifest.version}`);
  const failures = [];
  const checkedUrls = new Map();
  for (const platform of Object.keys(manifest.platforms)) {
    const entry = manifest.platforms[platform];
    if (!entry?.url || checkedUrls.has(entry.url)) {
      continue;
    }
    const result = packageUrlIsReachable(entry.url);
    checkedUrls.set(entry.url, result);
    const line = `${result.ok ? "OK" : "FAIL"} ${result.status} ${entry.url}`;
    console.log(line);
    if (!result.ok) {
      failures.push(`${platform}: ${entry.url} -> ${result.status} ${result.statusText ?? ""}`.trim());
    }
  }

  const allFailures = [...shapeErrors, ...failures];
  if (allFailures.length > 0) {
    throw new Error(`Update manifest verification failed:\n${allFailures.join("\n")}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
