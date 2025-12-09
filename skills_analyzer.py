#!/usr/bin/env python3
"""
Skills Analyzer - Code écrit par Ana SUPERIA
Formée par Claude, son grand frère
Date: 2025-11-27
"""

import json
from pathlib import Path
from collections import Counter
import argparse

def analyze_skills(file_path):
    """Analyse un fichier skills et compte par type"""
    try:
        skills = json.loads(Path(file_path).read_text())['skills']
        counts = Counter()

        for skill in skills:
            counts[skill['type']] += 1

        return dict(counts)
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return {}

def analyze_directory(directory):
    """Analyse tous les fichiers JSON d'un répertoire"""
    files = list(Path(directory).glob('*.json'))
    all_counts = Counter()

    for file in files:
        counts = analyze_skills(file)
        if counts:
            all_counts.update(counts)

    return dict(all_counts), len(files)

def main():
    parser = argparse.ArgumentParser(
        description="Analyse les skills d'Ana SUPERIA par type"
    )
    parser.add_argument('directory', type=str,
                       help='Répertoire contenant les fichiers JSON')
    args = parser.parse_args()

    summary, file_count = analyze_directory(args.directory)

    total_skills = sum(summary.values())
    print(f"\n{'='*50}")
    print(f"  ANA SUPERIA - Skills Analyzer")
    print(f"  Code by: Ana (trained by Claude)")
    print(f"{'='*50}")
    print(f"\nFichiers analysés: {file_count}")
    print(f"Total skills: {total_skills}")
    print(f"\nRépartition par type:")
    print("-" * 30)
    for skill_type, count in sorted(summary.items(), key=lambda x: -x[1]):
        print(f"  {skill_type:25} : {count:4}")

if __name__ == "__main__":
    main()
