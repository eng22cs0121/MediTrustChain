/**
 * Export utilities for audit trails and batch data
 * Supports PDF and CSV formats
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parse } from 'papaparse';

export interface ExportData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  metadata?: Record<string, string>;
}

export interface AuditTrailData {
  batchId: string;
  drugName: string;
  events: {
    timestamp: string;
    actor: string;
    action: string;
    location?: string;
    status?: string;
  }[];
}

/**
 * Export data to PDF
 */
export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(data.title, 14, 22);
  
  // Add metadata
  let yPos = 35;
  if (data.metadata) {
    doc.setFontSize(10);
    Object.entries(data.metadata).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yPos);
      yPos += 7;
    });
    yPos += 5;
  }

  // Add table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: yPos,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 128, 128] }, // Teal color
    alternateRowStyles: { fillColor: [240, 248, 255] },
    margin: { top: yPos },
  });

  // Add footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount} | MediTrustChain | Generated: ${new Date().toLocaleString()}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Download
  const filename = `${data.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Export audit trail to PDF with enhanced formatting
 */
export function exportAuditTrailToPDF(data: AuditTrailData): void {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 128, 128);
  doc.text('Blockchain Audit Trail', 14, 22);
  
  // Batch info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Batch ID: ${data.batchId}`, 14, 35);
  doc.text(`Drug Name: ${data.drugName}`, 14, 42);
  doc.text(`Total Events: ${data.events.length}`, 14, 49);
  doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, 56);
  
  // Events table
  const tableData = data.events.map(event => [
    new Date(event.timestamp).toLocaleString(),
    event.actor,
    event.action,
    event.location || 'N/A',
    event.status || 'N/A',
  ]);

  autoTable(doc, {
    head: [['Timestamp', 'Actor', 'Action', 'Location', 'Status']],
    body: tableData,
    startY: 65,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [0, 128, 128], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 248, 255] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 40 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30 },
    },
  });

  // Compliance footer
  const finalY = (doc as any).lastAutoTable.finalY || 65;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This audit trail is cryptographically secured on the Ethereum blockchain and cannot be altered.',
    14,
    finalY + 15
  );
  doc.text(
    'Compliant with FDA 21 CFR Part 11 and EU GMP Annex 11 requirements.',
    14,
    finalY + 20
  );

  // Download
  const filename = `AuditTrail_${data.batchId}_${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: ExportData): void {
  // Create CSV content
  const rows = [
    data.headers,
    ...data.rows,
  ];
  
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  // Add BOM for Excel compatibility
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${data.title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export audit trail to CSV
 */
export function exportAuditTrailToCSV(data: AuditTrailData): void {
  const rows = data.events.map(event => [
    new Date(event.timestamp).toLocaleString(),
    event.actor,
    event.action,
    event.location || 'N/A',
    event.status || 'N/A',
  ]);

  exportToCSV({
    title: `AuditTrail_${data.batchId}`,
    headers: ['Timestamp', 'Actor', 'Action', 'Location', 'Status'],
    rows,
    metadata: {
      'Batch ID': data.batchId,
      'Drug Name': data.drugName,
      'Total Events': String(data.events.length),
      'Export Date': new Date().toLocaleString(),
    },
  });
}

/**
 * Parse CSV file
 */
export function parseCSV<T = any>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    parse(file, {
      complete: (results) => resolve(results.data as T[]),
      error: (error) => reject(error),
      header: true,
      skipEmptyLines: true,
    });
  });
}
