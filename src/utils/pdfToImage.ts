import * as pdfjsLib from 'pdfjs-dist';

// Set worker to CDN to avoid Vite build issues with worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Converts a PDF File into a single long JPG File (stitching up to maxPages vertically).
 * @param pdfFile The uploaded PDF File object
 * @param maxPages Maximum number of pages to process (default 3)
 * @returns A Promise that resolves to a new File object (JPG image)
 */
export async function convertPdfToImage(pdfFile: File, maxPages = 3): Promise<File> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const numPages = Math.min(pdf.numPages, maxPages);
  
  // Array to hold individual page canvases
  const pageCanvases: HTMLCanvasElement[] = [];
  let totalHeight = 0;
  let maxWidth = 0;
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    // Scale for decent readability (2.0 gives good quality)
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // @ts-ignore - The types for pdfjs-dist are sometimes strict/outdated
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      pageCanvases.push(canvas);
      totalHeight += canvas.height;
      maxWidth = Math.max(maxWidth, canvas.width);
    }
  }
  
  if (pageCanvases.length === 0) {
    throw new Error("PDF-тен бірде-бір бетті оқу мүмкін болмады.");
  }
  
  // Stitch all canvases together vertically
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = maxWidth;
  finalCanvas.height = totalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  
  if (!finalCtx) {
    throw new Error("Сурет жасау үшін контекст құрылмады.");
  }
  
  // Fill white background (in case of transparent PDFs)
  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  
  let currentY = 0;
  for (const canvas of pageCanvases) {
    // Center horizontally if some pages are narrower
    const xOffset = (maxWidth - canvas.width) / 2;
    finalCtx.drawImage(canvas, xOffset, currentY);
    currentY += canvas.height;
  }
  
  // Convert to Blob
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob((blob) => {
      if (blob) {
        // Create a new File object with a .jpg extension
        const originalName = pdfFile.name.replace(/\.[^/.]+$/, "");
        const newFile = new File([blob], `${originalName}_converted.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        resolve(newFile);
      } else {
        reject(new Error("PDF-ті суретке айналдыру мүмкін болмады."));
      }
    }, 'image/jpeg', 0.85); // 85% quality to save space
  });
}
