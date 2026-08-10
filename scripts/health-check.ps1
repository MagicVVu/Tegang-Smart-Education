[CmdletBinding()]
param(
    [string]$ApiUrl = 'http://127.0.0.1:8000',
    [string]$WebUrl = 'http://127.0.0.1:5173'
)

$ErrorActionPreference = 'Stop'
$failed = $false

function Test-Endpoint {
    param([string]$Name, [string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host "[PASS] $Name $Url" -ForegroundColor Green
            return
        }
        throw "HTTP $($response.StatusCode)"
    }
    catch {
        Write-Host "[FAIL] $Name $Url - $($_.Exception.Message)" -ForegroundColor Red
        $script:failed = $true
    }
}

Test-Endpoint -Name 'API live' -Url "$ApiUrl/health/live"
Test-Endpoint -Name 'API ready' -Url "$ApiUrl/health/ready"
Test-Endpoint -Name 'API dependencies' -Url "$ApiUrl/health/dependencies"
Test-Endpoint -Name 'Web home' -Url $WebUrl

if ($failed) { exit 1 }
