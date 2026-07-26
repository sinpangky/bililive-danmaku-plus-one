param(
    [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $root "build\extension"

if (-not (Test-Path -LiteralPath (Join-Path $extensionRoot "manifest.json"))) {
    throw "Build output is missing. Run npm run build first."
}

$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$dist = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    Join-Path $root "dist"
}
elseif ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
    [System.IO.Path]::GetFullPath($OutputDirectory)
}
else {
    [System.IO.Path]::GetFullPath((Join-Path $root $OutputDirectory))
}
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
    $files = @(Get-ChildItem -LiteralPath $extensionRoot -File -Recurse | Where-Object {
        $_.FullName -ne (Join-Path $extensionRoot "LICENSE")
    })

    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($extensionRoot.Length + 1).Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $file.FullName,
            $relativePath,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }

    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $archive,
        (Join-Path $root "LICENSE"),
        "LICENSE",
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
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

    foreach ($required in @("manifest.json", "LICENSE", "index.html", "assets/danmaku-echo-icon.png", "assets/icons/icon-128.png", "background/service-worker.js", "src/shared.js", "src/content.js", "src/douyin-bootstrap.js", "src/douyin-page-hook.js", "src/douyin-content.js", "src/douyin-content.css")) {
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
