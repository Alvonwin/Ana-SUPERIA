#!/usr/bin/env python3
"""
Script pour lister tous les skills d'Ana
Usage: python list_all_skills.py
"""

import os
import json
from datetime import datetime

SKILLS_DIR = r"E:\ANA\knowledge\learned\skills"

def main():
    print("=" * 60)
    print("INVENTAIRE DES SKILLS ANA")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    if not os.path.exists(SKILLS_DIR):
        print(f"ERREUR: Dossier introuvable: {SKILLS_DIR}")
        return

    # Lister tous les fichiers JSON
    files = [f for f in os.listdir(SKILLS_DIR) if f.endswith('.json')]
    files.sort()

    total_skills = 0
    categories = []

    print(f"\nFichiers JSON trouvés: {len(files)}")
    print("-" * 60)

    for filename in files:
        filepath = os.path.join(SKILLS_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            skill_count = len(data.get('skills', []))
            category = data.get('category', filename.replace('.json', ''))

            print(f"{filename}: {skill_count} skills")

            total_skills += skill_count
            categories.append({
                'file': filename,
                'category': category,
                'count': skill_count
            })

        except Exception as e:
            print(f"{filename}: ERREUR - {e}")

    print("-" * 60)
    print(f"\nRÉSUMÉ:")
    print(f"  Fichiers JSON: {len(files)}")
    print(f"  Skills TOTAL: {total_skills}")
    print("=" * 60)

    # Sauvegarder le rapport
    report_path = r"E:\ANA\scripts\skills_report.txt"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(f"INVENTAIRE SKILLS ANA - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Fichiers: {len(files)}\n")
        f.write(f"Skills total: {total_skills}\n\n")
        for cat in categories:
            f.write(f"{cat['file']}: {cat['count']}\n")

    print(f"\nRapport sauvegardé: {report_path}")

if __name__ == "__main__":
    main()
