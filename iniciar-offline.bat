@echo off
setlocal

cd /d "%~dp0"
title Gerador de Arvores Zelda BOTW

set "PORT=3000"
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "VITE_CLI=%~dp0node_modules\vite\bin\vite.js"

if not exist "%NODE_EXE%" (
  echo.
  echo ERRO: Node.js nao foi encontrado em:
  echo   %NODE_EXE%
  echo.
  echo Instale o Node.js e tente novamente.
  pause
  exit /b 1
)

if not exist "%VITE_CLI%" (
  echo.
  echo ERRO: As dependencias locais do jogo nao estao instaladas.
  echo O modo offline requer a pasta node_modules dentro do projeto.
  echo.
  echo Conecte-se a internet uma vez, instale as dependencias e tente novamente.
  pause
  exit /b 1
)

echo Iniciando o jogo offline em http://127.0.0.1:%PORT%/
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

start "" "http://127.0.0.1:%PORT%/"
"%NODE_EXE%" "%VITE_CLI%" --host 127.0.0.1 --port %PORT% --strictPort

if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o jogo. Verifique as mensagens acima.
  pause
)

endlocal
