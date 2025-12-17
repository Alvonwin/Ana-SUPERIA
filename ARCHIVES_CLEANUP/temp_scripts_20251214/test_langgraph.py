"""
Test complet de l'agent LangGraph pour Ana
"""
import sys
sys.path.insert(0, "E:/ANA/server/agents")

from langgraph_agent import run_agent_task

print("=== TEST 1: Lire un fichier ===")
result = run_agent_task("Lis le fichier E:/ANA/.env et dis-moi si la clé GROQ_API_KEY existe")
print(f"Status: {result['status']}")
print(f"Tentatives: {result['attempts']}")
print(f"Dernier résultat: {result['result'][:200] if result['result'] else 'Aucun'}")
print()

print("=== TEST 2: Tâche simple ===")
result2 = run_agent_task("Calcule 2+2 et dis-moi le résultat")
print(f"Status: {result2['status']}")
print(f"Tentatives: {result2['attempts']}")
print()

print("=== TEST TERMINÉ ===")
