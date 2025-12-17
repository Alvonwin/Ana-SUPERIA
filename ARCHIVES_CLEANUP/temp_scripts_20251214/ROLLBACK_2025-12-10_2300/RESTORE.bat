@echo off
echo === ROLLBACK COMPLET 2025-12-10 23:00 ===
echo.
echo ATTENTION: Ceci va restaurer tous les fichiers a leur etat de 23h07
echo.
pause

copy /Y "E:\ANA\temp\ROLLBACK_2025-12-10_2300\ana-core.cjs" "E:\ANA\server\ana-core.cjs"
copy /Y "E:\ANA\temp\ROLLBACK_2025-12-10_2300\semantic-router.cjs" "E:\ANA\server\intelligence\semantic-router.cjs"
copy /Y "E:\ANA\temp\ROLLBACK_2025-12-10_2300\ana-consciousness.cjs" "E:\ANA\server\intelligence\ana-consciousness.cjs"
copy /Y "E:\ANA\temp\ROLLBACK_2025-12-10_2300\llm-orchestrator.cjs" "E:\ANA\server\core\llm-orchestrator.cjs"
copy /Y "E:\ANA\temp\ROLLBACK_2025-12-10_2300\tool-agent.cjs" "E:\ANA\server\agents\tool-agent.cjs"

echo.
echo === ROLLBACK TERMINE ===
echo Redemarre Ana pour appliquer les changements.
pause
