param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\news\data\mercado.json"),
  [string]$JsOutputPath = (Join-Path $PSScriptRoot "..\news\data\mercado.js")
)

$ErrorActionPreference = "Stop"

function Convert-ToNumber {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) {
    return $null
  }

  $raw = [string]$Value
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  $parsed = 0.0
  if ([double]::TryParse($raw, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
    return $parsed
  }

  if ([double]::TryParse($raw, [ref]$parsed)) {
    return $parsed
  }

  return $null
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  sourceCount = 2
  items       = [ordered]@{}
}

try {
  Write-Host "Lendo cotações de câmbio e cripto..."
  $quotes = Invoke-RestMethod -Uri "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL" -TimeoutSec 30

  if ($quotes.USDBRL) {
    $payload.items.USDBRL = [ordered]@{
      value     = Convert-ToNumber $quotes.USDBRL.bid
      pctChange = Convert-ToNumber $quotes.USDBRL.pctChange
    }
  }

  if ($quotes.EURBRL) {
    $payload.items.EURBRL = [ordered]@{
      value     = Convert-ToNumber $quotes.EURBRL.bid
      pctChange = Convert-ToNumber $quotes.EURBRL.pctChange
    }
  }

  if ($quotes.BTCBRL) {
    $payload.items.BTCBRL = [ordered]@{
      value     = Convert-ToNumber $quotes.BTCBRL.bid
      pctChange = Convert-ToNumber $quotes.BTCBRL.pctChange
    }
  }
} catch {
  Write-Warning "Falha ao ler cotações: $($_.Exception.Message)"
}

try {
  Write-Host "Lendo taxa Selic no Banco Central..."
  $selicResponse = Invoke-RestMethod -Uri "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json" -TimeoutSec 30
  $selicEntry = if ($selicResponse -is [array]) { $selicResponse | Select-Object -First 1 } else { $selicResponse }

  if ($selicEntry) {
    $payload.items.SELIC = [ordered]@{
      value = Convert-ToNumber $selicEntry.valor
      date  = [string]$selicEntry.data
    }
  }
} catch {
  Write-Warning "Falha ao ler Selic: $($_.Exception.Message)"
}

$hasItems = $payload.items.Keys.Count -gt 0

if (-not $hasItems -and (Test-Path -LiteralPath $OutputPath)) {
  try {
    $previousPayload = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
    if ($previousPayload -and $previousPayload.items) {
      Write-Warning "Nenhum indicador novo. Mantendo dados anteriores."
      $payload = $previousPayload
      if (-not $payload.generatedAt) {
        $payload | Add-Member -NotePropertyName generatedAt -NotePropertyValue (Get-Date).ToUniversalTime().ToString("o") -Force
      }
    }
  } catch {
    Write-Warning "Não foi possível aproveitar o arquivo anterior."
  }
}

$outputDir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$payload | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $OutputPath -Encoding UTF8

$jsJson = $payload | ConvertTo-Json -Depth 8
$jsContent = "window.ALMENARA_MARKET_DATA = $jsJson;"
$jsContent | Out-File -LiteralPath $JsOutputPath -Encoding UTF8

Write-Host "Arquivo atualizado: $OutputPath"
Write-Host "Arquivo atualizado: $JsOutputPath"
