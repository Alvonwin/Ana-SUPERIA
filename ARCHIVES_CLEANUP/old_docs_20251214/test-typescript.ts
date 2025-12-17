// Test TypeScript pour Ana SUPERIA
// Créé par Claude - 01 Décembre 2025

// Test 1: Types
const nom: string = "Alain";
const age: number = 2025;
const estLocal: boolean = true;

console.log(`👋 Bonjour ${nom}! Ana est locale: ${estLocal}`);

// Test 2: Interface
interface IAna {
  nom: string;
  version: string;
  langages: string[];
  gpu: string;
}

const ana: IAna = {
  nom: "Ana SUPERIA",
  version: "2.0",
  langages: ["JavaScript", "Python", "TypeScript"],
  gpu: "RTX 3070"
};

console.log("🤖 Ana:", JSON.stringify(ana, null, 2));

// Test 3: Fonction typée
function addition(a: number, b: number): number {
  return a + b;
}

console.log(`🔢 Calcul typé: 42 + 58 = ${addition(42, 58)}`);

// Test 4: Enum
enum Langage {
  JavaScript = "JS",
  Python = "PY",
  TypeScript = "TS"
}

console.log(`📚 Enum: TypeScript = ${Langage.TypeScript}`);

// Test 5: Classe
class Greeting {
  private message: string;

  constructor(msg: string) {
    this.message = msg;
  }

  greet(): void {
    console.log(`💬 ${this.message}`);
  }
}

const salut = new Greeting("TypeScript fonctionne parfaitement!");
salut.greet();

console.log("\n✅ Tous les tests TypeScript ont réussi!");
