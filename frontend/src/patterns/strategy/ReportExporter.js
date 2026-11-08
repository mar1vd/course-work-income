// Патерн Strategy — контекст. Формує файл звіту за допомогою обраної стратегії.
// Додавання нового формату (PDF, JSON тощо) не потребує змін ні в цьому класі,
// ні в сторінці «Звіти»: достатньо нової стратегії в EXPORT_STRATEGIES.
import { ExportStrategy } from './ExportStrategy.js';

export class ReportExporter {
  constructor(strategy) {
    this.setStrategy(strategy);
  }

  setStrategy(strategy) {
    if (!(strategy instanceof ExportStrategy)) throw new TypeError('Очікувалась стратегія експорту (ExportStrategy)');
    this.strategy = strategy;
  }

  // Повертає опис файла; сам файл у браузері зберігає downloadFile()
  createFile(summary) {
    return {
      filename: `report_${summary.from}_${summary.to}.${this.strategy.extension}`,
      mimeType: this.strategy.mimeType,
      content: this.strategy.serialize(summary),
    };
  }
}
