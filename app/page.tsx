'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Upload, 
  Printer, 
  Sparkles, 
  Trash2, 
  Loader2,
  CheckCircle2,
  Type,
  Maximize2,
  Camera,
  X
} from 'lucide-react';
import { GoogleGenAI, Type as GeminiType } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Share2, ExternalLink, Copy } from 'lucide-react';

// --- Constants & Types ---

const MODEL_NAME = "gemini-3-flash-preview"; // Using the stable recommended model for flash tasks

interface Characteristic {
  label: string;
  value: string;
}

interface TechnicalSheet {
  codigo: string;
  nombre: string;
  presentacion: string;
  adhesivo: string;
  textura: string;
  espesor: string;
  unidad: string;
  descripcion_tecnica: string;
  caracteristicas: Characteristic[];
  catalogoUrl: string;
  pagina2: {
    tabla_comparativa: { producto: string; propiedad: string; valor: string }[];
    aplicaciones_industriales: string[];
    detalles_proceso: string;
  };
  pagina3: {
    recursos: { titulo: string; url: string; tipo: 'video' | 'link' }[];
    observaciones: string;
    contacto_comercial: string;
    contacto_tecnico: string;
  };
}

const DEFAULT_SHEET: TechnicalSheet = {
  codigo: "AU9010R",
  nombre: "TEFLÓN POROSO 0.10MM1000MM30M",
  presentacion: "Pliego",
  adhesivo: "Sin Adhesivo",
  textura: "Poroso",
  espesor: "0.1",
  unidad: "M2",
  descripcion_tecnica: "Pliego de teflón poroso de 0.10mm, sin adhesivo, ideal para aplicaciones que requieren permeabilidad y antiadherencia. Este tejido combina fibra de vidrio con un menor contenido de recubrimiento de PTFE.",
  caracteristicas: [
    { label: "Ancho estándar", value: "1000 mm" },
    { label: "Espesor del soporte", value: "0.10 mm" },
    { label: "Peso del soporte", value: "140 g/m²" },
    { label: "Rango de Temperatura", value: "-73 a +260 °C" }
  ],
  catalogoUrl: "https://andexport.cl/catalogo-general",
  pagina2: {
    tabla_comparativa: [
      { producto: "AU9010R (Poroso)", propiedad: "Flujo de aire", valor: "20-60 cfm" },
      { producto: "Premium PTFE", propiedad: "Flujo de aire", valor: "Nulo" }
    ],
    aplicaciones_industriales: ["Industria Aeroespacial", "Sellado Térmico", "Moldeo de Elastómeros"],
    detalles_proceso: "Ideal para procesos de secado y curado bajo presión donde se requiere paso de aire."
  },
  pagina3: {
    recursos: [
      { titulo: "Video de Aplicación", url: "https://andexport.cl/videos", tipo: "video" },
      { titulo: "Información Adicional", url: "https://andexport.cl/recursos", tipo: "link" }
    ],
    observaciones: "Es obligatorio conectar el conductor de tierra para prevenir descargas eléctricas. No exceder el voltaje nominal indicado en la placa técnica. Asegurar un ajuste mecánico firme sobre la boquilla para evitar sobrecalentamientos por falta de contacto.",
    contacto_comercial: "Comunícate con nosotros\nNuestra central +56 2 2495 5100\nventasweb@andexport.com",
    contacto_tecnico: "Yoanna Navarro - Asistente Soporte Técnico\n56 2 2495 5156 / +569 4141 6796"
  }
};

// --- Main Component ---

export default function AndexportGenerator() {
  const [sheet, setSheet] = useState<TechnicalSheet>(DEFAULT_SHEET);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [inputCatalogUrl, setInputCatalogUrl] = useState("");
  const [productPhotos, setProductPhotos] = useState<(string | null)[]>([null, null, null, null]);
  const [files, setFiles] = useState<{ id: string; name: string; type: string; base64: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "" });

  const [specTablePhoto, setSpecTablePhoto] = useState<string | null>(null);
  const [isUploadingSpec, setIsUploadingSpec] = useState(false);
  const specInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState<boolean[]>([false, false, false, false]);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new (window as any).Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Reduced for safety
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Quality 0.5 for maximum safety with 4 photos
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        
        const newPhotos = [...productPhotos];
        newPhotos[index] = compressedBase64;
        setProductPhotos(newPhotos);
        
        const newUploading = [...isUploading];
        newUploading[index] = false;
        setIsUploading(newUploading);
      };
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...productPhotos];
    newPhotos[index] = null;
    setProductPhotos(newPhotos);
  };

  const handleSpecUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSpec(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new (window as any).Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setSpecTablePhoto(compressedBase64);
        setIsUploadingSpec(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    Array.from(uploadedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          base64: (reader.result as string).split(',')[1]
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const generateSheet = async () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) return alert("Configura la API Key.");
    setLoading(true);
    try {
      const parts: any[] = [
        { text: `Actúa como Ingeniero Senior de Comercial Andexport Chile. Genera una ficha técnica de 3 PÁGINAS con los datos proporcionados.
        
        INPUTS: 
        Texto: ${inputText}
        URL: ${inputUrl}
        URL CATÁLOGO: ${inputCatalogUrl}
        
        REGLAS:
        1. TRADUCE todo al ESPAÑOL TÉCNICO.
        2. Página 1: Datos básicos y características (mínimo 6).
        3. Página 2: Tabla comparativa (compara este producto con un estándar similar) y aplicaciones industriales.
        4. Página 3: Recursos (links a videos y material técnico, SIN repetir el catálogo industrial que ya tiene su propio botón) y sección de Observaciones.
        5. SOPORTE (Usa estos valores EXACTOS literal): 
           - Comercial: "Comunícate con nosotros\\nNuestra central +56 2 2495 5100\\nventasweb@andexport.com"
           - Técnico: "Yoanna Navarro - Asistente Soporte Técnico\\n56 2 2495 5156 / +569 4141 6796"

        Devuelve JSON con esta estructura exacta:
        {
          "codigo": "string", "nombre": "string", "presentacion": "string", "adhesivo": "string", "textura": "string", "espesor": "string", "unidad": "string", "descripcion_tecnica": "string",
          "caracteristicas": [{"label": "string", "value": "string"}],
          "catalogoUrl": "string",
          "pagina2": { "tabla_comparativa": [{"producto": "string", "propiedad": "string", "valor": "string"}], "aplicaciones_industriales": ["string"], "detalles_proceso": "string" },
          "pagina3": { "recursos": [{"titulo": "string", "url": "string", "tipo": "video|link"}], "observaciones": "string", "contacto_comercial": "string", "contacto_tecnico": "string" }
        }` }
      ];

      files.forEach(f => { if (f.type.startsWith('image/')) parts.push({ inlineData: { data: f.base64, mimeType: f.type } }); });
      productPhotos.forEach(p => { if (p) parts.push({ inlineData: { data: p.split(',')[1], mimeType: 'image/jpeg' } }); });

      const result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [{ parts }],
        config: { responseMimeType: "application/json" }
      });

      const responseText = result.text;
      if (responseText) setSheet(JSON.parse(responseText));
    } catch (error) {
      console.error(error);
      alert("Error en generación.");
    } finally {
      setLoading(false);
    }
  };

  const saveToFirestore = async () => {
    setIsSaving(true);
    // Timeout safety
    const timeoutId = setTimeout(() => {
      if (isSaving) {
        setIsSaving(false);
        alert("La conexión con Firebase está tardando demasiado. Revisa tu conexión o intenta con menos fotos.");
      }
    }, 15000);

    try {
      const slugify = (text: string) => text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

      const docId = sheet.codigo ? slugify(sheet.codigo) : `ficha-${Date.now()}`;
      const docRef = doc(db, "fichas", docId);
      
      await setDoc(docRef, {
        ...sheet,
        productPhotos,
        specTablePhoto,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Documento guardado con éxito:", docId);
      const url = `${window.location.origin}/ver/${docId}`;
      setShareUrl(url);
      setIsSaving(false); // Force state change before modal
      setShowShareModal(true);
    } catch (error: any) {
      console.error("Error saving to Firestore:", error);
      alert("Error al guardar: " + (error.message || "Problema de conexión"));
      setIsSaving(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      setIsPrinting(true);
      // Small delay to ensure the state update is processed and UI is ready
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 500);
    }
  };

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex flex-col md:flex-row antialiased ${isPrinting ? 'printing-active' : ''}`}>
      {/* Sidebar */}
      <aside className="w-full md:w-[420px] bg-white border-r border-slate-200 p-8 overflow-y-auto no-print shadow-xl z-10 print:hidden">
        <div className="flex flex-col gap-1 mb-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#c41e24] rounded-lg flex items-center justify-center rotate-3 shadow-md">
                <Sparkles className="text-white w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tighter leading-none uppercase">Tablero de Datos</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 pl-0.5">Control de Generación</p>
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              <Type className="w-3.5 h-3.5 text-[#c41e24]" /> Especificaciones de Entrada
            </label>
            <textarea 
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-[#c41e24]/10 focus:border-[#c41e24] outline-none transition-all placeholder:text-slate-400"
              placeholder="Pega aquí el texto del catálogo en inglés o español..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              <LinkIcon className="w-3.5 h-3.5 text-[#c41e24]" /> Link de Referencia
            </label>
            <input 
              type="url"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-[#c41e24]/10 focus:border-[#c41e24] outline-none transition-all"
              placeholder="https://proveedor.com/item"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              <LinkIcon className="w-3.5 h-3.5 text-[#c41e24]" /> URL Catálogo Andexport
            </label>
            <input 
              type="url"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-[#c41e24]/10 focus:border-[#c41e24] outline-none transition-all"
              placeholder="https://andexport.cl/catalogo-pvc"
              value={inputCatalogUrl}
              onChange={(e) => setInputCatalogUrl(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              <Camera className="w-3.5 h-3.5 text-[#c41e24]" /> Fotografías del Producto
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    {idx === 0 ? "Foto Principal (Hoja 1)" : `Foto Galería #${idx + 1}`}
                  </span>
                  <div 
                    onClick={() => photoInputRefs[idx].current?.click()}
                    className="relative aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#c41e24] hover:bg-red-50/10 transition-all overflow-hidden group"
                  >
                    {productPhotos[idx] ? (
                      <>
                        <img src={productPhotos[idx]!} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          {isUploading[idx] ? <Loader2 className="text-white w-6 h-6 animate-spin" /> : <Upload className="text-white w-6 h-6" />}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg z-20"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {isUploading[idx] ? <Loader2 className="w-5 h-5 text-[#c41e24] animate-spin" /> : <Upload className="w-5 h-5 text-slate-300" />}
                        <span className="text-[9px] font-bold text-slate-400">{isUploading[idx] ? "Subiendo..." : "Click para subir"}</span>
                      </div>
                    )}
                    <input type="file" hidden ref={photoInputRefs[idx]} onChange={(e) => handlePhotoUpload(e, idx)} accept="image/*" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              <FileText className="w-3.5 h-3.5 text-[#c41e24]" /> Tabla de Especificaciones
            </label>
            <div 
              onClick={() => specInputRef.current?.click()}
              className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#c41e24] hover:bg-red-50/10 transition-all overflow-hidden group"
            >
              {specTablePhoto ? (
                <>
                  <img src={specTablePhoto} alt="Tabla Spec" className="max-h-32 object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {isUploadingSpec ? <Loader2 className="text-white w-6 h-6 animate-spin" /> : <Upload className="text-white w-6 h-6" />}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSpecTablePhoto(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg z-20"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center">
                  {isUploadingSpec ? <Loader2 className="w-6 h-6 text-[#c41e24] animate-spin" /> : <Upload className="w-6 h-6 text-slate-300 group-hover:text-[#c41e24]" />}
                  <span className="text-[10px] font-bold text-slate-500 mt-1">{isUploadingSpec ? "Procesando..." : "Sube una imagen de la tabla (JPG/PNG)"}</span>
                </div>
              )}
              <input type="file" hidden ref={specInputRef} onChange={handleSpecUpload} accept="image/*" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              <FileText className="w-3.5 h-3.5 text-[#c41e24]" /> Documentos y Multimedia
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#c41e24] hover:bg-red-50/30 transition-all group active:scale-[0.98]"
            >
              <Upload className="w-8 h-8 text-slate-300 group-hover:text-[#c41e24] transition-colors" />
              <div className="text-center">
                <span className="block text-xs text-slate-600 font-bold">Subir Documentos</span>
                <span className="text-[10px] text-slate-400">Sin límite de archivos</span>
              </div>
              <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" />
            </div>
            
            {/* List of files added */}
            <div className="flex flex-col gap-2 pt-2">
              <AnimatePresence>
                {files.map(f => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={f.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-white border border-slate-200 rounded flex items-center justify-center shrink-0">
                        {f.type.includes('pdf') ? <FileText className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-blue-500" />}
                      </div>
                      <span className="text-xs font-medium text-slate-600 truncate">{f.name}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles(prev => prev.filter(file => file.id !== f.id));
                      }}
                      className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <button 
            onClick={generateSheet}
            disabled={loading}
            className="w-full py-5 bg-[#c41e24] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-[#a81a1f] disabled:opacity-50 disabled:cursor-wait transition-all shadow-xl shadow-red-900/20 active:scale-95 uppercase tracking-widest"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Analizando Datos..." : "Generar Ficha de 3 Páginas"}
          </button>
        </div>

        <div className="mt-12 flex flex-col gap-4">
          <button 
            onClick={handlePrint}
            disabled={isPrinting}
            className={`w-full py-4 ${isPrinting ? 'bg-slate-400' : 'bg-slate-900'} text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg active:scale-95 uppercase tracking-widest ring-offset-2 focus:ring-2 focus:ring-slate-900`}
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {isPrinting ? "Preparando PDF..." : "Exportar Ficha (3 Hojas)"}
          </button>
          {isPrinting && (
            <p className="text-[10px] text-slate-400 text-center animate-pulse">
              Si no abre, usa Ctrl+P o Cmd+P
            </p>
          )}

          <button 
            onClick={saveToFirestore}
            disabled={isSaving}
            className={`w-full py-4 ${isSaving ? 'bg-slate-400' : 'bg-red-600 text-white'} rounded-2xl text-xs font-black flex items-center justify-center gap-3 hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-900/20 uppercase tracking-widest`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {isSaving ? "Publicando Ficha..." : "Guardar y Compartir"}
          </button>
        </div>
      </aside>

      {/* Main Preview */}
      <main className="flex-1 flex flex-col items-center gap-12 p-8 md:p-16 overflow-y-auto pdf-container bg-slate-100 scroll-smooth">
        
        {/* --- PAGE 1 --- */}
        <div className="a4-sheet bg-white flex flex-col font-sans" id="sheet-1">
          <div className="p-[30px] flex-1 flex flex-col h-full">
            <header className="flex justify-between items-start border-b-4 border-[#c41e24] pb-4 mb-6">
              <div className="flex flex-col items-start gap-2">
                <img 
                  src="https://mcusercontent.com/e74807a9562151fbd59303189/images/db4de867-1e35-4282-fd6f-842fb3cd6503.png" 
                  alt="Andexport Logo" 
                  className="h-20 w-auto object-contain"
                />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] pl-2 border-l-4 border-[#c41e24] mt-1 max-w-[500px]">
                  Maquinaria e Insumos para la Industria del Plástico y Packaging
                </span>
              </div>
              <div className="text-right flex flex-col items-end shrink-0 pl-10 h-24 justify-between pt-1">
                <span className="bg-[#c41e24] text-white px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm shadow-lg shadow-red-900/10">Ficha Técnica</span>
                <span className="text-slate-400 text-[9px] font-mono font-bold tracking-tighter">DOCID: {sheet.codigo || "PENDING"}</span>
              </div>
            </header>

            <section className="mb-10">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="bg-slate-800 text-white py-2 px-6 font-black text-[10px] uppercase tracking-[0.3em]">Información del Producto</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              
              <div className="flex justify-between items-start gap-12">
                <div className="flex-1 grid grid-cols-[160px_1fr] gap-y-4 text-[13px]">
                  {[
                    ["Código Interno", "codigo"],
                    ["Nombre del Producto", "nombre"],
                    ["Tipo Presentación", "presentacion"],
                    ["Adhesivo", "adhesivo"],
                    ["Textura", "textura"],
                    ["Espesor (mm)", "espesor"],
                    ["Unidad Medida", "unidad"]
                  ].map(([label, key]) => (
                    <React.Fragment key={key}>
                      <span className="font-bold text-slate-400 uppercase text-[9px] flex items-start pt-1 tracking-wider">{label}:</span>
                      <textarea 
                        className="w-full border-b border-transparent hover:border-slate-200 focus:border-[#c41e24] focus:ring-0 outline-none font-bold text-slate-800 py-0.5 transition-all bg-transparent uppercase resize-none h-auto min-h-[22px] leading-tight overflow-hidden"
                        rows={1}
                        onInput={(e) => {
                          e.currentTarget.style.height = 'auto';
                          e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                        value={(sheet as any)[key]} 
                        onChange={(e) => setSheet(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </React.Fragment>
                  ))}
                </div>
                <div className="w-[200px] h-[200px] border border-slate-100 bg-white rounded-xl overflow-hidden relative shadow-sm shrink-0 flex items-center justify-center p-2 cursor-zoom-in"
                  onClick={() => setSelectedImage(productPhotos[0])}
                >
                  {productPhotos[0] ? (
                    <img 
                      src={productPhotos[0]} 
                      alt="Producto" 
                      className="max-w-full max-h-full object-contain hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center bg-slate-50/50">
                       <ImageIcon className="w-10 h-10 text-slate-200 mb-2" />
                       <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Foto Principal</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mb-10">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="bg-slate-800 text-white py-2.5 px-6 font-black text-xs uppercase tracking-[0.2em]">Descripción Técnica</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              <textarea 
                className="w-full min-h-[120px] border-none focus:ring-0 outline-none text-[13px] text-slate-700 leading-relaxed overflow-hidden bg-white p-4 rounded-xl border border-slate-50"
                style={{ resize: 'none' }}
                value={sheet.descripcion_tecnica}
                onChange={(e) => setSheet(prev => ({ ...prev, descripcion_tecnica: e.target.value }))}
              />
            </section>

            <section className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                <h2 className="bg-slate-800 text-white py-2 px-6 font-black text-[10px] uppercase tracking-[0.3em]">Propiedades Físicas</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {sheet.caracteristicas.map((char, i) => (
                  <div key={i} className="flex flex-col p-2 border border-slate-100 rounded-lg bg-slate-50/30">
                    <input 
                      className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5 bg-transparent outline-none border-none focus:ring-0" 
                      value={char.label}
                      onChange={(e) => {
                        const n = [...sheet.caracteristicas]; n[i].label = e.target.value; setSheet(p=>({...p, caracteristicas:n}))
                      }}
                    />
                    <textarea 
                      className="text-[12px] font-bold text-slate-700 leading-tight bg-transparent outline-none border-none focus:ring-0 resize-none h-auto overflow-hidden" 
                      rows={1}
                      onInput={(e) => {
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
                      value={char.value}
                      onChange={(e) => {
                        const n = [...sheet.caracteristicas]; n[i].value = e.target.value; setSheet(p=>({...p, caracteristicas:n}))
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <footer className="mt-10 pt-8 border-t border-slate-100 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              <div className="flex flex-col gap-1">
                <span>Aeropuerto Norte 9627. Parque de Negocios ENEA. Pudahuel. Santiago - Chile.</span>
                {shareUrl && <span className="text-[#c41e24] lowercase font-mono">Ver online: {shareUrl}</span>}
              </div>
              <span>www.andexport.com</span>
            </footer>
          </div>
        </div>

        {/* --- PAGE 2 --- */}
        <div className="a4-sheet bg-white flex flex-col font-sans" id="sheet-2" style={{ breakBefore: 'always' }}>
          <div className="p-[30px] flex-1 flex flex-col h-full">
            <header className="flex justify-between items-start mb-6">
              <div className="flex flex-col items-start">
                <img 
                  src="https://mcusercontent.com/e74807a9562151fbd59303189/images/db4de867-1e35-4282-fd6f-842fb3cd6503.png" 
                  alt="Andexport Logo" 
                  className="h-12 w-auto object-contain mb-2"
                />
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Análisis Técnico y Comparativo</span>
              </div>
              <div className="bg-slate-100 px-4 py-2 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">Página Técnica 02</div>
            </header>

            <section className="mb-6">
               <div className="flex items-center gap-4 mb-4">
                <h2 className="bg-[#c41e24] text-white py-2 px-6 font-black text-[10px] uppercase tracking-[0.2em]">Tabla Comparativa de Grados</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-2 border border-slate-700">Producto / Variante</th>
                    <th className="p-2 border border-slate-700">Propiedad Crítica</th>
                    <th className="p-2 border border-slate-700">Valor Comparativo</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.pagina2.tabla_comparativa.map((row, i) => (
                    <tr key={i} className="even:bg-slate-50">
                      <td className="p-2 border border-slate-200 font-bold text-slate-700 uppercase align-top">
                        <textarea 
                          className="w-full bg-transparent outline-none resize-none overflow-hidden" 
                          rows={1}
                          onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                          value={row.producto} 
                          onChange={e=>{const n=[...sheet.pagina2.tabla_comparativa]; n[i].producto=e.target.value; setSheet(p=>({...p, pagina2:{...p.pagina2, tabla_comparativa:n}}))}} 
                        />
                      </td>
                      <td className="p-2 border border-slate-200 text-slate-500 uppercase align-top">
                        <textarea 
                          className="w-full bg-transparent outline-none resize-none overflow-hidden" 
                          rows={1}
                          onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                          value={row.propiedad} 
                          onChange={e=>{const n=[...sheet.pagina2.tabla_comparativa]; n[i].propiedad=e.target.value; setSheet(p=>({...p, pagina2:{...p.pagina2, tabla_comparativa:n}}))}} 
                        />
                      </td>
                      <td className="p-2 border border-slate-200 font-mono text-[#c41e24] font-bold align-top">
                        <textarea 
                          className="w-full bg-transparent outline-none resize-none overflow-hidden" 
                          rows={1}
                          onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                          value={row.valor} 
                          onChange={e=>{const n=[...sheet.pagina2.tabla_comparativa]; n[i].valor=e.target.value; setSheet(p=>({...p, pagina2:{...p.pagina2, tabla_comparativa:n}}))}} 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mb-6 grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="bg-slate-800 text-white py-2 px-6 font-black text-[10px] uppercase tracking-[0.2em]">Aplicaciones</h2>
                </div>
                <ul className="space-y-2">
                  {sheet.pagina2.aplicaciones_industriales.map((app, i) => (
                    <li key={i} className="flex items-center gap-3 text-[12px] text-slate-600 font-medium group">
                      <div className="w-1.5 h-1.5 bg-[#c41e24] rounded-full"></div>
                      <input className="flex-1 bg-transparent outline-none border-b border-transparent hover:border-slate-100" value={app} onChange={e=>{const n=[...sheet.pagina2.aplicaciones_industriales]; n[i]=e.target.value; setSheet(p=>({...p, pagina2:{...p.pagina2, aplicaciones_industriales:n}}))}} />
                      <button onClick={()=>{const n=sheet.pagina2.aplicaciones_industriales.filter((_,idx)=>idx!==i); setSheet(p=>({...p, pagina2:{...p.pagina2, aplicaciones_industriales:n}}))}} className="text-red-400 opacity-0 group-hover:opacity-100">×</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                 <h3 className="text-[9px] font-black text-[#c41e24] uppercase tracking-widest mb-2">Nota de Proceso</h3>
                 <textarea className="w-full bg-transparent outline-none text-[12px] text-slate-600 leading-relaxed italic h-24 resize-none" value={sheet.pagina2.detalles_proceso} onChange={e=>setSheet(p=>({...p, pagina2:{...p.pagina2, detalles_proceso:e.target.value}}))} />
              </div>
            </section>

            <div className="flex-1"></div>

            <footer className="mt-10 pt-8 border-t border-slate-100 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Aeropuerto Norte 9627. Parque de Negocios ENEA. Pudahuel. Santiago - Chile.</span>
              <div className="flex gap-4">
                 <span>ISO 9001:2015</span>
                 <span>Página 02/03</span>
              </div>
            </footer>
          </div>
        </div>

        {/* --- PAGE 3 --- */}
        <div className="a4-sheet bg-white shadow-2xl flex flex-col font-sans ring-1 ring-slate-200" style={{ pageBreakBefore: 'always' }} id="sheet-3">
          <div className="p-[40px] flex-1 flex flex-col h-full">
            <header className="mb-14 border-l-8 border-[#c41e24] pl-6 py-2">
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Recursos y Soporte</h1>
              <p className="text-xs font-medium text-slate-400">Bibliografía técnica y documentación complementaria</p>
            </header>

            <section className="mb-12">
               <div className="flex items-center gap-4 mb-8">
                <h2 className="bg-slate-800 text-white py-2.5 px-6 font-black text-xs uppercase tracking-[0.2em]">Documentación Digital</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 {sheet.pagina3.recursos.map((res, i) => (
                   <a 
                    href={res.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    key={i} 
                    className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#c41e24] transition-all cursor-pointer group/link"
                   >
                      <div className="bg-white p-3 rounded-xl shadow-sm group-hover/link:bg-[#c41e24] transition-colors">
                        <LinkIcon className="w-6 h-6 text-[#c41e24] group-hover/link:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800 uppercase mb-1">{res.titulo}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate w-full">{res.url}</p>
                      </div>
                   </a>
                 ))}
                 <a 
                  href={sheet.catalogoUrl || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-start gap-4 p-6 bg-[#c41e24] rounded-2xl text-white shadow-xl shadow-red-900/10 hover:bg-[#a81a1f] transition-all"
                 >
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <FileText className="w-6 h-6 text-[#c41e24]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase mb-1">Catálogo Industrial</h4>
                      <p className="text-[10px] text-white/70">Máquinas y Packaging</p>
                    </div>
                 </a>
              </div>
            </section>

            <section className="mb-12 text-slate-900">
               <div className="flex items-center gap-4 mb-8 text-slate-900">
                <h2 className="bg-slate-800 text-white py-2.5 px-6 font-black text-xs uppercase tracking-[0.2em]">Observaciones</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              <div className="p-8 bg-red-50/50 rounded-[30px] border border-red-100 border-l-[12px] border-l-[#c41e24] shadow-sm">
                 <div className="flex gap-6">
                    <CheckCircle2 className="w-8 h-8 text-[#c41e24] shrink-0" />
                    <div className="space-y-6 flex-1">
                        <textarea 
                           className="w-full border-none focus:ring-0 outline-none bg-transparent resize-none text-sm text-slate-700 leading-relaxed font-bold italic overflow-hidden"
                           rows={1}
                           onInput={(e) => {
                             e.currentTarget.style.height = 'auto';
                             e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                           }}
                           ref={(el) => {
                             if (el) {
                               el.style.height = 'auto';
                               el.style.height = el.scrollHeight + 'px';
                             }
                           }}
                           value={sheet.pagina3.observaciones}
                           onChange={(e) => setSheet(prev => ({ 
                             ...prev, 
                             pagina3: { ...prev.pagina3, observaciones: e.target.value } 
                           }))}
                        />
                       <div className="pt-6 border-t border-red-200 grid grid-cols-2 gap-8">
                          <div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Soporte Comercial:</span>
                             <span className="text-xs font-black text-slate-700 block whitespace-pre-line">{sheet.pagina3.contacto_comercial}</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Soporte Técnico:</span>
                             <span className="text-xs font-black text-[#c41e24] block whitespace-pre-line">{sheet.pagina3.contacto_tecnico}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </section>

            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="w-32 h-32 bg-slate-50 flex items-center justify-center rounded-3xl border-4 border-slate-100 p-4">
                   <Maximize2 className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.6em]">Scannable Technical Index</p>
            </div>

            <footer className="mt-10 pt-8 border-t border-slate-100 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Aeropuerto Norte 9627. Parque de Negocios ENEA. Pudahuel. Santiago - Chile.</span>
              <div className="flex gap-4">
                <span>Certificación Vigente</span>
                <span>Página 03/03</span>
              </div>
            </footer>
          </div>
        </div>

        {/* --- EXTRA PAGES FOR PHOTOS --- */}
        {[1, 2, 3].map((idx) => {
          const photo = productPhotos[idx];
          if (!photo) return null;
          return (
            <div key={`photo-page-${idx}`} className="a4-sheet bg-white shadow-2xl flex flex-col font-sans ring-1 ring-slate-200" style={{ pageBreakBefore: 'always' }}>
              <div className="p-[50px] flex-1 flex flex-col h-full">
                <header className="mb-14 border-l-8 border-[#c41e24] pl-6 py-2">
                  <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Galería Fotográfica</h1>
                  <p className="text-xs font-medium text-slate-400">Detalle visual del producto y aplicaciones ({idx})</p>
                </header>
                <div 
                  className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-3xl cursor-zoom-in hover:border-[#c41e24] transition-all bg-slate-50/30"
                  onClick={() => setSelectedImage(photo)}
                >
                  <img src={photo} alt={`Detalle ${idx}`} className="max-w-full max-h-full object-contain rounded-xl" />
                </div>
                <footer className="mt-10 pt-8 border-t border-slate-100 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  <span>Aeropuerto Norte 9627. Parque de Negocios ENEA. Pudahuel. Santiago - Chile.</span>
                  <span>Andexport</span>
                </footer>
              </div>
            </div>
          );
        })}

        {/* --- EXTRA PAGE FOR SPEC TABLE --- */}
        {specTablePhoto && (
          <div className="a4-sheet bg-white shadow-2xl flex flex-col font-sans ring-1 ring-slate-200" style={{ pageBreakBefore: 'always' }}>
            <div className="p-[50px] flex-1 flex flex-col h-full">
              <header className="mb-14 border-l-8 border-[#c41e24] pl-6 py-2">
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tabla de Especificaciones</h1>
                <p className="text-xs font-medium text-slate-400">Modelos y características extendidas</p>
              </header>
              <div 
                className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-3xl cursor-zoom-in hover:border-[#c41e24] transition-all bg-slate-50/30"
                onClick={() => setSelectedImage(specTablePhoto)}
              >
                <img src={specTablePhoto} alt="Tabla de Especificaciones" className="max-w-full max-h-full object-contain rounded-xl" />
              </div>
              <footer className="mt-10 pt-8 border-t border-slate-100 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                <span>Aeropuerto Norte 9627. Parque de Negocios ENEA. Pudahuel. Santiago - Chile.</span>
                <span>Andexport</span>
              </footer>
            </div>
          </div>
        )}
      </main>
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 md:p-12 no-print"
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              alt="Zoomed view" 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && shareUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="text-white w-6 h-6" />
                   </div>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">¡Publicado!</h3>
                </div>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                La ficha técnica ha sido guardada en la nube. Puedes compartir este link directo con tu cliente:
              </p>

              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 group">
                <input 
                  readOnly 
                  value={shareUrl} 
                  className="flex-1 bg-transparent text-xs font-mono text-slate-600 outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    alert("Copiado al portapapeles");
                  }}
                  className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-green-500 transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-4">
                <a 
                  href={shareUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir Link
                </a>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media screen {
          .a4-sheet {
            width: 210mm;
            min-height: 297mm;
            margin-bottom: 2rem;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Force backgrounds and colors even if user has it unchecked in some browsers */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide all UI elements */
          .no-print, 
          aside, 
          button, 
          .animate-pulse,
          .border-r {
            display: none !important;
            visibility: hidden !important;
          }

          /* The root container should not be flex in print */
          div.min-h-screen {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            background: white !important;
          }

          /* Main container for the sheets */
          .pdf-container {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          .a4-sheet {
            display: block !important;
            width: 210mm !important;
            height: 295.5mm !important;
            margin: 0 !important;
            padding: 0 !important;
            break-after: page !important;
            break-before: page !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            background: white !important;
            position: relative !important;
            overflow: hidden !important;
          }

          /* Chrome-specific block fix */
          @media screen and (-webkit-min-device-pixel-ratio:0) {
            .a4-sheet {
              height: 293mm !important;
              page-break-after: always !important;
            }
          }

          .a4-sheet:first-child {
            break-before: avoid !important;
            page-break-before: avoid !important;
          }

          .a4-sheet:last-child {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          table, section {
            break-inside: avoid !important;
          }

          /* Remove all margins added by browser */
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
