import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';

export async function generateInvoicePdf(req: Request, res: Response) {
  const { id } = req.params;

  const challan = await prisma.salesChallan.findUnique({
    where: { id },
    include: { customer: true, items: true },
  });

  if (!challan) throw new ApiError(404, 'Challan not found');
  if (challan.status !== 'CONFIRMED') {
    throw new ApiError(400, 'Invoice can only be generated for a CONFIRMED challan');
  }

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${challan.challanNumber}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text('INVOICE', { align: 'right' });
  doc.fontSize(10).fillColor('#555').text(`Challan #: ${challan.challanNumber}`, { align: 'right' });
  doc.text(`Date: ${challan.createdAt.toDateString()}`, { align: 'right' });
  doc.moveDown(2);

  doc.fillColor('#000').fontSize(12).text('Bill To:', { underline: true });
  doc.fontSize(11).text(challan.customer.name);
  if (challan.customer.businessName) doc.text(challan.customer.businessName);
  doc.text(challan.customer.mobile);
  if (challan.customer.address) doc.text(challan.customer.address);
  doc.moveDown(1.5);

  const startX = 50;
  let y = doc.y;
  doc.fontSize(10).fillColor('#000');
  doc.text('Product', startX, y, { width: 180, continued: false });
  doc.text('SKU', startX + 180, y, { width: 100 });
  doc.text('Qty', startX + 280, y, { width: 60 });
  doc.text('Unit Price', startX + 340, y, { width: 80 });
  doc.text('Amount', startX + 420, y, { width: 80 });
  y += 18;
  doc.moveTo(startX, y).lineTo(550, y).strokeColor('#ccc').stroke();
  y += 8;

  let grandTotal = 0;
  for (const item of challan.items) {
    const lineTotal = Number(item.unitPriceSnapshot) * item.quantity;
    grandTotal += lineTotal;

    doc.text(item.productNameSnapshot, startX, y, { width: 180 });
    doc.text(item.skuSnapshot, startX + 180, y, { width: 100 });
    doc.text(String(item.quantity), startX + 280, y, { width: 60 });
    doc.text(`Rs. ${Number(item.unitPriceSnapshot).toFixed(2)}`, startX + 340, y, { width: 80 });
    doc.text(`Rs. ${lineTotal.toFixed(2)}`, startX + 420, y, { width: 80 });
    y += 20;
  }

  y += 10;
  doc.moveTo(startX, y).lineTo(550, y).strokeColor('#ccc').stroke();
  y += 10;
  doc.fontSize(12).text(`Grand Total: Rs. ${grandTotal.toFixed(2)}`, startX + 300, y, { width: 200, align: 'right' });

  doc.moveDown(3);
  doc.fontSize(9).fillColor('#888').text('This is a system-generated invoice.', 50, doc.y);

  doc.end();
}