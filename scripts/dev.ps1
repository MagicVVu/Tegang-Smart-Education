[CmdletBinding()]
param(
    [ValidateSet('install', 'backend', 'identity-bootstrap', 'model-check', 'test', 'migrate', 'migration-check')]
    [string]$Target = 'backend'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $repoRoot '.venv\Scripts\python.exe'

function Import-LocalEnvironment {
    $envFile = Join-Path $repoRoot '.env'
    if (-not (Test-Path -LiteralPath $envFile)) {
        throw "Missing .env. Copy .env.example to .env and fill local values first."
    }

    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) { continue }
        $name = $trimmed.Substring(0, $separator).Trim()
        $value = $trimmed.Substring($separator + 1).Trim()
        $existing = [Environment]::GetEnvironmentVariable($name, 'Process')
        if ([string]::IsNullOrWhiteSpace($existing)) {
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

function Resolve-Python {
    if (Test-Path -LiteralPath $venvPython) { return $venvPython }
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) { return $python.Source }
    throw 'Python 3.12 is required. Install it, reopen PowerShell, then run pnpm bootstrap.'
}

function Assert-Python312([string]$PythonPath) {
    $versionText = (& $PythonPath --version 2>&1 | Out-String).Trim()
    if ($versionText -notmatch '^Python 3\.12\.\d+$') {
        throw "Python 3.12 is required; resolved interpreter reports '$versionText'."
    }
}

Push-Location -LiteralPath $repoRoot
try {
    switch ($Target) {
        'install' {
            pnpm install --frozen-lockfile
            $basePython = Resolve-Python
            Assert-Python312 -PythonPath $basePython
            if (-not (Test-Path -LiteralPath $venvPython)) {
                & $basePython -m venv .venv
            }
            Assert-Python312 -PythonPath $venvPython
            & $venvPython -m pip install --require-hashes -r requirements.lock
            Write-Host '[PASS] Node and Python dependencies installed from lock files.' -ForegroundColor Green
        }
        'backend' {
            Import-LocalEnvironment
            $python = Resolve-Python
            Assert-Python312 -PythonPath $python
            $hostAddress = if ([string]::IsNullOrWhiteSpace($env:APP_HOST)) { '127.0.0.1' } else { $env:APP_HOST }
            $portText = if ([string]::IsNullOrWhiteSpace($env:APP_PORT)) { '8000' } else { $env:APP_PORT }
            $port = 0
            if (-not [int]::TryParse($portText, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
                throw 'APP_PORT must be an integer from 1 through 65535.'
            }
            & $python -m uvicorn backend.app.main:app --host $hostAddress --port $port --reload
        }
        'identity-bootstrap' {
            Import-LocalEnvironment
            $python = Resolve-Python
            Assert-Python312 -PythonPath $python
            & $python -m backend.scripts.bootstrap_identity
        }
        'model-check' {
            Import-LocalEnvironment
            $python = Resolve-Python
            Assert-Python312 -PythonPath $python
            & $python -m backend.scripts.check_model
        }
        'test' {
            $python = Resolve-Python
            Assert-Python312 -PythonPath $python
            & $python -m pytest backend/tests
        }
        'migrate' {
            Import-LocalEnvironment
            $python = Resolve-Python
            Assert-Python312 -PythonPath $python
            & $python -m alembic -c backend/alembic.ini upgrade head
        }
        'migration-check' {
            Import-LocalEnvironment
            $python = Resolve-Python
            Assert-Python312 -PythonPath $python
            & $python -m backend.scripts.verify_migrations
        }
    }
}
finally {
    Pop-Location
}
