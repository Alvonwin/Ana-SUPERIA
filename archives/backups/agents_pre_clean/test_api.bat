@echo off
REM Script de test rapide de l'API Dashboard

echo.
echo ================================================================
echo   TEST API DASHBOARD AGENTS
echo ================================================================
echo.

echo Test 1: Status complet
echo.
curl -s http://localhost:3336/api/status
echo.
echo.

echo Test 2: Evenements recents
echo.
curl -s http://localhost:3336/api/events?limit=5
echo.
echo.

echo Test 3: Statut agents
echo.
curl -s http://localhost:3336/api/agents
echo.
echo.

echo ================================================================
echo   TESTS TERMINES
echo ================================================================
echo.
echo Dashboard disponible sur: http://localhost:3336
echo.
pause
