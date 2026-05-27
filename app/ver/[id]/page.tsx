'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  FileText, 
  Link as LinkIcon, 
  ImageIcon, 
  Printer, 
  Sparkles, 
  CheckCircle2,
  Maximize2,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams } from 'next/navigation';

export default function ClientView() {
  const params = useParams();
  const id = params.id as string;
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadFicha() {
      if (!id) return;
      try {
        const docRef = doc(db, "fichas", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSheet(docSnap.data());
        }
      } catch (error) {
        console.error("Error loading ficha:", error);
      } finally {
        setLoading(false);
      }
    }
    loadFicha();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#c41e24] animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando Ficha Técnica...</p>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase">Ficha no encontrada</h1>
          <p className="text-slate-500">El link que has seguido parece no ser válido o la ficha ha sido eliminada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-12 px-4 md:px-8 antialiased scroll-smooth">
      <div className="max-w-[210mm] w-full flex flex-col items-center gap-12">
        
        {/* Banner Informativo */}
        <div className="w-full bg-white p-6 rounded-[24px] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm no-print">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCircle2 className="text-white w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase leading-none">Versión Digital Oficial</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Andexport Technical Hub</p>
              </div>
           </div>
           <button 
            onClick={() => window.print()}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95 uppercase tracking-widest"
           >
             <Printer className="w-4 h-4" /> Imprimir / PDF
           </button>
        </div>

        {/* --- PAGE 1 --- */}
        <div className="a4-sheet bg-white shadow-2xl flex flex-col font-sans ring-1 ring-slate-200">
          <div className="p-[50px] flex-1 flex flex-col h-full">
            <header className="flex justify-between items-start border-b-4 border-[#c41e24] pb-4 mb-8">
              <div className="flex flex-col items-start gap-2">
                <img 
                  src="https://mcusercontent.com/e74807a9562151fbd59303189/images/db4de867-1e35-4282-fd6f-842fb3cd6503.png" 
                  alt="Andexport Logo" 
                  className="h-16 w-auto object-contain"
                />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] pl-2 border-l-4 border-[#c41e24] mt-1 max-w-[500px]">
                  Maquinaria e Insumos para la Industria del Plástico y Packaging
                </span>
              </div>
              <div className="text-right flex flex-col items-end shrink-0 pl-10 h-20 justify-between pt-1">
                <span className="bg-[#c41e24] text-white px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm shadow-lg shadow-red-900/10">Ficha Técnica</span>
                <span className="text-slate-400 text-[9px] font-mono font-bold tracking-tighter">DOCID: {sheet.codigo || "PENDING"}</span>
              </div>
            </header>

            <section className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="bg-slate-800 text-white py-2 px-6 font-black text-[10px] uppercase tracking-[0.3em]">Información del Producto</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              
              <div className="flex justify-between items-start gap-12">
                <div className="flex-1 grid grid-cols-[160px_1fr] gap-y-3 text-[13px]">
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
                      <span className="font-bold text-slate-800 py-0.5 uppercase">{sheet[key]}</span>
                    </React.Fragment>
                  ))}
                </div>
                <div 
                  className="w-[200px] h-[200px] border border-slate-100 bg-white rounded-xl overflow-hidden relative shadow-sm shrink-0 flex items-center justify-center p-2 cursor-zoom-in"
                  onClick={() => setSelectedImage(sheet.productPhotos[0])}
                >
                  {sheet.productPhotos?.[0] ? (
                    <img src={sheet.productPhotos[0]} alt="Producto" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center bg-slate-50/50">
                       <ImageIcon className="w-10 h-10 text-slate-200 mb-2" />
                       <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Sin Foto</span>
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
              <div className="w-full text-[13px] text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-50 whitespace-pre-wrap">
                {sheet.descripcion_tecnica}
              </div>
            </section>

            <section className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                <h2 className="bg-slate-800 text-white py-2 px-6 font-black text-[10px] uppercase tracking-[0.3em]">Propiedades Físicas</h2>
                <div className="h-[2px] flex-1 bg-slate-100"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {sheet.caracteristicas.map((char: any, i: number) => (
                  <div key={i} className="flex flex-col p-2 border border-slate-100 rounded-lg bg-slate-50/30">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5">{char.label}</span>
                    <span className="text-[12px] font-bold text-slate-700 leading-tight">{char.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <footer className="mt-10 pt-8 border-t border-slate-100 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Aeropuerto Norte 9627. Parque de Negocios ENEA. Pudahuel. Santiago - Chile.</span>
              <span>www.andexport.com</span>
            </footer>
          </div>
        </div>

        {/* --- PAGE 2 --- */}
        <div className="a4-sheet bg-white flex flex-col font-sans" id="sheet-2">
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
                  {sheet.pagina2.tabla_comparativa.map((row: any, i: number) => (
                    <tr key={i} className="even:bg-slate-50">
                      <td className="p-2 border border-slate-200 font-bold text-slate-700 uppercase">{row.producto}</td>
                      <td className="p-2 border border-slate-200 text-slate-500 uppercase">{row.propiedad}</td>
                      <td className="p-2 border border-slate-200 font-mono text-[#c41e24] font-bold">{row.valor}</td>
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
                  {sheet.pagina2.aplicaciones_industriales.map((app: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-[12px] text-slate-600 font-medium">
                      <div className="w-1.5 h-1.5 bg-[#c41e24] rounded-full"></div>
                      {app}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                 <h3 className="text-[9px] font-black text-[#c41e24] uppercase tracking-widest mb-2">Nota de Proceso</h3>
                 <p className="text-[12px] text-slate-600 leading-relaxed italic">{sheet.pagina2.detalles_proceso}</p>
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
        <div className="a4-sheet bg-white shadow-2xl flex flex-col font-sans ring-1 ring-slate-200">
          <div className="p-[50px] flex-1 flex flex-col h-full">
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
                 {sheet.pagina3.recursos.map((res: any, i: number) => (
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
                        <div className="text-sm text-slate-700 leading-relaxed font-bold italic whitespace-pre-wrap">
                          {sheet.pagina3.observaciones}
                        </div>
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
          const photo = sheet.productPhotos?.[idx];
          if (!photo) return null;
          return (
            <div key={`photo-page-${idx}`} className="a4-sheet bg-white shadow-2xl flex flex-col font-sans ring-1 ring-slate-200" style={{ pageBreakBefore: 'always' }}>
              <div className="p-[50px] flex-1 flex flex-col h-full">
                <header className="mb-14 border-l-8 border-[#c41e24] pl-6 py-2">
                  <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Galería Complementaria</h1>
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
        {sheet.specTablePhoto && (
          <div className="a4-sheet bg-white shadow-2xl flex flex-col font-sans ring-1 ring-slate-200" style={{ pageBreakBefore: 'always' }}>
            <div className="p-[50px] flex-1 flex flex-col h-full">
              <header className="mb-14 border-l-8 border-[#c41e24] pl-6 py-2">
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tabla de Especificaciones</h1>
                <p className="text-xs font-medium text-slate-400">Modelos y características extendidas</p>
              </header>
              <div 
                className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-3xl cursor-zoom-in hover:border-[#c41e24] transition-all bg-slate-50/30"
                onClick={() => setSelectedImage(sheet.specTablePhoto)}
              >
                <img src={sheet.specTablePhoto} alt="Tabla de Especificaciones" className="max-w-full max-h-full object-contain rounded-xl" />
              </div>
              <footer className="mt-10 pt-8 border-t border-slate-100 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                <span>Aeropuerto Norte 9627. Parque de Negocios ENEA. Pudahuel. Santiago - Chile.</span>
                <span>Andexport</span>
              </footer>
            </div>
          </div>
        )}
      </div>

      {/* --- IMAGE MODAL --- */}
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
            margin: 0 !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            opacity: 1 !important;
            visibility: visible !important;
          }

          .no-print {
            display: none !important;
            visibility: hidden !important;
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
            opacity: 1 !important;
            visibility: visible !important;
          }

          .a4-sheet:first-child {
            break-before: avoid !important;
            page-break-before: avoid !important;
          }

          .a4-sheet:last-child {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          /* Chrome-specific block fix */
          @media screen and (-webkit-min-device-pixel-ratio:0) {
            .a4-sheet {
              height: 293mm !important;
              page-break-after: always !important;
            }
          }
        }
      `}</style>
    </div>
  );
}
