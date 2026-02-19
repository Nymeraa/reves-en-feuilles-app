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
        // Par exemple, forcer la visibilité de certains éléments masqués
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.transform = 'none'; // Annuler les transformations de zoom/rotation pour la capture?
          // Attention: si l'utilisateur a pivoté la vue, on veut peut-être capturer tel quel ou forcer "A4 portrait".
          // Ici on suppose que "element" est la feuille A4 déjà bien formatée CSS (width: 210mm etc)
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
