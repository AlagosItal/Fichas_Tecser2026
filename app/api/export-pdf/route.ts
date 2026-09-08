import puppeteer from 'puppeteer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { html, fileName } = await req.json();

    if (!html) {
      return NextResponse.json(
        { error: 'HTML requerido' },
        { status: 400 }
      );
    }

    // Lanzar navegador headless
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Establecer tamaño de viewport
    await page.setViewport({ width: 1200, height: 1600 });

    // Inyectar HTML
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Generar PDF A4
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true
    });

    await browser.close();

    // Retornar PDF con headers de descarga
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'ficha.pdf'}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error PDF:', error);
    return NextResponse.json(
      { error: 'Error generando PDF' },
      { status: 500 }
    );
  }
}
