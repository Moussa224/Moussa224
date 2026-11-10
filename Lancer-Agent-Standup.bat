@echo off
setlocal EnableExtensions
title Agent Standup
cd /d "%~dp0"

echo.
echo ================================================
echo   Agent Standup - vos agents IA en reunion
echo ================================================
echo.
echo Agent Standup affiche vos sessions Claude Code, Codex et Mistral Vibe
echo comme un appel video : qui travaille, qui attend, qui est bloque.
echo Il lit seulement les fichiers de sessions sur CET ordinateur, et ne
echo s'ouvre que sur cet ordinateur (http://localhost:4747). Gratuit, aucun jeton.
echo.

rem --- 1. Node.js 18 ou plus --------------------------------------------
rem Juste apres son installation, une fenetre deja ouverte ne connait pas encore
rem Node.js : on le cherche aussi a son emplacement habituel (sans parentheses :
rem le PATH de Windows en contient parfois, ce qui casserait un bloc).
where node >nul 2>nul
if errorlevel 1 if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)" >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 ou plus est introuvable.
  echo.
  echo 1. Installez la version "LTS" depuis https://nodejs.org/
  echo    Gardez les options par defaut pendant l'installation.
  echo 2. Si c'est deja fait : redemarrez l'ordinateur, puis double-cliquez
  echo    de nouveau sur ce fichier.
  echo.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)

rem --- 2. Reglages -------------------------------------------------------
rem Aucune statistique d'usage ni verification de mise a jour envoyee.
set "DO_NOT_TRACK=1"
set "NO_UPDATE_NOTIFIER=1"

:menu
echo ------------------------------------------------
echo   Que voulez-vous faire ?
echo   1  Ouvrir Agent Standup dans le navigateur
echo   2  Voir en une ligne ce qui se passe maintenant
echo   3  Quitter
echo ------------------------------------------------
choice /c 123 /n /m "Votre choix : "
if errorlevel 3 goto fin
if errorlevel 2 goto statut
if errorlevel 1 goto ouvrir
goto menu

:ouvrir
echo.
echo Agent Standup demarre. Une page s'ouvre dans votre navigateur.
echo Gardez cette fenetre ouverte. Pour l'arreter, fermez-la ou appuyez sur Ctrl et C.
echo (La premiere fois, le telechargement prend quelques secondes.)
echo.
rem Version 1.45.0 figee : c'est celle qui a ete relue avant d'etre proposee ici.
call npx --yes @double_geste/agent-standup@1.45.0 serve --port 4747 --open
if errorlevel 1 (
  echo.
  echo Agent Standup s'est arrete avec une erreur. Copiez le message ci-dessus
  echo et envoyez-le moi. Si le port 4747 est deja pris, fermez l'autre fenetre
  echo Agent Standup puis recommencez.
)
echo.
pause
goto menu

:statut
echo.
call npx --yes @double_geste/agent-standup@1.45.0 status
echo.
pause
goto menu

:fin
endlocal
