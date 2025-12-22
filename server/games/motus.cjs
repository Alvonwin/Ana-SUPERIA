const motCache = 'exemple';
let essais = 6;
let lettreDevinee = '';
let motDevine = '';
let tableauLetres = [];
let tableauEssais = [];
let jouer = true;

while (jouer) {
    console.log(`Il vous reste ${essais} essais.`);
    lettreDevinee = prompt('Entrez une lettre : ');
    if (lettreDevinee.length !== 1) {
        console.log('Vous devez entrer une seule lettre.');
        continue;
    }
    if (tableauLetres.includes(lettreDevinee)) {
        console.log('Vous avez déjà deviné cette lettre.');
        continue;
    }
    tableauLetres.push(lettreDevinee);
    if (motCache.includes(lettreDevinee)) {
        console.log(`La lettre ${lettreDevinee} est dans le mot.`);
        motDevine += lettreDevinee;
    } else {
        console.log(`La lettre ${lettreDevinee} n'est pas dans le mot.`);
        essais--;
    }
    tableauEssais.push(lettreDevinee);
    console.log(`Mot deviné : ${motDevine}`);
    console.log(`Essais : ${tableauEssais.join(', ')}`);
    if (essais === 0) {
        console.log('Vous avez perdu !');
        jouer = false;
    } else if (motDevine.length === motCache.length) {
        console.log('Vous avez gagné !');
        jouer = false;
    }
}
console.log('Motus est prêt à jouer !');
// Code du jeu de Motus