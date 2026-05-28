Atualizacao automatica da pagina News

Arquivos principais:
- news/index.html
- news/news.css
- news/news.js
- news/data/noticias.json
- news/data/noticias.js
- scripts/update-news.ps1

Como atualizar o feed manualmente:
1) Abrir PowerShell na raiz do projeto
2) Executar:
   powershell -ExecutionPolicy Bypass -File .\scripts\update-news.ps1

Opcional - limitar quantidade:
   powershell -ExecutionPolicy Bypass -File .\scripts\update-news.ps1 -MaxItems 12

Observacao:
- O script gera JSON e JS.
- O JS (window.ALMENARA_NEWS_DATA) garante exibicao mesmo abrindo a pagina em file://.

Agendamento automatico (sugestao):
- Criar tarefa no Agendador do Windows para rodar o script a cada 1 hora.
- Acao da tarefa:
  Programa/script: powershell.exe
  Argumentos: -ExecutionPolicy Bypass -File "C:\caminho\do\projeto\scripts\update-news.ps1"
