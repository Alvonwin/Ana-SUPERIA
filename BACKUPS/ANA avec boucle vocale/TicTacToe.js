<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tic-Tac-Toe</title>
    <style>
        #jeu {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-gap: 10px;
            width: 300px;
            margin: 40px auto;
        }
        
        .case {
            background-color: #f0f0f0;
            padding: 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
        }
        
        .case:hover {
            background-color: #ccc;
        }
        
        #resultat {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>Tic-Tac-Toe</h1>
    <div id="resultat"></div>
    <div id="jeu">
        <button class="case" id="case1"></button>
        <button class="case" id="case2"></button>
        <button class="case" id="case3"></button>
        <button class="case" id="case4"></button>
        <button class="case" id="case5"></button>
        <button class="case" id="case6"></button>
        <button class="case" id="case7"></button>
        <button class="case" id="case8"></button>
        <button class="case" id="case9"></button>
    </div>
    <script>
        let tour = "X";
        let cases = document.querySelectorAll(".case");
        let resultat = document.getElementById("resultat");
        
        cases.forEach((case_) => {
            case_.addEventListener("click", () => {
                if (case_.textContent === "") {
                    case_.textContent = tour;
                    verifierGagnant();
                    tour = tour === "X" ? "O" : "X";
                }
            });
        });
        
        function verifierGagnant() {
            let combinaisons = [
                [cases[0], cases[1], cases[2]],
                [cases[3], cases[4], cases[5]],
                [cases[6], cases[7], cases[8]],
                [cases[0], cases[3], cases[6]],
                [cases[1], cases[4], cases[7]],
                [cases[2], cases[5], cases[8]],
                [cases[0], cases[4], cases[8]],
                [cases[2], cases[4], cases[6]],
            ];
            
            combinaisons.forEach((combinaison) => {
                if (
                    combinaison[0].textContent === combinaison[1].textContent &&
                    combinaison[1].textContent === combinaison[2].textContent &&
                    combinaison[0].textContent !== ""
                ) {
                    resultat.textContent = `Le joueur ${combinaison[0].textContent} a gagné !`;
                    cases.forEach((case_) => {
                        case_.disabled = true;
                    });
                }
            });
            
            if (
                cases[0].textContent !== "" &&
                cases[1].textContent !== "" &&
                cases[2].textContent !== "" &&
                cases[3].textContent !== "" &&
                cases[4].textContent !== "" &&
                cases[5].textContent !== "" &&
                cases[6].textContent !== "" &&
                cases[7].textContent !== "" &&
                cases[8].textContent !== ""
            ) {
                resultat.textContent = "Match nul !";
                cases.forEach((case_) => {
                    case_.disabled = true;
                });
            }
        }
    </script>
</body>
</html>