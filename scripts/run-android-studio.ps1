[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $ExpoArgs
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runningStudio = Get-Process studio64 -ErrorAction SilentlyContinue |
  Where-Object { $_.Path } |
  Select-Object -First 1
$runningStudioJbr = $null
if ($runningStudio) {
  $studioBin = Split-Path -Parent $runningStudio.Path
  $studioHome = Split-Path -Parent $studioBin
  $runningStudioJbr = Join-Path $studioHome 'jbr'
}

$studioJbrCandidates = @(
  $env:STUDIO_JDK,
  $runningStudioJbr,
  'C:\Program Files\Android\Android Studio\jbr'
) | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe')) }

$javaHome = $studioJbrCandidates | Select-Object -First 1
if (-not $javaHome) {
  throw 'Android Studio JBR was not found. Set STUDIO_JDK and try again.'
}

$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
  $androidHome = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

$adbPath = Join-Path $androidHome 'platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adbPath)) {
  throw "Android SDK platform-tools was not found: $adbPath"
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$env:Path = "$javaHome\bin;$androidHome\platform-tools;$env:Path"

Set-Location -LiteralPath $projectRoot
& corepack pnpm --filter '@tegang/mobile' exec expo run:android @ExpoArgs
exit $LASTEXITCODE
