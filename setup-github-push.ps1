param(
  [Parameter(Mandatory = $true)]
  [string]$UserName,

  [Parameter(Mandatory = $true)]
  [string]$UserEmail,

  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl,

  [string]$Branch = "main",
  [string]$CommitMessage = "SITEALMENARA: snapshot inicial para publicacao"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "Git nao encontrado no PATH. Instale o Git primeiro e rode novamente."
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath ".git")) {
  git init | Out-Null
}

git config user.name "$UserName"
git config user.email "$UserEmail"

git add .

$hasChanges = (& git status --porcelain)
if ($hasChanges) {
  git commit -m "$CommitMessage" | Out-Null
}

git branch -M "$Branch"

$existingRemote = (& git remote)
if ($existingRemote -contains "origin") {
  git remote set-url origin "$RemoteUrl"
} else {
  git remote add origin "$RemoteUrl"
}

Write-Host ""
Write-Host "Repositorio configurado com sucesso."
Write-Host "Agora execute:"
Write-Host "git push -u origin $Branch"
