import { Injectable } from '@nestjs/common';
import * as Papa from 'papaparse';
import { CsvRecord, FieldMapping } from '../types/response.types';

@Injectable()
export class CsvExportService {
  /**
   * Export data to CSV format - TYPE SAFE
   */
  exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    fields?: string[],
  ): string {
    if (!data || data.length === 0) {
      return '';
    }

    // If fields are specified, filter the data
    let processedData: Partial<T>[] = data;
    if (fields && fields.length > 0) {
      processedData = data.map((item) => {
        const filtered: Partial<T> = {};
        fields.forEach((field) => {
          if (field in item) {
            filtered[field as keyof T] = item[field as keyof T];
          }
        });
        return filtered;
      });
    }

    // Convert to CSV using PapaParse
    const csv = Papa.unparse(processedData, {
      quotes: true,
      delimiter: ',',
      header: true,
    });

    return csv;
  }

  /**
   * Export data with custom headers (Vietnamese translation) - TYPE SAFE
   */
  exportWithCustomHeaders<T extends Record<string, unknown>>(
    data: T[],
    fieldMapping: FieldMapping,
  ): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Transform data with custom headers
    const transformedData: CsvRecord[] = data.map((item) => {
      const transformed: CsvRecord = {};
      Object.keys(fieldMapping).forEach((key) => {
        const value = item[key];
        transformed[fieldMapping[key]] = this.formatCsvValue(value);
      });
      return transformed;
    });

    const csv = Papa.unparse(transformedData, {
      quotes: true,
      delimiter: ',',
      header: true,
    });

    return csv;
  }

  /**
   * Format value for CSV - TYPE SAFE
   */
  private formatCsvValue(
    value: unknown,
  ): string | number | boolean | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    if (value instanceof Date) {
      return this.formatDateTime(value);
    }
    return String(value);
  }

  /**
   * Format date to Vietnamese format
   */
  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Format datetime to Vietnamese format
   */
  formatDateTime(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Format time duration (minutes to hours:minutes)
   */
  formatDuration(minutes: number): string {
    if (!minutes && minutes !== 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Format number as Vietnamese currency
   */
  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '';
    return amount.toLocaleString('vi-VN') + ' đ';
  }

  /**
   * Escape CSV special characters - TYPE SAFE
   */
  escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

