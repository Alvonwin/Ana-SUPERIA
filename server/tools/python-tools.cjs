/**
 * Ana Python Tools
 * Exécution de scripts Python pour les skills OpenSkills
 * Créé: 21 Décembre 2025
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../../temp');

// Assurer que le dossier temp existe
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Exécute un script Python et retourne le résultat
 */
async function executePython(code, timeout = 60000) {
  const scriptPath = path.join(TEMP_DIR, `script_${Date.now()}.py`);

  try {
    // Écrire le script
    fs.writeFileSync(scriptPath, code, 'utf-8');

    return new Promise((resolve, reject) => {
      const python = spawn('python', [scriptPath], {
        cwd: TEMP_DIR,
        timeout: timeout
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        // Nettoyer le script temporaire
        try { fs.unlinkSync(scriptPath); } catch(e) {}

        if (code === 0) {
          resolve({
            success: true,
            output: stdout,
            error: stderr || null
          });
        } else {
          resolve({
            success: false,
            output: stdout,
            error: stderr || `Exit code: ${code}`
          });
        }
      });

      python.on('error', (err) => {
        try { fs.unlinkSync(scriptPath); } catch(e) {}
        reject(err);
      });
    });

  } catch (error) {
    try { fs.unlinkSync(scriptPath); } catch(e) {}
    throw error;
  }
}

/**
 * Crée un fichier Excel avec openpyxl
 */
async function createExcel(filePath, data) {
  const code = `
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

wb = openpyxl.Workbook()
sheet = wb.active

# Données fournies
data = ${JSON.stringify(data)}

# Écrire les données
for row_idx, row in enumerate(data, 1):
    for col_idx, value in enumerate(row, 1):
        cell = sheet.cell(row=row_idx, column=col_idx, value=value)
        if row_idx == 1:  # Header en gras
            cell.font = Font(bold=True)

# Ajuster largeur colonnes
for col in sheet.columns:
    max_length = 0
    column = col[0].column_letter
    for cell in col:
        try:
            if len(str(cell.value)) > max_length:
                max_length = len(str(cell.value))
        except:
            pass
    sheet.column_dimensions[column].width = max_length + 2

wb.save(r'${filePath.replace(/\\/g, '\\\\')}')
print(f"Excel créé: ${filePath}")
`;

  return await executePython(code);
}

/**
 * Crée un document Word avec python-docx
 */
async function createWord(filePath, title, paragraphs) {
  const paragraphsJson = JSON.stringify(paragraphs);
  const code = `
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Titre
title = doc.add_heading('${title.replace(/'/g, "\\'")}', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Paragraphes
paragraphs = ${paragraphsJson}
for para in paragraphs:
    doc.add_paragraph(para)

doc.save(r'${filePath.replace(/\\/g, '\\\\')}')
print(f"Word créé: ${filePath}")
`;

  return await executePython(code);
}

/**
 * Crée un PDF avec reportlab
 */
async function createPdf(filePath, title, content) {
  const code = `
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

c = canvas.Canvas(r'${filePath.replace(/\\/g, '\\\\')}', pagesize=A4)
width, height = A4

# Titre
c.setFont("Helvetica-Bold", 24)
c.drawCentredString(width/2, height - inch, '${title.replace(/'/g, "\\'")}')

# Contenu
c.setFont("Helvetica", 12)
text = c.beginText(inch, height - 2*inch)
content = '''${content.replace(/'/g, "\\'")}'''
for line in content.split('\\n'):
    text.textLine(line)
c.drawText(text)

c.save()
print(f"PDF créé: ${filePath}")
`;

  return await executePython(code);
}

/**
 * Crée une présentation PowerPoint avec python-pptx
 */
async function createPowerPoint(filePath, title, slides) {
  const slidesJson = JSON.stringify(slides);
  const code = `
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()

# Slide de titre
title_slide_layout = prs.slide_layouts[0]
slide = prs.slides.add_slide(title_slide_layout)
slide.shapes.title.text = '${title.replace(/'/g, "\\'")}'

# Autres slides
slides_data = ${slidesJson}
for slide_data in slides_data:
    bullet_slide_layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(bullet_slide_layout)
    slide.shapes.title.text = slide_data.get('title', '')

    body_shape = slide.shapes.placeholders[1]
    tf = body_shape.text_frame

    for i, point in enumerate(slide_data.get('points', [])):
        if i == 0:
            tf.text = point
        else:
            p = tf.add_paragraph()
            p.text = point

prs.save(r'${filePath.replace(/\\/g, '\\\\')}')
print(f"PowerPoint créé: ${filePath}")
`;

  return await executePython(code);
}

/**
 * Crée un GIF animé avec Pillow
 */
async function createGif(filePath, text, width = 400, height = 200) {
  const code = `
from PIL import Image, ImageDraw, ImageFont
import os

frames = []
colors = [(255, 0, 100), (100, 0, 255), (0, 200, 255), (0, 255, 100), (255, 200, 0)]

for i, color in enumerate(colors):
    img = Image.new('RGB', (${width}, ${height}), color=(30, 30, 40))
    draw = ImageDraw.Draw(img)

    # Texte centré
    try:
        font = ImageFont.truetype("arial.ttf", 48)
    except:
        font = ImageFont.load_default()

    text = '${text.replace(/'/g, "\\'")}'
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (${width} - text_width) // 2
    y = (${height} - text_height) // 2

    draw.text((x, y), text, font=font, fill=color)
    frames.append(img)

# Sauvegarder en GIF
frames[0].save(
    r'${filePath.replace(/\\/g, '\\\\')}',
    save_all=True,
    append_images=frames[1:],
    duration=500,
    loop=0
)
print(f"GIF créé: ${filePath}")
`;

  return await executePython(code);
}

// Définitions des outils pour Ana
const pythonTools = [
  {
    name: 'execute_python',
    description: 'Exécute du code Python arbitraire. Utile pour créer des fichiers, manipuler des données, générer des graphiques.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Le code Python à exécuter'
        },
        timeout: {
          type: 'number',
          description: 'Timeout en ms (défaut: 60000)'
        }
      },
      required: ['code']
    },
    handler: async ({ code, timeout }) => {
      try {
        const result = await executePython(code, timeout || 60000);
        return result.success
          ? `Exécution réussie:\n${result.output}`
          : `Erreur:\n${result.error}\nOutput:\n${result.output}`;
      } catch (error) {
        return `Erreur d'exécution: ${error.message}`;
      }
    }
  },
  {
    name: 'create_excel',
    description: 'Crée un fichier Excel (.xlsx) avec des données tabulaires. Première ligne = headers.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Chemin complet du fichier Excel à créer'
        },
        data: {
          type: 'array',
          description: 'Tableau 2D de données. Ex: [["Nom", "Age"], ["Alice", 30], ["Bob", 25]]'
        }
      },
      required: ['file_path', 'data']
    },
    handler: async ({ file_path, data }) => {
      try {
        const result = await createExcel(file_path, data);
        return result.success
          ? `Fichier Excel créé: ${file_path}`
          : `Erreur: ${result.error}`;
      } catch (error) {
        return `Erreur création Excel: ${error.message}`;
      }
    }
  },
  {
    name: 'create_word',
    description: 'Crée un document Word (.docx) avec un titre et des paragraphes.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Chemin complet du fichier Word à créer'
        },
        title: {
          type: 'string',
          description: 'Titre du document'
        },
        paragraphs: {
          type: 'array',
          description: 'Liste des paragraphes'
        }
      },
      required: ['file_path', 'title', 'paragraphs']
    },
    handler: async ({ file_path, title, paragraphs }) => {
      try {
        const result = await createWord(file_path, title, paragraphs);
        return result.success
          ? `Document Word créé: ${file_path}`
          : `Erreur: ${result.error}`;
      } catch (error) {
        return `Erreur création Word: ${error.message}`;
      }
    }
  },
  {
    name: 'create_pdf',
    description: 'Crée un fichier PDF simple avec un titre et du contenu texte.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Chemin complet du fichier PDF à créer'
        },
        title: {
          type: 'string',
          description: 'Titre du PDF'
        },
        content: {
          type: 'string',
          description: 'Contenu texte du PDF'
        }
      },
      required: ['file_path', 'title', 'content']
    },
    handler: async ({ file_path, title, content }) => {
      try {
        const result = await createPdf(file_path, title, content);
        return result.success
          ? `PDF créé: ${file_path}`
          : `Erreur: ${result.error}`;
      } catch (error) {
        return `Erreur création PDF: ${error.message}`;
      }
    }
  },
  {
    name: 'create_powerpoint',
    description: 'Crée une présentation PowerPoint (.pptx) avec des slides.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Chemin complet du fichier PowerPoint à créer'
        },
        title: {
          type: 'string',
          description: 'Titre de la présentation (slide 1)'
        },
        slides: {
          type: 'array',
          description: 'Liste des slides: [{title: "Slide 2", points: ["Point 1", "Point 2"]}]'
        }
      },
      required: ['file_path', 'title', 'slides']
    },
    handler: async ({ file_path, title, slides }) => {
      try {
        const result = await createPowerPoint(file_path, title, slides);
        return result.success
          ? `PowerPoint créé: ${file_path}`
          : `Erreur: ${result.error}`;
      } catch (error) {
        return `Erreur création PowerPoint: ${error.message}`;
      }
    }
  },
  {
    name: 'create_gif',
    description: 'Crée un GIF animé avec du texte qui change de couleur.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Chemin complet du fichier GIF à créer'
        },
        text: {
          type: 'string',
          description: 'Texte à afficher dans le GIF'
        },
        width: {
          type: 'number',
          description: 'Largeur en pixels (défaut: 400)'
        },
        height: {
          type: 'number',
          description: 'Hauteur en pixels (défaut: 200)'
        }
      },
      required: ['file_path', 'text']
    },
    handler: async ({ file_path, text, width, height }) => {
      try {
        const result = await createGif(file_path, text, width || 400, height || 200);
        return result.success
          ? `GIF créé: ${file_path}`
          : `Erreur: ${result.error}`;
      } catch (error) {
        return `Erreur création GIF: ${error.message}`;
      }
    }
  }
];

module.exports = {
  executePython,
  createExcel,
  createWord,
  createPdf,
  createPowerPoint,
  createGif,
  pythonTools,
  tools: pythonTools
};
