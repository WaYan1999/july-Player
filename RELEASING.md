# Releasing & Auto-Updates

The desktop app uses [`tauri-plugin-updater`](https://v2.tauri.app/plugin/updater/) to fetch new versions from GitHub Releases.

## One-time setup

### 1. Generate the signing keypair

Tauri signs every update so installed apps can verify it. You only do this **once** for the project.

```bash
npm run tauri signer generate -- -w ~/.tauri/ckourse.key
```

You'll be prompted for a password. This creates:

- `~/.tauri/ckourse.key` — **private key** (keep secret, never commit)
- `~/.tauri/ckourse.key.pub` — **public key**

### 2. Wire the public key into the app

Copy the contents of `~/.tauri/ckourse.key.pub` and paste it into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`, replacing the `REPLACE_WITH_PUBLIC_KEY_FROM_TAURI_SIGNER_GENERATE` placeholder.

Commit that change.

### 3. Add GitHub Actions secrets

Add these secrets to the repo (Settings → Secrets and variables → Actions):

- `TAURI_SIGNING_PRIVATE_KEY` — contents of `~/.tauri/ckourse.key`
- `JULYRES_PLAYER_RELEASE_TOKEN` — JulyRes player release upload token

Do not leave `JULYRES_PLAYER_RELEASE_TOKEN` empty. The release workflow fails on purpose when this token is missing so a package cannot be published to GitHub while silently skipping the JulyRes upload.

If your Tauri signing key has a password, also add:

- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password you chose

## Cutting a release

1. Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json` (also `src-tauri/Cargo.toml` if you version it separately).
2. Commit, tag, push:
   ```bash
   git commit -am "release vX.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```
3. The `Build & Release` workflow builds macOS + Windows, signs the update artifacts, and drafts a GitHub Release with:
   - platform installers (`.dmg`, `.msi`, `.exe`)
   - `latest.json` (the update manifest the app polls)
   - `.sig` signature files
4. The workflow uploads the signed installer artifacts to JulyRes. This step requires `JULYRES_PLAYER_RELEASE_TOKEN` and will fail if the secret is missing or any package/signature pair is incomplete.
5. In the JulyRes WordPress admin, open **播放器发布**, review the uploaded 1.x.x artifacts, check **发布到 latest.json**, and save.
6. Verify `https://julyres.top/july-player/latest.json` returns the new version, includes `windows-x86_64-nsis`, and every package URL is directly downloadable:
   ```bash
   npm run verify:update-manifest
   ```
   GitHub Release remains the fallback update endpoint, but the app will not necessarily fall back if the first manifest is valid and only its package URL returns 404.

## How clients update

- On launch, the app silently polls the endpoint (1.5s after start).
- If a newer version is found, a toast appears and the **Updates** section in Settings shows an `Install vX.Y.Z` button.
- Clicking it downloads + verifies the signature + installs + relaunches.

## Manual check

Users can hit the **Check for updates** button in Settings at any time.

## Troubleshooting

- **"signature error"** on install: public key in `tauri.conf.json` doesn't match the private key used to sign. Regenerate, or re-paste the pubkey.
- **No update detected** after publishing: make sure the release is **published** (not draft) and that the `version` in `latest.json` is greater than the installed app's version (semver compared).
- **`createUpdaterArtifacts: true` missing**: without it, `tauri-action` won't emit `latest.json`.
- **JulyRes upload skipped or missing on website**: it should not skip anymore. Confirm `JULYRES_PLAYER_RELEASE_TOKEN` exists in GitHub Actions secrets, then rerun the release workflow or re-push the release tag.
- **Update found but install fails with `404 Not Found`**: `latest.json` is reachable, but one of `platforms.*.url` is not a direct installer URL. Run `npm run verify:update-manifest`. The server must return `200` or `206` for every installer URL to non-browser requests, and Windows releases should include both `windows-x86_64-msi` and `windows-x86_64-nsis`.
