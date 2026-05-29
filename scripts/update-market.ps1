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

function Convert-ToBrazilDate {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) {
    return $null
  }

  $raw = [string]$Value
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  $culture = [Globalization.CultureInfo]::GetCultureInfo("pt-BR")
  try {
    return [DateTime]::ParseExact($raw, "dd/MM/yyyy", $culture)
  } catch {
    try {
      return [DateTime]::Parse($raw, $culture)
    } catch {
      return $null
    }
  }
}

$previousPayload = $null
if (Test-Path -LiteralPath $OutputPath) {
  try {
    $previousPayload = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
  } catch {
    Write-Warning "Nao foi possivel aproveitar o arquivo anterior."
  }
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  sourceCount = 2
  items       = [ordered]@{}
}

function Get-PreviousMarketItem {
  param([string]$Key)

  if (-not $previousPayload -or -not $previousPayload.items) {
    return $null
  }

  $property = $previousPayload.items.PSObject.Properties[$Key]
  if ($property) {
    return $property.Value
  }

  return $null
}

function Use-PreviousMarketItem {
  param(
    [string]$Key,
    [string]$Reason,
    [switch]$RejectFutureDate
  )

  $previousItem = Get-PreviousMarketItem -Key $Key
  if ($null -eq $previousItem) {
    Write-Warning "$Reason Sem dado anterior para $Key."
    return $false
  }

  if ($RejectFutureDate -and $previousItem.PSObject.Properties["date"]) {
    $previousDate = Convert-ToBrazilDate $previousItem.date
    if ($previousDate -and $previousDate.Date -gt (Get-Date).Date) {
      Write-Warning "$Reason Dado anterior de $Key tambem tem data futura e foi ignorado."
      return $false
    }
  }

  $payload.items[$Key] = $previousItem
  Write-Warning "$Reason Mantendo dado anterior para $Key."
  return $true
}

function Set-QuoteMarketItem {
  param(
    [string]$Key,
    [AllowNull()][object]$Quote
  )

  if ($null -eq $Quote) {
    [void](Use-PreviousMarketItem -Key $Key -Reason "Cotacao nova indisponivel.")
    return
  }

  $value = Convert-ToNumber $Quote.bid
  if ($null -eq $value -or $value -le 0) {
    [void](Use-PreviousMarketItem -Key $Key -Reason "Cotacao nova invalida.")
    return
  }

  $payload.items[$Key] = [ordered]@{
    value     = $value
    pctChange = Convert-ToNumber $Quote.pctChange
  }
}

try {
  Write-Host "Lendo cotacoes de cambio e cripto..."
  $quotes = Invoke-RestMethod -Uri "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL" -TimeoutSec 30

  Set-QuoteMarketItem -Key "USDBRL" -Quote $quotes.USDBRL
  Set-QuoteMarketItem -Key "EURBRL" -Quote $quotes.EURBRL
  Set-QuoteMarketItem -Key "BTCBRL" -Quote $quotes.BTCBRL
} catch {
  Write-Warning "Falha ao ler cotacoes: $($_.Exception.Message)"
}

foreach ($quoteKey in @("USDBRL", "EURBRL", "BTCBRL")) {
  if (-not $payload.items.Contains($quoteKey)) {
    [void](Use-PreviousMarketItem -Key $quoteKey -Reason "Cotacao nova indisponivel.")
  }
}

try {
  Write-Host "Lendo taxa Selic no Banco Central..."
  $selicResponse = Invoke-RestMethod -Uri "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json" -TimeoutSec 30
  $selicEntry = if ($selicResponse -is [array]) { $selicResponse | Select-Object -First 1 } else { $selicResponse }

  if ($selicEntry) {
    $selicValue = Convert-ToNumber $selicEntry.valor
    $selicDate = Convert-ToBrazilDate $selicEntry.data

    if ($null -eq $selicValue) {
      [void](Use-PreviousMarketItem -Key "SELIC" -Reason "Valor novo da Selic invalido." -RejectFutureDate)
    } elseif ($selicDate -and $selicDate.Date -gt (Get-Date).Date) {
      [void](Use-PreviousMarketItem -Key "SELIC" -Reason "Selic nova veio com data futura." -RejectFutureDate)
    } else {
      $payload.items["SELIC"] = [ordered]@{
        value = $selicValue
        date  = [string]$selicEntry.data
      }
    }
  }
} catch {
  Write-Warning "Falha ao ler Selic: $($_.Exception.Message)"
}

if (-not $payload.items.Contains("SELIC")) {
  [void](Use-PreviousMarketItem -Key "SELIC" -Reason "Selic nova indisponivel." -RejectFutureDate)
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
