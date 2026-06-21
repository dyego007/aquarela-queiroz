@echo off
chcp 65001 > nul
echo ===================================================
echo   ATUALIZADOR DE CATÁLOGO - AQUARELA QUEIROZ
echo ===================================================
echo.
echo 1. Buscando fotos e novidades do Instagram...
python sync_instagram.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao sincronizar com o Instagram.
    echo Verifique sua conexão ou se o cookies.json está atualizado.
    echo.
    pause
    exit /b
)
echo.
echo 2. Publicando atualizações no site...
git --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] Git não está instalado neste computador.
    echo As fotos foram atualizadas localmente, mas você precisará
    echo enviar os arquivos manualmente para o servidor de hospedagem.
) else (
    git add .
    git commit -m "Sincronizacao automatica do catalogo"
    git push
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [AVISO] Não foi possível enviar os dados via Git.
        echo Se você ainda não configurou a hospedagem Git (GitHub Pages),
        echo isto é normal. As fotos foram atualizadas localmente com sucesso!
    ) else (
        echo.
        echo [SUCESSO] O site live foi atualizado e estará no ar em instantes!
    )
)
echo.
echo Concluído!
pause
