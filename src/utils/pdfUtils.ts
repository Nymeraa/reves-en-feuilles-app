import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Exporte un élément HTML en PDF haute qualité (A4).
 * @param elementId L'ID de l'élément à capturer (sans le #).
 * @param fileName Le nom du fichier généré.
 */
export const exportToPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    // 1. Capture Haute Résolution avec html2canvas
    const canvas = await html2canvas(element, {
      scale: 4, // Échelle 4 pour une meilleure qualité (~300 DPI si base 72/96)
      useCORS: true, // Important pour les images externes (si configurées CORS)
      allowTaint: false, // DOIT ÊTRE FALSE pour permettre toDataURL() sans SecurityError
      backgroundColor: '#ffffff', // Fond blanc propre
      logging: false, // Désactiver les logs
      onclone: (clonedDoc: Document) => {
        // Optimisations spécifiques pour l'impression dans le DOM cloné
        // On force les couleurs en HEX/RGB pour éviter l'erreur "unsupported color function lab/oklch"
        const style = clonedDoc.createElement('style');
        style.innerHTML = `
          :root, * {
            --background: #ffffff !important;
            --foreground: #020817 !important;
            --card: #ffffff !important;
            --card-foreground: #020817 !important;
            --popover: #ffffff !important;
            --popover-foreground: #020817 !important;
            --primary: #0f172a !important;
            --primary-foreground: #f8fafc !important;
            --secondary: #f1f5f9 !important;
            --secondary-foreground: #0f172a !important;
            --muted: #f1f5f9 !important;
            --muted-foreground: #64748b !important;
            --accent: #f1f5f9 !important;
            --accent-foreground: #0f172a !important;
            --destructive: #ef4444 !important;
            --border: #e2e8f0 !important;
            --input: #e2e8f0 !important;
            --ring: #020817 !important;
            --radius: 0.5rem !important;
            --chart-1: #e76e50 !important;
            --chart-2: #2a9d90 !important;
            --chart-3: #274754 !important;
            --chart-4: #e8c468 !important;
            --chart-5: #f4a462 !important;
            --sidebar: #f8fafc !important;
            --sidebar-foreground: #0f172a !important;
            --sidebar-primary: #18181b !important;
            --sidebar-primary-foreground: #fafafa !important;
            --sidebar-accent: #f4f4f5 !important;
            --sidebar-accent-foreground: #18181b !important;
            --sidebar-border: #e4e4e7 !important;
            --sidebar-ring: #d4d4d8 !important;
            
            /* Surcharge pour Tailwind v4 qui utilise oklch par défaut */
            --tw-ring-color: #3b82f6 !important; 
            --tw-ring-offset-color: #ffffff !important;
          }
          
          /* Force borderColor to use the new hex variable */
          * {
            border-color: #e2e8f0 !important;
          }
        `;
        clonedDoc.head.appendChild(style);

        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.transform = 'none'; // Annuler les transformations de zoom/rotation
        }
      },
    });

    // 2. Génération du PDF avec jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/png');

    // Dimensions A4 en mm
    const pdfWidth = 210;
    const pdfHeight = 297;

    // Ajouter l'image au PDF
    // 'FAST' compression est plus rapide mais 'undefined' ou 'SLOW' est meilleure qualité.
    // L'utilisateur veut la qualité MAX, donc on utilise la compression par défaut (meilleure).
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // 3. Téléchargement
    pdf.save(fileName);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert(`Une erreur est survenue lors de la génération du PDF: ${error.message || error}`);
  }
};
