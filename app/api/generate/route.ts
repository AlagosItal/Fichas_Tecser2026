import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No se encontró GEMINI_API_KEY. Configura la variable de entorno en Vercel o .env.local.' },
        { status: 400 }
      );
    }

    const { inputText, inputUrl, inputCatalogUrl, productPhotos, specTablePhoto, files } = await req.json();

    const parts: any[] = [
      {
        text: `Actúa como Ingeniero Senior de Comercial Andexport Chile. Genera una ficha técnica de 3 PÁGINAS con los datos proporcionados.
        
        INPUTS: 
        Texto: ${inputText || 'No especificado'}
        URL: ${inputUrl || 'No especificada'}
        URL CATÁLOGO: ${inputCatalogUrl || 'No especificada'}
        
        REGLAS:
        1. TRADUCE todo al ESPAÑOL TÉCNICO.
        2. El campo "codigo" DEBE extraerse de la tabla de especificaciones adjunta (imagen o PDF). Si hay múltiples códigos, lista el primero o el que mejor corresponda al producto. Si no hay tabla, usa el código del texto.
        3. Página 1: Datos básicos y características (mínimo 6). Si la data incluye adhesivo, textura, espesor o unidad, inclúyelo detalladamente dentro de la 'descripcion_tecnica'.
        4. Página 2: Tabla comparativa (compara este producto con un estándar similar) y aplicaciones industriales.
        5. Página 3: Sección de Observaciones y una lista EXACTA de 4 recursos en el orden especificado.
        6. SOPORTE (Usa estos valores EXACTOS literal): 
           - Comercial: "Comunícate con nosotros\\nNuestra central +56 2 2495 5100\\ninfo@andexport.com"

        Devuelve JSON con esta estructura exacta:
        {
          "codigo": "string", "nombre": "string", "presentacion": "string", "brandName": "string", "descripcion_tecnica": "string",
          "caracteristicas": [{"label": "string", "value": "string"}],
          "catalogoUrl": "string",
          "pagina2": { "tabla_comparativa": [{"producto": "string", "propiedad": "string", "valor": "string"}], "aplicaciones_industriales": ["string"], "detalles_proceso": "string" },
          "pagina3": { 
            "recursos": [
              {"titulo": "Catálogo del Proveedor", "url": "URL o 'No Disponible'", "tipo": "link"},
              {"titulo": "Catálogo Andexport", "url": "URL o 'No Disponible'", "tipo": "link"},
              {"titulo": "Video de Producto o Marca", "url": "URL o 'No Disponible'", "tipo": "video"},
              {"titulo": "Sitio Web Andexport", "url": "https://www.andexport.com", "tipo": "link"}
            ], 
            "observaciones": "string", "contacto_comercial": "string" 
          }
        }`
      }
    ];

    // Adjuntar foto de la tabla de especificaciones si existe
    if (specTablePhoto) {
      const cleanBase64 = specTablePhoto.includes(',') ? specTablePhoto.split(',')[1] : specTablePhoto;
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg'
        }
      });
    }

    // Adjuntar fotos de producto
    if (Array.isArray(productPhotos)) {
      productPhotos.forEach((p: string | null) => {
        if (p) {
          const cleanBase64 = p.includes(',') ? p.split(',')[1] : p;
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg'
            }
          });
        }
      });
    }

    // Adjuntar archivos (imágenes y PDFs)
    if (Array.isArray(files)) {
      files.forEach((f: { base64: string; type: string }) => {
        if (f.base64 && f.type) {
          if (f.type.startsWith('image/') || f.type === 'application/pdf') {
            parts.push({
              inlineData: {
                data: f.base64,
                mimeType: f.type
              }
            });
          }
        }
      });
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    // Modelos Gemini 3.x con fallback: gemini-3.7-flash -> gemini-3.5-flash -> gemini-3.8-flash
    const candidateModels = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.8-flash"];
    let result = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        result = await genAI.models.generateContent({
          model: modelName,
          contents: [{ parts }],
          config: { responseMimeType: "application/json" }
        });
        if (result && result.text) break;
      } catch (err: any) {
        console.warn(`Error con modelo ${modelName}:`, err?.message || err);
        lastError = err;
      }
    }

    if (!result || !result.text) {
      throw lastError || new Error("No se pudo obtener respuesta de los modelos de Gemini.");
    }

    const rawText = result.text.trim();
    // Limpiar formato markdown ```json ... ``` si estuviera presente
    const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    
    const parsedData = JSON.parse(cleanedText);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Error en API /api/generate:", error);
    return NextResponse.json(
      { error: error?.message || 'Error procesando solicitud con Gemini' },
      { status: 500 }
    );
  }
}
