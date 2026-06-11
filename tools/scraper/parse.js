import fs from 'fs/promises';
import path from 'path';

// Rutas de entrada y salida
const INPUT_PATH = path.resolve('../../libs/ww/dm/src/resonators/RoverHavoc.json');
const OUTPUT_PATH = path.resolve('../../libs/ww/stats/src/resonators/RoverHavoc.ts');

// Función que convierte "18.68*3+56.03" en un array de impactos
function parseHits(rawFormula) {
  if (!rawFormula) return [];
  
  // Separamos por el signo '+' para dividir los distintos tipos de golpes
  const parts = rawFormula.split('+');
  
  return parts.map(part => {
    // Separamos por '*' para ver si tiene multiplicador de cantidad
    const [multStr, countStr] = part.split('*');
    return {
      mult: parseFloat(multStr) || 0, // El porcentaje de daño
      count: countStr ? parseInt(countStr, 10) : 1 // Cuántas veces golpea
    };
  });
}

// Función para procesar una categoría entera (ej: basicAttack, forteCircuit)
function processCategory(categoryData) {
  if (!categoryData) return {};
  
  const processed = {};
  for (const [key, data] of Object.entries(categoryData)) {
    processed[key] = {
      name: data.name,
      hits: parseHits(data.rawFormula)
    };
  }
  return processed;
}

(async () => {
  console.log('⚙️ Parseando datos extraídos de Rover Havoc...');

  const rawData = JSON.parse(await fs.readFile(INPUT_PATH, 'utf-8'));

  // Construimos el objeto TypeScript
  const tsContent = `// Archivo autogenerado - NO EDITAR MANUALMENTE
export const RoverHavocStats = {
  basicAttack: ${JSON.stringify(processCategory(rawData.basicAttack), null, 4)},
  resonanceSkill: ${JSON.stringify(processCategory(rawData.resonanceSkill), null, 4)},
  resonanceLiberation: ${JSON.stringify(processCategory(rawData.resonanceLiberation), null, 4)},
  forteCircuit: ${JSON.stringify(processCategory(rawData.forteCircuit), null, 4)}
} as const;
`;

  // Nos aseguramos de que el directorio exista
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, tsContent);

  console.log(`✅ Archivo TypeScript generado exitosamente en: ${OUTPUT_PATH}`);
})();
