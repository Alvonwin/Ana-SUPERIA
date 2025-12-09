"""
LangGraph Agent pour Ana SUPERIA
Agent avec graphe d'états et boucle de feedback utilisant Groq (gratuit)

Architecture:
  START → analyze → decide → execute → verify → END ou RETRY

Ce pattern permet à Ana de:
1. Analyser la tâche (via Groq Llama-70B)
2. Décider de l'action
3. Exécuter (outils locaux)
4. Vérifier le résultat
5. Recommencer si échec (boucle)
"""

import os
import json
from typing import TypedDict, Annotated, Sequence
from dotenv import load_dotenv

# LangGraph
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

# LangChain + Groq
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool

# Charger les variables d'environnement
load_dotenv("E:/ANA/.env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# === Configuration du LLM Groq ===
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile",
    temperature=0.1,  # Bas pour plus de précision
    max_tokens=2048
)

# === Définition des Tools ===
@tool
def read_file(file_path: str) -> str:
    """Lit le contenu d'un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return f"Fichier lu avec succès ({len(content)} caractères)"
    except Exception as e:
        return f"Erreur lecture: {str(e)}"

@tool
def write_file(file_path: str, content: str) -> str:
    """Écrit du contenu dans un fichier"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Fichier écrit avec succès ({len(content)} caractères)"
    except Exception as e:
        return f"Erreur écriture: {str(e)}"

@tool
def execute_python(code: str) -> str:
    """Exécute du code Python et retourne le résultat"""
    try:
        # Sécurité: environnement restreint
        local_vars = {}
        exec(code, {"__builtins__": {}}, local_vars)
        return f"Code exécuté. Variables: {list(local_vars.keys())}"
    except Exception as e:
        return f"Erreur exécution: {str(e)}"

@tool
def search_memory(query: str) -> str:
    """Recherche dans la mémoire ChromaDB d'Ana"""
    # TODO: Connecter à ChromaDB existant
    return f"Recherche '{query}' dans la mémoire (TODO: implémenter)"

tools = [read_file, write_file, execute_python, search_memory]

# Bind tools au LLM
llm_with_tools = llm.bind_tools(tools)

# === État du Graphe ===
class AgentState(TypedDict):
    """État partagé entre tous les nœuds du graphe"""
    messages: Sequence[HumanMessage | AIMessage]
    task: str
    attempts: int
    max_attempts: int
    status: str  # 'analyzing', 'executing', 'verifying', 'success', 'failed'
    last_result: str

# === Nœuds du Graphe ===

def analyze_node(state: AgentState) -> AgentState:
    """Analyse la tâche avec le LLM"""
    messages = state["messages"]
    task = state["task"]

    system_msg = SystemMessage(content="""Tu es Ana SUPERIA, une IA assistante experte.
Analyse la tâche demandée et décide quelle action prendre.
Réponds en JSON avec: {"action": "nom_action", "params": {...}, "reasoning": "..."}
Actions disponibles: read_file, write_file, execute_python, search_memory""")

    response = llm_with_tools.invoke([system_msg] + list(messages))

    return {
        **state,
        "messages": list(messages) + [response],
        "status": "executing"
    }

def execute_node(state: AgentState) -> AgentState:
    """Exécute l'action décidée"""
    messages = state["messages"]
    last_message = messages[-1]

    # Si le LLM a appelé des tools
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        tool_node = ToolNode(tools)
        result = tool_node.invoke({"messages": messages})
        return {
            **state,
            "messages": list(messages) + result["messages"],
            "last_result": str(result),
            "status": "verifying"
        }

    return {
        **state,
        "status": "verifying",
        "last_result": "Pas d'outil appelé"
    }

def verify_node(state: AgentState) -> AgentState:
    """Vérifie si l'exécution a réussi"""
    messages = state["messages"]
    last_result = state["last_result"]
    attempts = state["attempts"]

    # Demander au LLM de vérifier
    verify_msg = HumanMessage(content=f"""
Résultat de l'exécution: {last_result}
La tâche est-elle accomplie correctement?
Réponds par JSON: {{"success": true/false, "reason": "..."}}
""")

    response = llm.invoke(list(messages) + [verify_msg])

    # Parser la réponse
    try:
        # Extraire le JSON de la réponse
        content = response.content
        if "true" in content.lower():
            return {**state, "status": "success", "attempts": attempts + 1}
        else:
            return {**state, "status": "retry", "attempts": attempts + 1}
    except:
        return {**state, "status": "retry", "attempts": attempts + 1}

def should_retry(state: AgentState) -> str:
    """Décide si on continue ou arrête"""
    if state["status"] == "success":
        return "end"
    if state["attempts"] >= state["max_attempts"]:
        return "end"
    return "retry"

# === Construction du Graphe ===

def create_agent_graph():
    """Crée le graphe d'agent LangGraph"""

    workflow = StateGraph(AgentState)

    # Ajouter les nœuds
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("execute", execute_node)
    workflow.add_node("verify", verify_node)

    # Définir le flux
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "execute")
    workflow.add_edge("execute", "verify")

    # Branchement conditionnel après vérification
    workflow.add_conditional_edges(
        "verify",
        should_retry,
        {
            "end": END,
            "retry": "analyze"  # Boucle de feedback!
        }
    )

    return workflow.compile()

# === Interface pour Ana ===

def run_agent_task(task: str, max_attempts: int = 3) -> dict:
    """
    Exécute une tâche avec l'agent LangGraph

    Args:
        task: La tâche à accomplir
        max_attempts: Nombre max de tentatives

    Returns:
        dict avec status, result, attempts
    """
    graph = create_agent_graph()

    initial_state = AgentState(
        messages=[HumanMessage(content=task)],
        task=task,
        attempts=0,
        max_attempts=max_attempts,
        status="analyzing",
        last_result=""
    )

    # Exécuter le graphe
    final_state = graph.invoke(initial_state)

    return {
        "status": final_state["status"],
        "attempts": final_state["attempts"],
        "result": final_state["last_result"],
        "messages": [m.content for m in final_state["messages"] if hasattr(m, 'content')]
    }

# === Test ===
if __name__ == "__main__":
    print("=== Test Agent LangGraph + Groq ===")
    print(f"API Key présente: {'Oui' if GROQ_API_KEY else 'Non'}")

    # Test simple
    result = run_agent_task("Dis bonjour en français")
    print(f"\nRésultat: {json.dumps(result, indent=2, ensure_ascii=False)}")
