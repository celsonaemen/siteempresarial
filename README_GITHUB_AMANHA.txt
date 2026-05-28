Publicacao no GitHub (amanha)

1) Instalar Git for Windows.
2) Abrir PowerShell na pasta do projeto:
   C:\Users\Usuario\SITEALMENARA_STAGING

3) Rodar o script de preparacao:
   powershell -ExecutionPolicy Bypass -File .\setup-github-push.ps1 `
     -UserName "SEU_NOME" `
     -UserEmail "SEU_EMAIL" `
     -RemoteUrl "https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git"

4) Fazer o push:
   git push -u origin main

Observacoes:
- Backup local salvo em: versions\v1.1
- A pasta versions esta ignorada no .gitignore.
