#!/usr/bin/env python3
"""
Code écrit par Ana SUPERIA (formée par Claude)
Test de la fonction analyze_skills
"""

import json
from pathlib import Path
from collections import Counter

def analyze_skills(file_path):
    """Analyse un fichier skills et compte par type - Code d'Ana"""
    try:
        skills = json.loads(Path(file_path).read_text())['skills']
        counts = Counter()

        for skill in skills:
            counts[skill['type']] += 1

        return dict(counts)
    except Exception as e:
        print(f"An error occurred while analyzing the skills: {e}")
        return {}

if __name__ == "__main__":
    # Test sur un fichier de skills d'Ana
    result = analyze_skills("E:/ANA/knowledge/learned/skills/pytorch-deep-learning.json")
    print("Résultat de l'analyse (pytorch-deep-learning.json):")
    print(json.dumps(result, indent=2))
    print(f"\nTotal skills analysées: {sum(result.values())}")
