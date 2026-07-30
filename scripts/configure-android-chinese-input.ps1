[CmdletBinding()]
param(
  [string] $DeviceId
)

$ErrorActionPreference = 'Stop'

$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
  $androidHome = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

$adbPath = Join-Path $androidHome 'platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adbPath)) {
  throw "Android SDK platform-tools was not found: $adbPath"
}

if (-not $DeviceId) {
  $onlineDevices = @(
    & $adbPath devices |
      Select-Object -Skip 1 |
      ForEach-Object {
        if ($_ -match '^(\S+)\s+device$') {
          $Matches[1]
        }
      }
  )

  if ($onlineDevices.Count -eq 0) {
    throw 'No online Android emulator or device was found. Start the emulator and try again.'
  }

  $DeviceId = $onlineDevices[0]
}

$gboardIme = 'com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME'
$installedImes = & $adbPath -s $DeviceId shell ime list -s
if ($installedImes -notcontains $gboardIme) {
  throw 'Gboard was not found on this Android device. Install or enable Gboard first.'
}

& $adbPath -s $DeviceId shell ime enable $gboardIme | Out-Null
& $adbPath -s $DeviceId shell ime set $gboardIme | Out-Null
& $adbPath -s $DeviceId shell settings put secure show_ime_with_hard_keyboard 1

$imeDetails = (& $adbPath -s $DeviceId shell ime list -a) -join "`n"
$chinesePinyinSubtype = [regex]::Match(
  $imeDetails,
  'mSubtypeLocale=zh_CN.*?mSubtypeHashCode=(-?\d+)'
)

Write-Host "Android device: $DeviceId"
Write-Host 'Gboard is active, and the on-screen keyboard will stay available with the PC keyboard.'

if ($chinesePinyinSubtype.Success) {
  $subtypeId = $chinesePinyinSubtype.Groups[1].Value
  & $adbPath -s $DeviceId shell settings put secure selected_input_method_subtype $subtypeId
  & $adbPath -s $DeviceId shell ime set $gboardIme | Out-Null
  Write-Host "Chinese (Simplified) Pinyin is selected. Subtype: $subtypeId"
  Write-Host 'Focus an app input field and type Pinyin with the PC keyboard.'
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Complete this once in the Android window:'
Write-Host '1. Open Languages, then choose Add keyboard.'
Write-Host '2. Select Chinese (Simplified), choose Pinyin, and confirm.'
Write-Host '3. Run this VS Code task again to select Chinese Pinyin automatically.'
Write-Host ''

$gboardSettings =
  'com.google.android.inputmethod.latin/com.google.android.apps.inputmethod.latin.preference.SettingsActivity'
& $adbPath -s $DeviceId shell am start -n $gboardSettings

if ($LASTEXITCODE -ne 0) {
  & $adbPath -s $DeviceId shell am start `
    -a android.settings.INPUT_METHOD_SUBTYPE_SETTINGS `
    --es input_method_id $gboardIme
}

exit $LASTEXITCODE
