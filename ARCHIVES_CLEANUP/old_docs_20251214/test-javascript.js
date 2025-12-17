// Test JavaScript pour Ana SUPERIA
// Créé par Claude - 01 Décembre 2025

// Test 1: Variables et opérations
const nom = "Alain";
const version = "SUPERIA";
console.log(`👋 Bonjour ${nom}! Bienvenue sur Ana ${version}`);

// Test 2: Calculs
const a = 42;
const b = 58;
console.log(`🔢 Calcul: ${a} + ${b} = ${a + b}`);

// Test 3: Tableau et boucle
const langages = ["JavaScript", "Python", "TypeScript"];
console.log("📚 Langages supportés:");
langages.forEach((lang, i) => {
  console.log(`   ${i + 1}. ${lang}`);
});

// Test 4: Objet
const ana = {
  nom: "Ana SUPERIA",
  version: "2.0",
  local: true,
  gpu: "RTX 3070"
};
console.log("🤖 Configuration Ana:", JSON.stringify(ana, null, 2));

// Test 5: Date
const maintenant = new Date();
console.log(`⏰ Test effectué le: ${maintenant.toLocaleString('fr-FR')}`);

// Résultat final
console.log("\n✅ Tous les tests JavaScript ont réussi!");
