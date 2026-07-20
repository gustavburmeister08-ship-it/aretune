param(
  [string]$WebsiteOrigin = "https://c24375a1.uebermensch-ai.pages.dev",
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

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

$origin = $WebsiteOrigin.TrimEnd('/')
$queue = [System.Collections.Generic.Queue[string]]::new()
$queued = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$downloaded = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$seedPaths = @('/', '/robots.txt', '/sitemap.xml', '/site.webmanifest')

foreach ($seedPath in $seedPaths) {
  if ($queued.Add($seedPath)) {
    $queue.Enqueue($seedPath)
  }
}

$assetPattern = '(?<=[''"(=:\s])/(?:[A-Za-z0-9._@%+~!$&'',()=-]+/)*[A-Za-z0-9._@%+~!$&'',()=-]+\.(?:css|js|json|webmanifest|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|mp4|webm|xml|txt)'
$textTypes = @('text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'application/manifest+json', 'application/xml', 'text/xml', 'text/plain')

while ($queue.Count -gt 0) {
  $requestPath = $queue.Dequeue()
  $requestUri = "$origin$requestPath"

  try {
    $response = Invoke-WebRequest -Uri $requestUri -UseBasicParsing -TimeoutSec 60
  } catch {
    Write-Warning "Skipping unavailable website asset: $requestPath"
    continue
  }

  $mediaType = (($response.Headers['Content-Type'] -split ';')[0]).Trim().ToLowerInvariant()
  if ($requestPath -ne '/' -and $mediaType -eq 'text/html') {
    continue
  }

  $relativePath = if ($requestPath -eq '/') { 'index.html' } else { $requestPath.TrimStart('/') }
  $relativePath = [System.Uri]::UnescapeDataString(($relativePath -split '\?')[0])
  $destination = Join-Path $outputPath ($relativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
  $destinationDirectory = Split-Path -Parent $destination
  New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

  $bytes = if ($response.Content -is [byte[]]) {
    $response.Content
  } else {
    [System.Text.Encoding]::UTF8.GetBytes([string]$response.Content)
  }
  [System.IO.File]::WriteAllBytes($destination, $bytes)
  $downloaded.Add($requestPath) | Out-Null

  if ($textTypes -contains $mediaType) {
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    foreach ($match in [regex]::Matches($text, $assetPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
      $assetPath = $match.Value
      if ($queued.Add($assetPath)) {
        $queue.Enqueue($assetPath)
      }
    }
  }
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

Write-Output "Created combined Pages bundle at $outputPath"
Write-Output "Downloaded $($downloaded.Count) files from the immutable website deployment."
