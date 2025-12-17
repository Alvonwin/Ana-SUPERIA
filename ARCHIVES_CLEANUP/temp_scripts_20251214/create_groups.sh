#!/bin/bash
# Créer les 5 groupes d'outils
sed -n '1,36p' E:/ANA/temp/LISTE_181_OUTILS.txt > E:/ANA/temp/GROUPE_1_OUTILS.txt
sed -n '37,72p' E:/ANA/temp/LISTE_181_OUTILS.txt > E:/ANA/temp/GROUPE_2_OUTILS.txt
sed -n '73,108p' E:/ANA/temp/LISTE_181_OUTILS.txt > E:/ANA/temp/GROUPE_3_OUTILS.txt
sed -n '109,144p' E:/ANA/temp/LISTE_181_OUTILS.txt > E:/ANA/temp/GROUPE_4_OUTILS.txt
sed -n '145,181p' E:/ANA/temp/LISTE_181_OUTILS.txt > E:/ANA/temp/GROUPE_5_OUTILS.txt
echo "✅ 5 groupes créés"
wc -l E:/ANA/temp/GROUPE_*_OUTILS.txt
