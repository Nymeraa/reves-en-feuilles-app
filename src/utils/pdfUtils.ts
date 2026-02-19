import { toPng } from 'html-to-image';
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
    // 1. Petit délai de sécurité pour le rendu
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. Génération avec html-to-image (Qualité x4 pour le 300 DPI)
    const dataUrl = await toPng(element, {
      pixelRatio: 4, // Équivalent du scale: 4
      backgroundColor: '#ffffff',
      style: {
        transform: 'none', // Sécurise le layout
      },
      cacheBust: true,
    });

    // 3. Génération du PDF avec jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(fileName);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert(`Une erreur est survenue lors de la génération du PDF: ${error.message || error}`);
  }
};
