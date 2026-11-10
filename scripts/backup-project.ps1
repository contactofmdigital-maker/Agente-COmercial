#requires -Version 5.1
<#
Creates a ZIP snapshot of the currently checked-out Git commit.
The archive contains tracked source only; secrets and uncommitted files are excluded.
Run from the repository root: .\scripts\backup-project.ps1
#>
$ErrorActionPreference = "Stop"

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) {
  throw "No se detectó un repositorio Git. Ejecuta este script desde el proyecto."
}
$repoRoot = $repoRoot.Trim()
$commit = (git rev-parse HEAD).Trim()
$branch = (git branch --show-current).Trim()
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path (Split-Path $repoRoot -Parent) "upscale-backups"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$baseName = "upscale-ia-$timestamp"
$zipPath = Join-Path $backupRoot "$baseName.zip"
$infoPath = Join-Path $backupRoot "$baseName-info.txt"

git -C $repoRoot archive --format=zip --output="$zipPath" HEAD
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $zipPath)) {
  throw "No se pudo generar el ZIP del commit."
}

@"
UpScale IA source backup
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Branch: $branch
Commit: $commit
Archive: $zipPath

This archive contains tracked files from the selected Git commit.
It does NOT contain Supabase database rows, environment files, API keys,
untracked files, node_modules, or .next build output.
Back up Supabase separately before database/schema changes.
"@ | Set-Content -Path $infoPath -Encoding UTF8

Write-Host "Respaldo creado:" -ForegroundColor Green
Write-Host $zipPath
Write-Host "Commit: $commit"
Write-Host "Rama: $branch"
