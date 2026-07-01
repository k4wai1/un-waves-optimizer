import JSON5 from 'json5';

/**
 * Carga archivos JSON (con sintaxis JSON5: comentarios, trailing commas, etc.)
 * usando Vite glob con as: 'raw' y parseándolos con JSON5.parse().
 *
 * @param globResult - Resultado de import.meta.glob(..., { eager: true, as: 'raw' })
 * @returns Record<filename-without-ext, parsed-object>
 */
/**
 * Carga archivos JSON5 y los indexa.
 * 
 * Si el archivo tiene `metadata.id`, usa ese valor como clave.
 * Si no (formato legacy), usa el nombre del archivo sin extensión.
 * 
 * Esto permite que archivos migrados y no migrados coexistan.
 */
export function loadJson5Glob<T = any>(globResult: Record<string, string>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [filePath, rawContent] of Object.entries(globResult)) {
    if (!rawContent || typeof rawContent !== 'string') continue;
    
    const filename = filePath.split('/').pop()?.replace(/[.][^.]+$/, '') || '';
    try {
      const parsed = JSON5.parse(rawContent) as any;
      if (parsed && typeof parsed === 'object') {
        // Preferir metadata.id sobre el nombre del archivo
        const key = parsed.metadata?.id || filename;
        result[key] = parsed as T;
      }
    } catch (err) {
      console.warn(`[JSON5] Error parseando ${filePath}:`, (err as Error).message);
      // No rompe la app, solo saltea ese archivo
    }
  }
  return result;
}
