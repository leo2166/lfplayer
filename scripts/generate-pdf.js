const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'ANALISIS_PROYECTO.md');
const outputPath = path.join(__dirname, '..', 'ANALISIS_PROYECTO.pdf');

console.log('Generando PDF desde:', inputPath);
console.log('Salida en:', outputPath);

markdownpdf()
  .from(inputPath)
  .to(outputPath, function () {
    console.log('PDF generado exitosamente en:', outputPath);
  });