[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
$script:failures = 0
$script:warnings = 0

function Write-Pass([string]$Message) {
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
    $script:warnings++
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail([string]$Message) {
    $script:failures++
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Read-LocalEnvironment {
    $values = @{}
    $envFile = Join-Path $repoRoot '.env'
    if (-not (Test-Path -LiteralPath $envFile)) { return $values }
    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) { continue }
        $values[$trimmed.Substring(0, $separator).Trim()] = $trimmed.Substring($separator + 1).Trim()
    }
    return $values
}

function Get-ConfiguredValue([hashtable]$Values, [string]$Name) {
    $processValue = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($processValue)) { return $processValue }
    if ($Values.ContainsKey($Name)) { return $Values[$Name] }
    return $null
}

function Get-VersionValue([string]$Text) {
    $match = [regex]::Match($Text, '(\d+\.\d+(?:\.\d+)?)')
    if (-not $match.Success) { return $null }
    try { return [version]$match.Groups[1].Value } catch { return $null }
}

function Test-CommandVersion {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$Arguments,
        [version]$Minimum,
        [version]$MaximumExclusive,
        [string]$Fix
    )
    $found = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $found) {
        Write-Fail "$Name is missing. $Fix"
        return
    }
    $output = (& $found.Source @Arguments 2>&1 | Out-String).Trim()
    $version = Get-VersionValue $output
    if (-not $version) {
        Write-Fail "$Name version could not be parsed. $Fix"
        return
    }
    if ($version -lt $Minimum) {
        Write-Fail "$Name $version is below the supported minimum $Minimum. $Fix"
        return
    }
    if ($MaximumExclusive -and $version -ge $MaximumExclusive) {
        Write-Fail "$Name $version is outside the supported range [$Minimum, $MaximumExclusive). $Fix"
        return
    }
    Write-Pass "$Name $version"
}

function Test-HttpEndpoint([string]$Name, [string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Pass "$Name is reachable at $Url"
        }
        else {
            Write-Warn "$Name returned HTTP $($response.StatusCode) at $Url"
        }
    }
    catch {
        Write-Warn "$Name is not reachable at $Url. Start the relevant service and retry."
    }
}

function Get-PortValue([hashtable]$Values, [string]$Name, [int]$Default) {
    $value = Get-ConfiguredValue -Values $Values -Name $Name
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
    $parsed = 0
    if ([int]::TryParse($value, [ref]$parsed)) { return $parsed }
    Write-Fail "$Name must be an integer port."
    return $Default
}

Push-Location -LiteralPath $repoRoot
try {
    Write-Host '=== Host ===' -ForegroundColor Cyan
    if ($IsWindows -or $env:OS -eq 'Windows_NT') { Write-Pass 'Windows host detected' } else { Write-Warn 'Non-Windows host; use direct Docker Compose commands' }
    if ($PSVersionTable.PSVersion -ge [version]'5.1') { Write-Pass "PowerShell $($PSVersionTable.PSVersion)" } else { Write-Fail 'PowerShell 5.1 or newer is required.' }

    Test-CommandVersion -Name 'Node.js' -Command 'node' -Arguments @('--version') -Minimum ([version]'24.18.0') -MaximumExclusive ([version]'25.0.0') -Fix 'Install Node.js 24 LTS and reopen PowerShell.'
    Test-CommandVersion -Name 'pnpm' -Command 'pnpm' -Arguments @('--version') -Minimum ([version]'11.9.0') -MaximumExclusive ([version]'12.0.0') -Fix 'Run corepack enable, then corepack prepare pnpm@11.9.0 --activate.'

    $venvPython = Join-Path $repoRoot '.venv\Scripts\python.exe'
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $venvPython) {
        $versionText = (& $venvPython --version 2>&1 | Out-String).Trim()
        $version = Get-VersionValue $versionText
        if ($version -ge [version]'3.12.0' -and $version -lt [version]'3.13.0') {
            Write-Pass "Python $version from repository .venv"
        }
        else { Write-Fail 'Repository .venv is not Python 3.12. Recreate it with pnpm bootstrap.' }
    }
    elseif ($pythonCommand) {
        Test-CommandVersion -Name 'Python' -Command $pythonCommand.Source -Arguments @('--version') -Minimum ([version]'3.12.0') -MaximumExclusive ([version]'3.13.0') -Fix 'Install Python 3.12 and recreate .venv.'
    }
    else { Write-Fail 'Python 3.12 is missing. Install it, then run pnpm bootstrap.' }

    Test-CommandVersion -Name 'JDK' -Command 'java' -Arguments @('-version') -Minimum ([version]'17.0.0') -MaximumExclusive ([version]'18.0.0') -Fix 'Configure JDK 17 for Expo SDK 54/Android builds.'

    Write-Host '=== Configuration ===' -ForegroundColor Cyan
    $envValues = Read-LocalEnvironment
    $envPath = Join-Path $repoRoot '.env'
    if (Test-Path -LiteralPath $envPath) {
        & git check-ignore --quiet -- .env
        if ($LASTEXITCODE -eq 0) { Write-Pass '.env exists and is Git-ignored' } else { Write-Fail '.env exists but is not Git-ignored. Do not continue until ignore rules are fixed.' }
    }
    else { Write-Fail 'Missing .env. Run Copy-Item .env.example .env and fill local values.' }

    foreach ($name in @('POSTGRES_PASSWORD', 'MODEL_PROVIDER', 'MODEL_BASE_URL', 'MODEL_NAME', 'MODEL_API_KEY')) {
        $value = Get-ConfiguredValue -Values $envValues -Name $name
        if ([string]::IsNullOrWhiteSpace($value)) { Write-Fail "$name is not configured." } else { Write-Pass "$name is configured (value redacted)" }
    }

    $composeText = Get-Content -LiteralPath (Join-Path $repoRoot 'compose.yaml') -Raw -Encoding UTF8
    if ($composeText -match '(?im)^\s*image:\s*\S*:latest\s*$') { Write-Fail 'compose.yaml contains a latest image tag.' } else { Write-Pass 'Compose image tags are explicit; no latest tag found' }
    if ($composeText -match '[A-Za-z]:\\') { Write-Fail 'compose.yaml contains a Windows absolute path.' } else { Write-Pass 'Compose contains no Windows absolute path' }

    Write-Host '=== Ports ===' -ForegroundColor Cyan
    $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port
    $ports = @{
        'Web' = Get-PortValue $envValues 'WEB_PORT' 5173
        'API' = Get-PortValue $envValues 'API_PORT' 8000
        'PostgreSQL' = Get-PortValue $envValues 'POSTGRES_PORT' 5432
        'Redis' = Get-PortValue $envValues 'REDIS_PORT' 6379
    }
    $composePortTargets = @{
        'Web' = @('web', '4173')
        'API' = @('backend', '8000')
        'PostgreSQL' = @('db', '5432')
        'Redis' = @('redis', '6379')
    }
    foreach ($entry in $ports.GetEnumerator()) {
        if ($listeners -contains $entry.Value) {
            $target = $composePortTargets[$entry.Key]
            $mapping = (& docker compose port $target[0] $target[1] 2>$null | Out-String).Trim()
            if ($mapping -match ":$($entry.Value)$") {
                Write-Pass "$($entry.Key) port $($entry.Value) is used by this Compose project"
            }
            else {
                Write-Warn "$($entry.Key) port $($entry.Value) is already in use; confirm it belongs to this project or override it in .env."
            }
        }
        else { Write-Pass "$($entry.Key) port $($entry.Value) is available" }
    }

    Write-Host '=== Docker ===' -ForegroundColor Cyan
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $docker) {
        Write-Fail 'Docker CLI is missing. Install Docker Desktop with Linux containers.'
    }
    else {
        Test-CommandVersion -Name 'Docker CLI' -Command 'docker' -Arguments @('--version') -Minimum ([version]'27.0.0') -MaximumExclusive $null -Fix 'Upgrade Docker Desktop to a supported release.'
        Test-CommandVersion -Name 'Docker Compose' -Command 'docker' -Arguments @('compose', 'version', '--short') -Minimum ([version]'2.20.0') -MaximumExclusive $null -Fix 'Install or upgrade the Docker Compose plugin.'

        $serverVersion = (& docker info --format '{{.ServerVersion}}' 2>$null | Out-String).Trim()
        if (-not $serverVersion) {
            Write-Fail 'Docker daemon is not reachable. Start Docker Desktop and select Linux containers.'
        }
        else {
            $engineVersion = Get-VersionValue $serverVersion
            if ($engineVersion -and $engineVersion -ge [version]'27.0.0') { Write-Pass "Docker Engine $engineVersion is running" } else { Write-Fail "Docker Engine '$serverVersion' is below 27.0 or could not be parsed." }

            $requiredImages = @('pgvector/pgvector:0.8.2-pg16-bookworm', 'redis:7.4.10-bookworm', 'python:3.12.13-slim-bookworm', 'node:24.18.0-bookworm-slim')
            $localImages = & docker image ls --format '{{.Repository}}:{{.Tag}}' 2>$null
            foreach ($image in $requiredImages) {
                if ($localImages -contains $image) { Write-Pass "Image present: $image" } else { Write-Warn "Image missing locally: $image; docker compose build/pull will download it." }
            }

            $serviceIds = (& docker compose ps -q 2>$null)
            if ($serviceIds) {
                Write-Pass 'Compose services exist; checking dependency commands'
                $dbName = Get-ConfiguredValue $envValues 'POSTGRES_DB'
                if (-not $dbName) { $dbName = 'tegang_smart_education' }
                $dbUser = Get-ConfiguredValue $envValues 'POSTGRES_USER'
                if (-not $dbUser) { $dbUser = 'tegang_app' }
                & docker compose exec -T db pg_isready -U $dbUser -d $dbName *> $null
                if ($LASTEXITCODE -eq 0) { Write-Pass 'PostgreSQL accepts connections' } else { Write-Fail 'PostgreSQL connection check failed. Inspect docker compose logs db.' }
                $vector = (& docker compose exec -T db psql -U $dbUser -d $dbName -tAc "SELECT extversion FROM pg_extension WHERE extname='vector'" 2>$null | Out-String).Trim()
                if ($vector) { Write-Pass "pgvector extension $vector is enabled" } else { Write-Fail 'pgvector extension is not enabled. Inspect database init logs.' }
                & docker compose exec -T redis redis-cli ping *> $null
                if ($LASTEXITCODE -eq 0) { Write-Pass 'Redis PING succeeded' } else { Write-Fail 'Redis PING failed. Inspect docker compose logs redis.' }
            }
            else { Write-Warn 'No Compose services are running.' }
        }
    }

    Write-Host '=== HTTP ===' -ForegroundColor Cyan
    $apiPort = $ports['API']
    $webPort = $ports['Web']
    Test-HttpEndpoint -Name 'API live' -Url "http://127.0.0.1:$apiPort/health/live"
    Test-HttpEndpoint -Name 'API ready' -Url "http://127.0.0.1:$apiPort/health/ready"
    Test-HttpEndpoint -Name 'Web home' -Url "http://127.0.0.1:$webPort"

    Write-Host "Summary: $script:failures failure(s), $script:warnings warning(s)." -ForegroundColor Cyan
    if ($script:failures -gt 0) { exit 1 }
}
finally {
    Pop-Location
}
