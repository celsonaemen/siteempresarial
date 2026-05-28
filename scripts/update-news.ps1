param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\news\data\noticias.json"),
  [string]$JsOutputPath = (Join-Path $PSScriptRoot "..\news\data\noticias.js"),
  [int]$MaxItems = 24
)

$ErrorActionPreference = "Stop"

$feedSources = @(
  @{ Name = "Senado Noticias"; Url = "https://www12.senado.leg.br/noticias/rss" },
  @{ Name = "Camara Economia"; Url = "https://www.camara.leg.br/noticias/rss/dinamico/ECONOMIA" },
  @{ Name = "Camara Ultimas"; Url = "https://www.camara.leg.br/noticias/rss/ultimas-noticias" },
  @{ Name = "Portal Contabeis Noticias"; Url = "https://www.contabeis.com.br/rss/noticias/" },
  @{ Name = "Portal Contabeis Legislacao"; Url = "https://www.contabeis.com.br/rss/legislacao/" }
)

function Convert-ToPlainText {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  $decoded = [System.Net.WebUtility]::HtmlDecode($Value)
  $withoutTags = [regex]::Replace($decoded, "<[^>]+>", " ")
  return [regex]::Replace($withoutTags, "\s+", " ").Trim()
}

function Get-NodeText {
  param($Node)

  if ($null -eq $Node) {
    return ""
  }

  if ($Node -is [string]) {
    return [string]$Node
  }

  if ($Node.PSObject.Properties["#cdata-section"]) {
    return [string]$Node."#cdata-section"
  }

  if ($Node.PSObject.Properties["#text"]) {
    return [string]$Node."#text"
  }

  if ($Node.InnerText) {
    return [string]$Node.InnerText
  }

  return [string]$Node
}

function Get-FeedItems {
  param([xml]$XmlDocument)

  $items = @()

  if ($XmlDocument.rss -and $XmlDocument.rss.channel -and $XmlDocument.rss.channel.item) {
    $items += @($XmlDocument.rss.channel.item)
  }

  if ($XmlDocument.feed -and $XmlDocument.feed.entry) {
    $items += @($XmlDocument.feed.entry)
  }

  if ($XmlDocument.RDF -and $XmlDocument.RDF.item) {
    $items += @($XmlDocument.RDF.item)
  }

  if ($XmlDocument."rdf:RDF" -and $XmlDocument."rdf:RDF".item) {
    $items += @($XmlDocument."rdf:RDF".item)
  }

  return $items
}

function Get-ItemLink {
  param($Item)

  foreach ($candidate in @($Item.link)) {
    if ($null -eq $candidate) {
      continue
    }

    $textLink = Convert-ToPlainText (Get-NodeText $candidate)
    if ($textLink) {
      return $textLink
    }

    if ($candidate.PSObject.Properties["href"]) {
      $hrefLink = Convert-ToPlainText ([string]$candidate.href)
      if ($hrefLink) {
        return $hrefLink
      }
    }

    if ($candidate.Attributes -and $candidate.Attributes["href"]) {
      $attrLink = Convert-ToPlainText ([string]$candidate.Attributes["href"].Value)
      if ($attrLink) {
        return $attrLink
      }
    }
  }

  if ($Item.guid) {
    $guidLink = Convert-ToPlainText (Get-NodeText $Item.guid)
    if ($guidLink -like "http*") {
      return $guidLink
    }
  }

  return ""
}

function Get-ItemSummary {
  param($Item)

  $summaryCandidates = @(
    $Item.description,
    $Item.summary,
    $Item.content,
    $Item."content:encoded"
  )

  foreach ($candidate in $summaryCandidates) {
    $value = Convert-ToPlainText (Get-NodeText $candidate)
    if ($value) {
      return $value
    }
  }

  return ""
}

function Get-ItemPublishedAt {
  param($Item)

  $dateCandidates = @(
    $Item.pubDate,
    $Item.published,
    $Item.updated
  )

  foreach ($candidate in $dateCandidates) {
    $rawValue = Convert-ToPlainText (Get-NodeText $candidate)
    if (-not $rawValue) {
      continue
    }

    try {
      return [DateTimeOffset]::Parse($rawValue, [Globalization.CultureInfo]::InvariantCulture)
    } catch {
      try {
        return [DateTimeOffset]::Parse($rawValue)
      } catch {
        continue
      }
    }
  }

  return $null
}

$collected = New-Object System.Collections.Generic.List[object]

foreach ($feed in $feedSources) {
  try {
    Write-Host "Lendo feed: $($feed.Name)"
    $response = Invoke-WebRequest -Uri $feed.Url -UseBasicParsing -TimeoutSec 30
    [xml]$xml = $response.Content
    $items = Get-FeedItems -XmlDocument $xml

    foreach ($item in $items) {
      $title = Convert-ToPlainText (Get-NodeText $item.title)
      $url = Get-ItemLink -Item $item

      if (-not $title -or -not $url) {
        continue
      }

      $publishedAt = Get-ItemPublishedAt -Item $item
      $summary = Get-ItemSummary -Item $item

      $collected.Add([PSCustomObject]@{
          title       = $title
          url         = $url
          source      = $feed.Name
          publishedAt = if ($publishedAt) { $publishedAt.ToString("o") } else { "" }
          summary     = $summary
          sortKey     = if ($publishedAt) { $publishedAt.UtcDateTime } else { [DateTime]::MinValue }
        })
    }
  } catch {
    Write-Warning "Falha ao ler feed $($feed.Name): $($_.Exception.Message)"
  }
}

$topItems = $collected |
  Group-Object -Property url |
  ForEach-Object { $_.Group | Select-Object -First 1 } |
  Sort-Object -Property sortKey -Descending |
  Select-Object -First $MaxItems |
  Select-Object title, url, source, publishedAt, summary

$outputDir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

if ((@($topItems).Count -eq 0) -and (Test-Path -LiteralPath $OutputPath)) {
  try {
    $existingPayload = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
    if ($existingPayload -and $existingPayload.items -and @($existingPayload.items).Count -gt 0) {
      Write-Warning "Nenhum feed carregado. Mantendo noticias anteriores do arquivo atual."
      $topItems = @($existingPayload.items) | Select-Object -First $MaxItems
    }
  } catch {
    Write-Warning "Nao foi possivel ler o arquivo anterior. O JSON sera salvo vazio."
  }
}

$payload = [PSCustomObject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  sourceCount = $feedSources.Count
  itemCount   = @($topItems).Count
  items       = @($topItems)
}

$payload |
  ConvertTo-Json -Depth 8 |
  Out-File -LiteralPath $OutputPath -Encoding UTF8

$jsJson = $payload | ConvertTo-Json -Depth 8
$jsContent = "window.ALMENARA_NEWS_DATA = $jsJson;"
$jsContent | Out-File -LiteralPath $JsOutputPath -Encoding UTF8

Write-Host "Arquivo atualizado: $OutputPath"
Write-Host "Arquivo atualizado: $JsOutputPath"
Write-Host "Noticias geradas: $(@($topItems).Count)"
