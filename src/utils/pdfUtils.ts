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
    // 1. Préparer un clone du DOM pour manipulation (manipuler le clone évite de casser l'UI)
    // On doit l'ajouter au document pour que html2canvas puisse lire les styles calculés
    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'absolute';
    cloneContainer.style.top = '-9999px';
    cloneContainer.style.left = '-9999px';
    cloneContainer.style.width = element.offsetWidth + 'px'; // Garder la même largeur pour le layout
    document.body.appendChild(cloneContainer);

    const clone = element.cloneNode(true) as HTMLElement;
    cloneContainer.appendChild(clone);

    // 2. Traitement des images : Conversion en Base64 pour garantir le rendu
    const images = clone.querySelectorAll('img');
    const imagePromises = Array.from(images).map(async (img) => {
      const src = img.getAttribute('src');
      if (src && (src.startsWith('http') || src.startsWith('/'))) {
        try {
          // Tenter de récupérer l'image et de la convertir en blob/base64
          const response = await fetch(src, { cache: 'no-cache' });
          const blob = await response.blob();
          return new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result) {
                img.src = reader.result as string; // Remplacer l'URL par la Data URI
              }
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.warn('Failed to load image for PDF export:', src, err);
          // On laisse l'URL d'origine si échec, html2canvas essaiera
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    });

    // Attendre que toutes les images soient traitées
    await Promise.all(imagePromises);

    // 1b. Petit délai pour laisser le navigateur finir ses rendus (fontes, images réseau)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 3. Capture avec html2canvas sur le CLONE
    const canvas = await html2canvas(clone, {
      scale: 4, // ~300 DPI
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      // FIX IMPORTANT : Forcer les dimensions pour éviter les débordements
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
      onclone: (doc: Document) => {
        // Injection des styles correctifs (OKLCH override) dans le clone interne de html2canvas
        // Note: html2canvas re-clone le noeud qu'on lui passe, donc ce 'doc' est un 2ème clone.
        const style = doc.createElement('style');
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
            
            /* Surcharge pour Tailwind v4 */
            --tw-ring-color: #3b82f6 !important; 
            --tw-ring-offset-color: #ffffff !important;
          }
        `;
        doc.head.appendChild(style);
      },
    } as any);

    // Nettoyage du clone temporaire
    document.body.removeChild(cloneContainer);

    // 4. Génération du PDF avec jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = 297;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(fileName);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert(`Une erreur est survenue lors de la génération du PDF: ${error.message || error}`);
  }
};
