@echo off
setlocal EnableExtensions
title Jarvis avec FreeLLMAPI
cd /d "%~dp0"

echo.
echo ================================================
echo   Jarvis avec FreeLLMAPI - installation et lancement
echo ================================================
echo.

rem --- 0. Le projet doit etre extrait du ZIP ------------------------
if not exist "jarvis\__main__.py" (
  echo.
  echo Le dossier jarvis est introuvable a cote de ce fichier.
  echo Vous l'avez probablement ouvert depuis l'interieur du ZIP, sans l'extraire.
  echo.
  echo 1. Fermez cette fenetre.
  echo 2. Clic droit sur le fichier ZIP, puis Extraire tout.
  echo 3. Ouvrez le dossier extrait et double-cliquez de nouveau sur ce fichier.
  echo.
  pause
  exit /b 1
)

rem --- 1. Python 3.10 ou plus ------------------------------------------
set "PY="
for %%C in (python py) do (
  if not defined PY (
    %%C -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
    if not errorlevel 1 set "PY=%%C"
  )
)
if not defined PY (
  echo Python 3.10 ou plus est introuvable.
  echo.
  echo 1. Installez-le depuis https://www.python.org/downloads/
  echo 2. IMPORTANT : cochez "Add python.exe to PATH" avant de cliquer sur Install.
  echo 3. Puis double-cliquez de nouveau sur ce fichier.
  echo.
  start "" "https://www.python.org/downloads/"
  pause
  exit /b 1
)

rem --- 2. Ce dont Jarvis a besoin ---------------------------------------
%PY% -c "import anthropic" >nul 2>nul
if errorlevel 1 (
  echo Installation de ce dont Jarvis a besoin, environ une minute...
  echo.
  %PY% -m pip install "anthropic>=1.15"
  if errorlevel 1 (
    echo.
    echo L'installation a echoue. Copiez le message ci-dessus et envoyez-le moi.
    pause
    exit /b 1
  )
)

rem --- 3. Reglages de FreeLLMAPI -------------------------------------
set "ASKED="
if not defined JARVIS_GATEWAY_URL (
  set "ASKED=1"
  echo.
  echo FreeLLMAPI doit etre lance. Dans son tableau de bord, page Modeles, cadre Premiers pas :
  echo cliquez sur "Copier l'URL de base", puis collez-la ici avec un clic droit.
  echo.
  set /p "JARVIS_GATEWAY_URL=Adresse : "
)
if not defined JARVIS_GATEWAY_KEY (
  set "ASKED=1"
  echo.
  echo Au meme endroit, cliquez sur "Copier la cle API", puis collez-la ici.
  echo Ne l'envoyez a personne, pas meme a moi.
  echo.
  set /p "JARVIS_GATEWAY_KEY=Cle FreeLLMAPI : "
)
if not defined JARVIS_GATEWAY_URL (
  echo Aucune adresse saisie. Relancez ce fichier quand vous l'aurez.
  pause
  exit /b 1
)
if not defined JARVIS_GATEWAY_KEY (
  echo Aucune cle saisie. Relancez ce fichier quand vous l'aurez.
  pause
  exit /b 1
)
if defined ASKED (
  echo.
  choice /c ON /n /m "Garder ces reglages sur cet ordinateur pour la prochaine fois ? O = oui, N = non : "
  if not errorlevel 2 (
    setx JARVIS_GATEWAY_URL "%JARVIS_GATEWAY_URL%" >nul
    setx JARVIS_GATEWAY_KEY "%JARVIS_GATEWAY_KEY%" >nul
    echo Reglages enregistres dans votre compte Windows.
  )
)

:menu
echo.
echo ------------------------------------------------
echo   Que voulez-vous faire ?
echo   1  Verifier que tout fonctionne
echo   2  Ouvrir Jarvis dans le navigateur
echo   3  Parler a Jarvis dans cette fenetre
echo   4  Quitter
echo ------------------------------------------------
choice /c 1234 /n /m "Votre choix : "
if errorlevel 4 goto fin
if errorlevel 3 goto terminal
if errorlevel 2 goto web
if errorlevel 1 goto diag
goto menu

:diag
echo.
%PY% -m jarvis --diagnostic
echo.
pause
goto menu

:web
echo.
echo Jarvis demarre. Une page s'ouvre dans votre navigateur.
echo Pour l'arreter, fermez cette fenetre ou appuyez sur Ctrl et C.
echo.
%PY% -m jarvis --web
echo.
pause
goto menu

:terminal
echo.
%PY% -m jarvis
goto menu

:fin
endlocal
