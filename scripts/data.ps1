$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $repoRoot '.venv\Scripts\python.exe'

if ($args.Count -lt 1) {
    throw 'A data action is required: generate, validate, seed, reset, or export.'
}

$action = $args[0]
$forwardArgs = @($args | Select-Object -Skip 1 | Where-Object { $_ -ne '--' })
if ($action -notin @('generate', 'validate', 'seed', 'reset', 'export')) {
    throw "Unsupported data action '$action'."
}

if ($action -in @('seed', 'reset')) {
    $envFile = Join-Path $repoRoot '.env'
    if (-not (Test-Path -LiteralPath $envFile)) {
        throw 'Missing .env. Copy .env.example to .env and fill local database/bootstrap values first.'
    }
    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) { continue }
        $name = $trimmed.Substring(0, $separator).Trim()
        $value = $trimmed.Substring($separator + 1).Trim()
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, 'Process'))) {
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$python = if (Test-Path -LiteralPath $venvPython) {
    $venvPython
}
else {
    $resolved = Get-Command python -ErrorAction SilentlyContinue
    if (-not $resolved) { throw 'Python 3.12 is required. Run pnpm bootstrap first.' }
    $resolved.Source
}

$versionText = (& $python --version 2>&1 | Out-String).Trim()
if ($versionText -notmatch '^Python 3\.12\.\d+$') {
    throw "Python 3.12 is required; resolved interpreter reports '$versionText'."
}

Push-Location -LiteralPath $repoRoot
try {
    & $python -m backend.scripts.manage_simulated_data $action @forwardArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
