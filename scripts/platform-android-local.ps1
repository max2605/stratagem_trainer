# Download a verified build toolchain into ignored build/; do not modify machine-wide settings.
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolsRoot = Join-Path $projectRoot 'build\toolchain'
$jdkRoot = Join-Path $toolsRoot 'jdk'
$sdkRoot = Join-Path $toolsRoot 'android-sdk'
New-Item -ItemType Directory -Path $toolsRoot, $sdkRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath $jdkRoot)) {
    $jdkMetadata = Invoke-RestMethod -Uri 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    $jdkPackage = $jdkMetadata[0].binary.package
    $jdkZip = Join-Path $toolsRoot 'jdk21.zip'
    Invoke-WebRequest -Uri $jdkPackage.link -OutFile $jdkZip
    if ((Get-FileHash -LiteralPath $jdkZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $jdkPackage.checksum.ToLowerInvariant()) { throw 'JDK checksum mismatch.' }
    Expand-Archive -LiteralPath $jdkZip -DestinationPath $jdkRoot -Force
}
$jdkDirectory = Get-ChildItem -LiteralPath $jdkRoot -Directory | Select-Object -First 1
$env:JAVA_HOME = $jdkDirectory.FullName
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:PATH = (Join-Path $env:JAVA_HOME 'bin') + [System.IO.Path]::PathSeparator + $env:PATH

$sdkManager = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path -LiteralPath $sdkManager)) {
    [xml]$sdkMetadata = (Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/repository2-3.xml').Content
    $sdkPackage = $sdkMetadata.SelectNodes('//*[local-name()="remotePackage"]') | Where-Object { $_.path -eq 'cmdline-tools;latest' }
    $sdkArchive = $sdkPackage.archives.archive | Where-Object { $_.'host-os' -eq 'windows' }
    $sdkZip = Join-Path $toolsRoot 'android-tools.zip'
    Invoke-WebRequest -Uri ('https://dl.google.com/android/repository/' + $sdkArchive.complete.url) -OutFile $sdkZip
    if ((Get-FileHash -LiteralPath $sdkZip -Algorithm SHA1).Hash.ToLowerInvariant() -ne $sdkArchive.complete.checksum.InnerText.ToLowerInvariant()) { throw 'Android tools checksum mismatch.' }
    $unpackRoot = Join-Path $toolsRoot 'sdk-unpack'
    Expand-Archive -LiteralPath $sdkZip -DestinationPath $unpackRoot -Force
    $moveSource = [System.IO.Path]::GetFullPath((Join-Path $unpackRoot 'cmdline-tools'))
    $moveTarget = [System.IO.Path]::GetFullPath((Join-Path $sdkRoot 'cmdline-tools\latest'))
    if (-not $moveSource.StartsWith($toolsRoot + [System.IO.Path]::DirectorySeparatorChar) -or -not $moveTarget.StartsWith($toolsRoot + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Toolchain path escaped the project build directory.' }
    New-Item -ItemType Directory -Path (Split-Path $moveTarget) -Force | Out-Null
    Move-Item -LiteralPath $moveSource -Destination $moveTarget
}

Write-Output 'Accepting Android SDK build licenses and installing API 36 / Build Tools 36.0.0.'
1..100 | ForEach-Object { 'y' } | & $sdkManager --sdk_root=$sdkRoot --licenses *> (Join-Path $toolsRoot 'android-licenses.log')
if ($LASTEXITCODE -ne 0) { throw 'Android SDK license setup failed. See build/toolchain/android-licenses.log.' }
& $sdkManager --sdk_root=$sdkRoot 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK setup failed.' }

Push-Location $projectRoot
try {
    & node scripts/platform-prepare.mjs android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed; run pnpm build first.' }
    Push-Location 'android/sourcecode/native'
    try {
        & .\gradlew.bat --no-daemon assembleDebug
        if ($LASTEXITCODE -ne 0) { throw 'Android compilation failed.' }
    } finally { Pop-Location }
    & node scripts/stage-platforms.mjs --platform android --artifact android/sourcecode/native/app/build/outputs/apk/debug/app-debug.apk
    if ($LASTEXITCODE -ne 0) { throw 'Android staging failed.' }
} finally { Pop-Location }
