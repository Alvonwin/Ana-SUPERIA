@echo off
chcp 65001 >nul
title 🤖 Agents Autonomes Claude

echo.
echo ═══════════════════════════════════════════════════════════
echo          🤖 LANCEMENT AGENTS AUTONOMES CLAUDE
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "E:\Mémoire Claude\agents"
node start_agents.cjs

pause
