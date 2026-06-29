param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = "Stop"
npm version $Version --no-git-tag-version
(Get-Content src-tauri/tauri.conf.json -Raw) -replace '"version":\s*"[^"]+"', "`"version`": `"$Version`"" | Set-Content src-tauri/tauri.conf.json
(Get-Content src-tauri/Cargo.toml -Raw) -replace 'version = "[^"]+"', "version = `"$Version`"" | Set-Content src-tauri/Cargo.toml
git add package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: release v$Version"
git tag "v$Version"
