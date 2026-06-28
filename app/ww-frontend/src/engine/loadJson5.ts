import JSON5 from 'json5';

/**
 * Carga archivos JSON (con sintaxis JSON5: comentarios, trailing commas, etc.)
 * usando Vite glob con as: 'raw' y parseándolos con JSON5.parse().
 *
 * @param globResult - Resultado de import.meta.glob(..., { eager: true, as: 'raw' })
 * @returns Record<filename-without-ext, parsed-object>
 */
export function loadJson5Glob<T = any>(globResult: Record<string, string>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [filePath, rawContent] of Object.entries(globResult)) {
    if (!rawContent || typeof rawContent !== 'string') continue;
    
    const id = filePath.split('/').pop()?.replace(/[.][^.]+$/, '') || '';
    try {
      const parsed = JSON5.parse(rawContent) as T;
      if (parsed && typeof parsed === 'object') {
        result[id] = parsed;
      }
    } catch (err) {
      console.warn(`[JSON5] Error parseando ${filePath}:`, (err as Error).message);
      // No rompe la app, solo saltea ese archivo
    }
  }
  return result;
}
