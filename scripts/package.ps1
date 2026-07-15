$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $root "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
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
        Get-Item -LiteralPath (Join-Path $root "manifest.json")
        Get-Item -LiteralPath (Join-Path $root "README.md")
        Get-Item -LiteralPath (Join-Path $root "LICENSE")
        Get-ChildItem -LiteralPath (Join-Path $root "assets") -File -Recurse
        Get-ChildItem -LiteralPath (Join-Path $root "src") -File -Recurse
        Get-ChildItem -LiteralPath (Join-Path $root "popup") -File -Recurse
    )

    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($root.Length + 1).Replace("\", "/")
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

    foreach ($required in @("manifest.json", "README.md", "LICENSE", "assets/danmaku-echo-icon.png", "assets/icons/icon-128.png", "src/shared.js", "src/content.js", "src/douyin-page-hook.js", "src/douyin-content.js", "src/douyin-content.css", "popup/popup.html")) {
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
