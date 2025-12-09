@echo off
chcp 65001 >nul
title 🤖 Agents Autonomes ANA

echo.
echo ═══════════════════════════════════════════════════════════
echo          🤖 LANCEMENT AGENTS AUTONOMES ANA
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "E:\ANA\agents"
node start_agents.cjs

pause
