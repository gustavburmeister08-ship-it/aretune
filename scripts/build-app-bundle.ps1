param(
  [string]$OutputDirectory = ".tmp-pages-bundle"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
$projectPrefix = $projectRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

if (-not $outputPath.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Output directory must stay inside the project root."
}

if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Recurse -Force
}

Push-Location $projectRoot
try {
  & npm run export:web
  if ($LASTEXITCODE -ne 0) {
    throw "Expo web export failed."
  }
} finally {
  Pop-Location
}

$appOutput = Join-Path $outputPath 'app'
New-Item -ItemType Directory -Path $appOutput -Force | Out-Null
Copy-Item -Path (Join-Path $projectRoot 'dist\*') -Destination $appOutput -Recurse -Force

Copy-Item -LiteralPath (Join-Path $projectRoot 'public\_headers') -Destination (Join-Path $outputPath '_headers') -Force
$redirects = @(
  '/app/profile/*  /app/index.html  200',
  '/app/post/*     /app/index.html  200',
  '/app/category/* /app/index.html  200',
  '/app/chat/*     /app/index.html  200'
) -join [Environment]::NewLine
[System.IO.File]::WriteAllText((Join-Path $outputPath '_redirects'), $redirects + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

Write-Output "Created app-only Pages bundle at $outputPath"
