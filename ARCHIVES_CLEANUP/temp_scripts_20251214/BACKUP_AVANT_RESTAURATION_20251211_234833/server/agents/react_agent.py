"""
ReAct Agent pour Ana SUPERIA
Agent avec pattern Reason+Act, sans dépendre du tool-calling natif de Groq

Pattern ReAct:
1. THOUGHT: Le LLM réfléchit à la tâche
2. ACTION: Le LLM décide quelle action prendre (en JSON)
3. OBSERVATION: On exécute l'action et on donne le résultat au LLM
4. REPEAT jusqu'à FINAL_ANSWER

Ce pattern contourne les limitations du tool-calling de Llama/Groq.
"""

import os
import json
import re
from typing import TypedDict, Optional
from dotenv import load_dotenv

# LangChain + Groq
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Charger les variables d'environnement
load_dotenv("E:/ANA/.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# === Configuration du LLM Groq (sans tools binding) ===
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile",
    temperature=0.1,
    max_tokens=2048
)

# === Définition des Tools (fonctions simples) ===

def read_file(file_path: str) -> str:
    """Lit le contenu d'un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Limiter la taille pour ne pas surcharger le contexte
        if len(content) > 2000:
            content = content[:2000] + f"\n... (tronqué, {len(content)} caractères au total)"
        return f"CONTENU DU FICHIER:\n{content}"
    except Exception as e:
        return f"ERREUR: {str(e)}"

def write_file(file_path: str, content: str) -> str:
    """Écrit du contenu dans un fichier"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"SUCCÈS: Fichier écrit ({len(content)} caractères)"
    except Exception as e:
        return f"ERREUR: {str(e)}"

def execute_python(code: str) -> str:
    """Exécute du code Python simple"""
    try:
        # Environnement avec quelques builtins sécurisés
        safe_builtins = {
            'print': print, 'len': len, 'str': str, 'int': int, 'float': float,
            'list': list, 'dict': dict, 'range': range, 'enumerate': enumerate,
            'sum': sum, 'min': min, 'max': max, 'sorted': sorted,
            'True': True, 'False': False, 'None': None
        }
        local_vars = {}
        exec(code, {"__builtins__": safe_builtins}, local_vars)
        return f"SUCCÈS: Code exécuté. Résultat: {local_vars}"
    except Exception as e:
        return f"ERREUR: {str(e)}"

def list_directory(path: str) -> str:
    """Liste les fichiers d'un répertoire"""
    try:
        files = os.listdir(path)
        return f"FICHIERS dans {path}:\n" + "\n".join(files[:50])
    except Exception as e:
        return f"ERREUR: {str(e)}"

# Mapping des tools
TOOLS = {
    "read_file": read_file,
    "write_file": write_file,
    "execute_python": execute_python,
    "list_directory": list_directory,
}

# === Prompt Système ReAct ===

REACT_SYSTEM_PROMPT = """Tu es Ana SUPERIA. Tu DOIS utiliser les outils pour accomplir les tâches.

OUTILS:
- list_directory(path) - Liste les fichiers
- read_file(file_path) - Lit un fichier
- write_file(file_path, content) - Écrit un fichier
- execute_python(code) - Exécute du Python

FORMAT OBLIGATOIRE - Suis ce format EXACTEMENT:

THOUGHT: Je dois lister le répertoire
ACTION: {"tool": "list_directory", "params": {"path": "E:/ANA"}}

Après avoir reçu l'OBSERVATION, si tu as terminé:

THOUGHT: J'ai la liste des fichiers
FINAL_ANSWER: Voici les fichiers: [liste]

RÈGLES STRICTES:
1. Tu DOIS toujours inclure ACTION avec du JSON valide
2. Tu ne peux PAS sauter l'étape ACTION
3. Le JSON doit être sur UNE ligne après "ACTION: "
4. N'utilise FINAL_ANSWER que quand tu as VRAIMENT le résultat"""

# === Agent ReAct ===

class ReActAgent:
    """Agent utilisant le pattern ReAct avec Groq"""

    def __init__(self, max_iterations: int = 5):
        self.max_iterations = max_iterations
        self.messages = []

    def _parse_response(self, response: str) -> dict:
        """Parse la réponse du LLM pour extraire THOUGHT, ACTION ou FINAL_ANSWER"""
        result = {"thought": None, "action": None, "final_answer": None}

        # Extraire THOUGHT
        thought_match = re.search(r'THOUGHT:\s*(.+?)(?=ACTION:|FINAL_ANSWER:|$)', response, re.DOTALL)
        if thought_match:
            result["thought"] = thought_match.group(1).strip()

        # Extraire ACTION (JSON)
        action_match = re.search(r'ACTION:\s*(\{.+?\})', response, re.DOTALL)
        if action_match:
            try:
                result["action"] = json.loads(action_match.group(1))
            except json.JSONDecodeError:
                pass

        # Extraire FINAL_ANSWER
        final_match = re.search(r'FINAL_ANSWER:\s*(.+?)$', response, re.DOTALL)
        if final_match:
            result["final_answer"] = final_match.group(1).strip()

        return result

    def _execute_action(self, action: dict) -> str:
        """Exécute une action et retourne l'observation"""
        tool_name = action.get("tool")
        params = action.get("params", {})

        if tool_name not in TOOLS:
            return f"ERREUR: Outil '{tool_name}' non reconnu. Outils disponibles: {list(TOOLS.keys())}"

        tool_func = TOOLS[tool_name]
        try:
            result = tool_func(**params)
            return result
        except Exception as e:
            return f"ERREUR lors de l'exécution de {tool_name}: {str(e)}"

    def run(self, task: str) -> dict:
        """Exécute la tâche avec le pattern ReAct"""

        self.messages = [
            SystemMessage(content=REACT_SYSTEM_PROMPT),
            HumanMessage(content=f"TÂCHE: {task}")
        ]

        iterations = 0
        observations = []

        while iterations < self.max_iterations:
            iterations += 1

            # Appeler le LLM
            response = llm.invoke(self.messages)
            response_text = response.content

            # Parser la réponse
            parsed = self._parse_response(response_text)

            print(f"\n--- Itération {iterations} ---")
            print(f"THOUGHT: {parsed['thought']}")

            # Si FINAL_ANSWER, on a fini
            if parsed["final_answer"]:
                print(f"FINAL_ANSWER: {parsed['final_answer']}")
                return {
                    "status": "success",
                    "iterations": iterations,
                    "answer": parsed["final_answer"],
                    "observations": observations
                }

            # Si ACTION, exécuter et continuer
            if parsed["action"]:
                print(f"ACTION: {parsed['action']}")
                observation = self._execute_action(parsed["action"])
                observations.append(observation)
                print(f"OBSERVATION: {observation[:200]}...")

                # Ajouter au contexte
                self.messages.append(AIMessage(content=response_text))
                self.messages.append(HumanMessage(content=f"OBSERVATION: {observation}"))
            else:
                # Pas d'action, demander de réessayer
                self.messages.append(AIMessage(content=response_text))
                self.messages.append(HumanMessage(content="Tu dois fournir une ACTION valide ou un FINAL_ANSWER."))

        return {
            "status": "max_iterations",
            "iterations": iterations,
            "answer": "Nombre maximum d'itérations atteint",
            "observations": observations
        }

# === Interface simple ===

def run_task(task: str, max_iterations: int = 5) -> dict:
    """Exécute une tâche avec l'agent ReAct"""
    agent = ReActAgent(max_iterations=max_iterations)
    return agent.run(task)

# === Test ===
if __name__ == "__main__":
    print("=== Test Agent ReAct + Groq ===")
    print(f"API Key présente: {'Oui' if GROQ_API_KEY else 'Non'}")

    # Test 1: Lister un répertoire
    print("\n=== TEST: Lister les fichiers ===")
    result = run_task("Liste les fichiers dans le répertoire E:/ANA/server/agents")
    print(f"\nRésultat final: {result['status']}")
    print(f"Réponse: {result['answer']}")
