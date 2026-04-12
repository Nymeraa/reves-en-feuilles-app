@echo off
title Serveur Application
color 0A

echo ===========================================
echo    Lancement de l'application locale...
echo ===========================================
echo.

:: Se deplacer dans le dossier contenant ce fichier
cd /d "%~dp0"

:: Lancer le serveur dans une nouvelle fenetre
start "Serveur Application" cmd /k "npm run dev"

echo Attente du demarrage du serveur...
timeout /t 10 /nobreak >nul

:: Ouvrir le navigateur web par defaut
start http://localhost:3000

exit
