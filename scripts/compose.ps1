[CmdletBinding()]
param(
    [ValidateSet('infra', 'up', 'down', 'logs', 'clean', 'reset', 'restart')]
    [string]$Action = 'up',
    [switch]$ConfirmDataLoss
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$script:buildStageParent = $null

function Import-LocalEnvironment {
    $envFile = Join-Path $repoRoot '.env'
    if (-not (Test-Path -LiteralPath $envFile)) { return }

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

function Invoke-Compose([string[]]$Arguments) {
    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

function Test-ContainsNonAscii([string]$Path) {
    return [bool]($Path -match '[^\x00-\x7F]')
}

function New-AsciiBuildStage {
    $candidates = @($env:TEMP, $env:TMP, (Join-Path $env:SystemRoot 'Temp')) |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique

    foreach ($candidate in $candidates) {
        try {
            $fullCandidate = [System.IO.Path]::GetFullPath($candidate)
            if (Test-ContainsNonAscii -Path $fullCandidate) { continue }
            if (-not (Test-Path -LiteralPath $fullCandidate)) {
                New-Item -ItemType Directory -Path $fullCandidate | Out-Null
            }
            $stage = Join-Path $fullCandidate ("tegang-c04-build-$PID-$([guid]::NewGuid().ToString('N'))")
            New-Item -ItemType Directory -Path $stage | Out-Null
            $script:buildStageParent = $fullCandidate
            return $stage
        }
        catch {
            continue
        }
    }

    throw 'No writable ASCII-only temporary directory is available for the Docker build context.'
}

function Copy-BuildContext([string]$Destination) {
    $excludedDirectories = @(
        '.git', '.venv', 'venv', 'node_modules', '.pnpm-store',
        'dist', 'build', '__pycache__', '.pytest_cache'
    )
    $excludedFiles = @(
        '.git', '.env', 'local.properties', '*.keystore', '*.jks'
    )
    $arguments = @(
        $repoRoot, $Destination, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
        '/XD'
    ) + $excludedDirectories + @('/XF') + $excludedFiles

    & robocopy @arguments | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "Failed to create the ASCII Docker build context; robocopy exit code $LASTEXITCODE."
    }
}

function Remove-BuildStage([string]$Stage) {
    if ([string]::IsNullOrWhiteSpace($Stage) -or -not (Test-Path -LiteralPath $Stage)) { return }
    $leaf = Split-Path -Leaf $Stage
    if ($leaf -notlike 'tegang-c04-build-*') {
        throw "Refusing to remove unexpected build stage: $Stage"
    }
    $resolvedParent = [System.IO.Path]::GetFullPath((Split-Path -Parent $Stage))
    if ([string]::IsNullOrWhiteSpace($script:buildStageParent) -or
        -not $resolvedParent.Equals($script:buildStageParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a build stage outside the selected temporary root: $Stage"
    }
    Remove-Item -LiteralPath $Stage -Recurse -Force
}

function Invoke-ComposeBuild {
    if (-not (Test-ContainsNonAscii -Path $repoRoot)) {
        Invoke-Compose -Arguments @('build')
        return
    }

    $stage = $null
    try {
        $stage = New-AsciiBuildStage
        Write-Warning "Docker BuildKit cannot reliably build from this non-ASCII Windows path. Using a secret-free temporary build context: $stage"
        Copy-BuildContext -Destination $stage
        Push-Location -LiteralPath $stage
        try {
            Invoke-Compose -Arguments @('build')
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Remove-BuildStage -Stage $stage
    }
}

Import-LocalEnvironment
Push-Location -LiteralPath $repoRoot
try {
    switch ($Action) {
        'infra' { Invoke-Compose -Arguments @('up', '-d', 'db', 'redis') }
        'up' {
            Invoke-ComposeBuild
            Invoke-Compose -Arguments @('up', '--no-build', '-d')
        }
        'down' { Invoke-Compose -Arguments @('down') }
        'logs' { Invoke-Compose -Arguments @('logs', '-f') }
        'clean' { Invoke-Compose -Arguments @('down', '--remove-orphans') }
        'restart' { Invoke-Compose -Arguments @('restart') }
        'reset' {
            if (-not $ConfirmDataLoss) {
                Write-Host '[REFUSED] Reset deletes the PostgreSQL and Redis named volumes. Re-run with -ConfirmDataLoss only after backup/review.' -ForegroundColor Red
                exit 2
            }
            Write-Warning 'Deleting the project PostgreSQL and Redis persistent volumes.'
            Invoke-Compose -Arguments @('down', '--volumes', '--remove-orphans')
        }
    }
}
finally {
    Pop-Location
}
