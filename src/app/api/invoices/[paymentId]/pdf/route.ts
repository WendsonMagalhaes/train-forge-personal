import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/db";
import { payments, students, users, subscriptions, plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateInvoiceForPayment } from "@/lib/actions/finance";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;

  let invoice;
  try {
    invoice = await getOrCreateInvoiceForPayment(paymentId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Não foi possível gerar o recibo." },
      { status: 400 }
    );
  }

  const [row] = await db
    .select({
      amountCents: payments.amountCents,
      paidAt: payments.paidAt,
      method: payments.method,
      studentName: users.name,
      planName: plans.name,
      trainerId: students.trainerId,
    })
    .from(payments)
    .innerJoin(students, eq(students.id, payments.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
  }

  const [trainerRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, row.trainerId))
    .limit(1);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]); // A5-ish, suficiente para um recibo simples
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();
  let y = height - 60;

  const drawLine = (text: string, opts: { size?: number; useBold?: boolean; gap?: number } = {}) => {
    const { size = 12, useBold = false, gap = 22 } = opts;
    page.drawText(text, { x: 50, y, size, font: useBold ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= gap;
  };

  drawLine("Train Forge", { size: 20, useBold: true, gap: 30 });
  drawLine(trainerRow?.name ? `Personal: ${trainerRow.name}` : "", { size: 11 });
  drawLine(" ", { gap: 14 });
  drawLine(`Recibo Nº ${invoice.number}`, { size: 14, useBold: true, gap: 26 });
  drawLine(`Aluno: ${row.studentName}`);
  drawLine(`Plano: ${row.planName}`);
  drawLine(`Valor: ${(row.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
  drawLine(`Forma de pagamento: ${labelForMethod(row.method)}`);
  drawLine(
    `Data do pagamento: ${row.paidAt ? new Date(row.paidAt).toLocaleDateString("pt-BR") : "—"}`
  );
  drawLine(" ", { gap: 14 });
  drawLine(`Emitido em ${new Date(invoice.issuedAt).toLocaleDateString("pt-BR")}`, { size: 10 });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${invoice.number}.pdf"`,
    },
  });
}

function labelForMethod(method: string | null) {
  const labels: Record<string, string> = {
    pix: "PIX",
    boleto: "Boleto",
    credit_card: "Cartão de crédito",
    cash: "Dinheiro",
    other: "Outro",
  };
  return method ? (labels[method] ?? method) : "—";
}
