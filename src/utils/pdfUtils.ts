import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Exporte un élément HTML en PDF haute qualité (A4).
 * Pipeline : DOM → PNG (lossless, haute résolution) → PDF (sans recompression).
 *
 * @param elementId L'ID de l'élément à capturer (sans le #).
 * @param fileName Le nom du fichier généré.
 */
export const exportToPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  // Sauvegarder le transform inline (zoom/rotation de l'utilisateur) pour le restaurer après
  const originalTransform = element.style.transform;

  try {
    // 1. Préparer l'élément pour l'export
    element.classList.add('pdf-export-mode');
    // Retirer le zoom/rotation utilisateur pour capturer la feuille A4 à l'échelle 1:1
    element.style.transform = 'none';

    // Assure que les polices sont complètement chargées
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 2. Génération PNG lossless via html-to-image
    // On utilise pixelRatio natif (pas de scale() CSS manuel) pour éviter
    // les artefacts sub-pixel sur les frontières de grille.
    const dataUrl = await toPng(element, {
      pixelRatio: 4, // ×4 → ~300 DPI sur A4
      cacheBust: true,
    });

    // 3. Restaurer l'élément
    element.classList.remove('pdf-export-mode');
    element.style.transform = originalTransform;

    // 4. Génération du PDF — SANS compression pour éviter les artefacts chromatiques
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false, // Pas de recompression interne (élimine les taches jaunes)
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    // 'NONE' = pas de filtre de compression sur l'image PNG embarquée
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'NONE');
    pdf.save(fileName);
  } catch (error: any) {
    // Restaurer même en cas d'erreur
    element.classList.remove('pdf-export-mode');
    element.style.transform = originalTransform;
    console.error('Error generating PDF:', error);
    alert(`Une erreur est survenue lors de la génération du PDF: ${error.message || error}`);
  }
};
