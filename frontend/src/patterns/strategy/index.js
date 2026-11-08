// Реєстр доступних форматів експорту. Порядок визначає порядок кнопок на сторінці «Звіти».
import { CsvExportStrategy } from './CsvExportStrategy.js';
import { ExcelExportStrategy } from './ExcelExportStrategy.js';

export const EXPORT_STRATEGIES = {
  csv: new CsvExportStrategy(),
  excel: new ExcelExportStrategy(),
};

export { ReportExporter } from './ReportExporter.js';
export { ExportStrategy } from './ExportStrategy.js';
export { CsvExportStrategy, ExcelExportStrategy };

// Збереження файла в браузері (єдине місце, яке працює з DOM)
export function downloadFile({ filename, mimeType, content }) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
