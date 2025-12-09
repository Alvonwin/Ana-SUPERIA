@echo off
echo Test 1: Ouverture fenetre backend...
start "Test Backend" cmd /k "echo BACKEND OUVERT && pause"

echo.
echo Test 2: Attente 3 secondes...
timeout /t 3 /nobreak

echo.
echo Test 3: Ouverture fenetre frontend...
start "Test Frontend" cmd /k "echo FRONTEND OUVERT && pause"

echo.
echo Si tu vois 2 fenetres cmd avec BACKEND et FRONTEND, ca marche!
pause
