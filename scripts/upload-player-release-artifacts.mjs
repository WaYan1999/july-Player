#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

const API_PATH = "/wp-json/julyres/v1/player-release/artifact";
const DEFAULT_RELEASE_DIR = "src-tauri/target/release/bundle";
const PLATFORM_ALIASES = {
  windows: "windows_msi",
  "windows-msi": "windows_msi",
  windows_msi: "windows_msi",
  "windows-nsis": "windows_nsis",
  windows_nsis: "windows_nsis",
  mac: "macos_app",
  macos: "macos_app",
  darwin: "macos_app",
  "darwin-aarch64": "macos_app",
  "darwin-x86_64": "macos_app",
  "macos-app": "macos_app",
  macos_app: "macos_app",
};

const PLATFORMS = {
  windows_msi: {
    package: [/\.msi$/i],
    signature: [/\.msi\.sig$/i],
  },
  windows_nsis: {
    package: [/-setup\.exe$/i, /\.exe$/i],
    signature: [/-setup\.exe\.sig$/i, /\.exe\.sig$/i],
  },
  macos_app: {
    package: [/\.app\.tar\.gz$/i, /\.tar\.gz$/i, /\.tgz$/i],
    signature: [/\.app\.tar\.gz\.sig$/i, /\.tar\.gz\.sig$/i, /\.tgz\.sig$/i],
  },
};

function usage() {
  console.log(`Usage:
  node scripts/upload-player-release-artifacts.mjs [options]

Options:
  --release-dir <dir>          Directory containing Tauri bundle artifacts.
                               Defaults to ${DEFAULT_RELEASE_DIR}
  --platform <name>            Platform to upload. Repeat or comma-separate.
                               Defaults to windows_msi,windows_nsis,macos_app
  --version <version>          Release version. Defaults to package.json version.
  --notes <text>               Release notes.
  --notes-file <file>          Read release notes from a file.
  --panel-title <text>         Optional JulyRes panel title.
  --panel-description <html>   Optional JulyRes panel description.
  --site <url>                 JulyRes site URL. Defaults to JULYRES_SITE_URL
                               or https://julyres.top
  --require-complete           Fail if only package or only signature is found.
  --skip-without-token         Exit successfully when token is missing.
  --dry-run                    Print what would be uploaded without calling API.
  --help                       Show this help.

Required environment:
  JULYRES_PLAYER_RELEASE_TOKEN Authorization bearer token.
`);
}

function parseArgs(argv) {
  const options = {
    releaseDir: DEFAULT_RELEASE_DIR,
    platforms: [],
    version: "",
    notes: "",
    notesFile: "",
    panelTitle: "",
    panelDescription: "",
    site: process.env.JULYRES_SITE_URL || "https://julyres.top",
    requireComplete: false,
    skipWithoutToken: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return argv[i];
    };

    switch (arg) {
      case "--help":
      case "-h":
        usage();
        process.exit(0);
      case "--release-dir":
        options.releaseDir = next();
        break;
      case "--platform":
        options.platforms.push(...next().split(","));
        break;
      case "--version":
        options.version = next();
        break;
      case "--notes":
        options.notes = next();
        break;
      case "--notes-file":
        options.notesFile = next();
        break;
      case "--panel-title":
        options.panelTitle = next();
        break;
      case "--panel-description":
        options.panelDescription = next();
        break;
      case "--site":
        options.site = next();
        break;
      case "--require-complete":
        options.requireComplete = true;
        break;
      case "--skip-without-token":
        options.skipWithoutToken = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.platforms.length === 0) {
    options.platforms = Object.keys(PLATFORMS);
  }
  options.platforms = [...new Set(options.platforms.map(normalizePlatform))];
  options.releaseDir = path.resolve(options.releaseDir);
  options.site = options.site.replace(/\/+$/, "");
  if (!options.version) {
    options.version = JSON.parse(readFileSync("package.json", "utf8")).version;
  }
  if (options.notesFile) {
    options.notes = readFileSync(options.notesFile, "utf8").trim();
  }
  return options;
}

function normalizePlatform(value) {
  const normalized = PLATFORM_ALIASES[value.trim()];
  if (!normalized) {
    throw new Error(`Unsupported platform: ${value}`);
  }
  return normalized;
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  const entries = readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function newestMatching(files, patterns) {
  return files
    .filter((file) => patterns.some((pattern) => pattern.test(path.basename(file))))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] || "";
}

function uploadPlatform(options, token, platform, packagePath, signaturePath) {
  const args = [
    "-fsS",
    "-X",
    "POST",
    `${options.site}${API_PATH}`,
    "-H",
    `Authorization: Bearer ${token}`,
    "-F",
    `platform=${platform}`,
    "-F",
    `version=${options.version}`,
  ];

  if (options.notes) args.push("-F", `notes=${options.notes}`);
  if (options.panelTitle) args.push("-F", `panelTitle=${options.panelTitle}`);
  if (options.panelDescription) {
    args.push("-F", `panelDescription=${options.panelDescription}`);
  }
  if (packagePath) args.push("-F", `package=@${packagePath}`);
  if (signaturePath) args.push("-F", `signature=@${signaturePath}`);

  if (options.dryRun) {
    console.log(`[dry-run] ${platform}`);
    console.log(`  package: ${packagePath ? path.basename(packagePath) : "(none)"}`);
    console.log(`  signature: ${signaturePath ? path.basename(signaturePath) : "(none)"}`);
    return;
  }

  console.log(`[upload] ${platform}`);
  console.log(`  package: ${packagePath ? path.basename(packagePath) : "(none)"}`);
  console.log(`  signature: ${signaturePath ? path.basename(signaturePath) : "(none)"}`);
  const result = spawnSync("curl", args, { encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`JulyRes upload failed for ${platform}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = process.env.JULYRES_PLAYER_RELEASE_TOKEN || "";

  if (!token && !options.dryRun) {
    if (options.skipWithoutToken) {
      console.warn("JULYRES_PLAYER_RELEASE_TOKEN is missing. Skipping JulyRes upload.");
      return;
    }
    throw new Error("JULYRES_PLAYER_RELEASE_TOKEN is required");
  }

  const files = walkFiles(options.releaseDir);
  if (files.length === 0) {
    throw new Error(`No release files found in ${options.releaseDir}`);
  }

  let uploaded = 0;
  for (const platform of options.platforms) {
    const config = PLATFORMS[platform];
    const packagePath = newestMatching(files, config.package);
    const signaturePath = newestMatching(files, config.signature);

    if (!packagePath && !signaturePath) {
      console.warn(`[skip] ${platform}: no package or signature found`);
      continue;
    }
    if (options.requireComplete && (!packagePath || !signaturePath)) {
      throw new Error(
        `${platform} requires both package and signature. package=${Boolean(packagePath)} signature=${Boolean(signaturePath)}`,
      );
    }

    uploadPlatform(options, token, platform, packagePath, signaturePath);
    uploaded += 1;
  }

  if (uploaded === 0) {
    throw new Error("No matching release artifacts were uploaded");
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
