$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $root "build\extension"

if (-not (Test-Path -LiteralPath (Join-Path $extensionRoot "manifest.json"))) {
    throw "Build output is missing. Run npm run build first."
}

$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$dist = Join-Path $root "dist"
$destination = Join-Path $dist "danmaku-echo-v$($manifest.version).zip"

New-Item -ItemType Directory -Path $dist -Force | Out-Null

if (Test-Path -LiteralPath $destination) {
    Remove-Item -LiteralPath $destination -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::Open(
    $destination,
    [System.IO.Compression.ZipArchiveMode]::Create
)

try {
    $files = @(
        Get-Item -LiteralPath (Join-Path $extensionRoot "manifest.json")
        Get-Item -LiteralPath (Join-Path $extensionRoot "README.md")
        Get-Item -LiteralPath (Join-Path $extensionRoot "LICENSE")
        Get-ChildItem -LiteralPath (Join-Path $extensionRoot "assets") -File -Recurse
        Get-ChildItem -LiteralPath (Join-Path $extensionRoot "background") -File -Recurse
        Get-ChildItem -LiteralPath (Join-Path $extensionRoot "src") -File -Recurse
        Get-ChildItem -LiteralPath (Join-Path $extensionRoot "popup") -File -Recurse
    )

    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($extensionRoot.Length + 1).Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $file.FullName,
            $relativePath,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $archive.Dispose()
}

$verification = [System.IO.Compression.ZipFile]::OpenRead($destination)
try {
    $entryNames = @($verification.Entries | ForEach-Object { $_.FullName })

    if ($entryNames | Where-Object { $_.Contains("\") }) {
        throw "ZIP contains non-standard backslash entry names."
    }

    foreach ($required in @("manifest.json", "README.md", "LICENSE", "assets/danmaku-echo-icon.png", "assets/icons/icon-128.png", "background/service-worker.js", "src/shared.js", "src/content.js", "src/douyin-bootstrap.js", "src/douyin-page-hook.js", "src/douyin-content.js", "src/douyin-content.css", "popup/popup.html")) {
        if ($entryNames -notcontains $required) {
            throw "ZIP is missing required entry: $required"
        }
    }
}
finally {
    $verification.Dispose()
}

$hash = Get-FileHash -LiteralPath $destination -Algorithm SHA256
Write-Output "Created: $destination"
Write-Output "SHA256: $($hash.Hash)"
