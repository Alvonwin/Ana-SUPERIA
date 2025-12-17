// Test Java pour Ana SUPERIA
// Cree par Claude - 01 Decembre 2025

public class Main {
    public static void main(String[] args) {
        // Test 1: Variables et types
        String nom = "Alain";
        int version = 2025;
        boolean estLocal = true;
        System.out.println("Bonjour " + nom + "! Ana SUPERIA " + version);

        // Test 2: Calculs
        int a = 42;
        int b = 58;
        System.out.println("Calcul: " + a + " + " + b + " = " + (a + b));

        // Test 3: Tableau
        String[] langages = {"JavaScript", "Python", "TypeScript", "Java"};
        System.out.println("Langages supportes:");
        for (int i = 0; i < langages.length; i++) {
            System.out.println("   " + (i + 1) + ". " + langages[i]);
        }

        // Test 4: Classe interne
        GPU gpu = new GPU("RTX 3070", 8);
        gpu.afficher();

        // Resultat
        System.out.println("\nTous les tests Java ont reussi!");
    }

    // Classe interne pour tester POO
    static class GPU {
        String modele;
        int vram;

        GPU(String modele, int vram) {
            this.modele = modele;
            this.vram = vram;
        }

        void afficher() {
            System.out.println("GPU: " + modele + " avec " + vram + "GB VRAM");
        }
    }
}
