import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PrintStatus = "Draft" | "Completed" | "Cancelled";

export interface PrintAppSettings {
  appName: string;
  appLogo: string | null;
  address: string | null;
  phone: string | null;
}

export interface PrintField {
  label: string;
  value?: string;
  badge?: PrintStatus;
}

export interface PrintTableColumn {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: number;
}

export interface PrintDocumentInput {
  appSettings?: PrintAppSettings;
  documentNo: string;
  documentNoLabel: string;
  title: string;
  fieldsLeft: PrintField[];
  fieldsRight: PrintField[];
  sectionTitle: string;
  tableColumns: PrintTableColumn[];
  tableRows: Record<string, string>[];
  remarks?: string | null;
  leftSignatureLabel: string;
  leftSignatureName?: string;
  leftSignatureCaption?: string;
  rightSignatureLabel: string;
  rightSignatureCaption?: string;
  timezone: string;
  fileName: string;
}

const BLUE: [number, number, number] = [44, 95, 138];
const GRAY: [number, number, number] = [102, 102, 102];
const DARK: [number, number, number] = [51, 51, 51];
const LIGHT_GRAY: [number, number, number] = [153, 153, 153];

export function fmtPrintNum(v: string | number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(4);
}

export async function loadLogoDataUrl(logo: string | null): Promise<string | null> {
  if (!logo) return null;
  try {
    const url = logo.startsWith("http") || logo.startsWith("/") ? logo : `/${logo}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function statusFill(status: PrintStatus): [number, number, number] {
  if (status === "Completed") return [92, 184, 92];
  if (status === "Cancelled") return [217, 83, 79];
  return [240, 173, 78];
}

/** Shared branded document print layout for receivings, releasings, and future modules. */
export async function printDocumentPdf(input: PrintDocumentInput): Promise<void> {
  const {
    appSettings,
    documentNo,
    documentNoLabel,
    title,
    fieldsLeft,
    fieldsRight,
    sectionTitle,
    tableColumns,
    tableRows,
    remarks,
    leftSignatureLabel,
    leftSignatureName,
    leftSignatureCaption = "Staff Signature",
    rightSignatureLabel,
    rightSignatureCaption = "Authorized Signature",
    timezone,
    fileName,
  } = input;

  const logoDataUrl = await loadLogoDataUrl(appSettings?.appLogo ?? null);
  const appName = appSettings?.appName || "RBAC System";
  const address = appSettings?.address || null;
  const phone = appSettings?.phone || null;

  const doc = new jsPDF();
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 10;

  let textX = margin;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, y, 14, 14);
      textX = margin + 17;
    } catch {
      textX = margin;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLUE);
  doc.text(appName, textX, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  let infoY = y + 10;
  if (address) {
    doc.text(address, textX, infoY);
    infoY += 4.5;
  }
  if (phone) {
    doc.text(phone, textX, infoY);
  }

  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(documentNoLabel, pageW - margin, y + 2, { align: "right" });
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE);
  doc.text(documentNo, pageW - margin, y + 10, { align: "right" });

  y = Math.max(y + 20, infoY + 4);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFillColor(238, 242, 247);
  doc.roundedRect(margin, y, contentW, 10, 1, 1, "F");
  doc.setFillColor(...BLUE);
  doc.rect(margin, y, 2.5, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLUE);
  doc.text(title, pageW / 2, y + 6.5, { align: "center" });
  y += 14;

  const rows = Math.max(fieldsLeft.length, fieldsRight.length, 1);
  const rowH = 9;
  const boxH = 10 + rows * rowH + 4;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(221);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentW, boxH, 1, 1, "FD");
  const leftX = margin + 4;
  const rightX = margin + contentW / 2 + 2;
  let ry = y + 7;

  const drawField = (x: number, fieldY: number, field: PrintField) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const label = `${field.label}:`;
    doc.text(label, x, fieldY);
    const labelW = doc.getTextWidth(`${label} `);
    if (field.badge) {
      const [sr, sg, sb] = statusFill(field.badge);
      const statusText = field.badge.toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const badgeW = doc.getTextWidth(statusText) + 8;
      doc.setFillColor(sr, sg, sb);
      doc.roundedRect(x + labelW, fieldY - 4.5, badgeW, 7, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(statusText, x + labelW + 4, fieldY + 0.2);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(field.value || "-", x + labelW, fieldY);
    }
    doc.setDrawColor(204);
    doc.setLineWidth(0.2);
    doc.line(x, fieldY + 1.5, x + contentW / 2 - 8, fieldY + 1.5);
  };

  for (let i = 0; i < rows; i++) {
    if (fieldsLeft[i]) drawField(leftX, ry, fieldsLeft[i]);
    if (fieldsRight[i]) drawField(rightX, ry, fieldsRight[i]);
    ry += rowH;
  }

  y += boxH + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text(sectionTitle, margin, y);
  y += 1.5;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 3;

  const head = tableColumns.map((c) => c.header);
  const body = tableRows.map((row) => tableColumns.map((c) => row[c.key] ?? ""));

  const columnStyles: Record<
    number,
    { halign?: "left" | "center" | "right"; cellWidth?: number }
  > = {};
  tableColumns.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || "left",
      ...(col.width ? { cellWidth: col.width } : {}),
    };
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [head],
    body,
    headStyles: {
      fillColor: BLUE,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: { fontSize: 7.5, textColor: DARK, cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    styles: { lineColor: [224, 224, 224], lineWidth: 0.2 },
    columnStyles,
  });

  y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 20) + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLUE);
  doc.text("REMARKS:", margin, y);
  y += 2;
  const remarksH = 18;
  doc.setDrawColor(221);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, remarksH, 1, 1, "S");
  if (remarks) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(remarks, margin + 2, y + 5, { maxWidth: contentW - 4 });
  }
  y += remarksH + 8;

  const sigW = 65;
  const sigL = margin + 5;
  const sigR = margin + contentW / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(leftSignatureLabel, sigL, y);
  doc.text(rightSignatureLabel, sigR, y);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(sigL, y + 14, sigL + sigW, y + 14);
  doc.line(sigR, y + 14, sigR + sigW, y + 14);
  if (leftSignatureName && leftSignatureName !== "-") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(leftSignatureName, sigL + sigW / 2, y + 18, { align: "center" });
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(leftSignatureCaption, sigL + sigW / 2, y + 22, { align: "center" });
  doc.text(rightSignatureCaption, sigR + sigW / 2, y + 22, { align: "center" });

  const footerY = pageH - 10;
  doc.setDrawColor(221);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 3, pageW - margin, footerY - 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_GRAY);
  const stamp = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || undefined,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
  doc.text(
    `Generated on ${stamp} | This is a computer-generated document`,
    pageW / 2,
    footerY,
    { align: "center" }
  );

  doc.save(fileName);
}
