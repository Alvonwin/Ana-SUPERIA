@echo off
chcp 65001 >nul
title 🤖 Agents Autonomes Ana

echo.
echo ═══════════════════════════════════════════════════════════
echo          🤖 LANCEMENT AGENTS AUTONOMES ANA
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "E:\Mémoire Ana\agents"
node start_agents.cjs

pause
