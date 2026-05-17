import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [wantsProposal, setWantsProposal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('La imagen supera los 5MB de límite.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Por favor describe el producto que te gustaría encontrar.');
      return;
    }

    if (wantsProposal && (!clientName.trim() || !whatsapp.trim())) {
      setErrorMsg('Por favor completa tu nombre y WhatsApp para poder contactarte.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let uploadedImageUrl = null;

      // 1. Upload image to Supabase if attached
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `peticiones/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('productos')
          .upload(fileName, imageFile);

        if (uploadError) {
          throw new Error('Error al subir la imagen de referencia: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('productos')
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      }

      // 2. Fetch session ID
      const sessionId = sessionStorage.getItem('creativity_session_id') || 'feedback_anon';

      // 3. Insert record in table
      const { error: insertError } = await supabase
        .from('peticiones_productos')
        .insert([{
          session_id: sessionId,
          comentario: comment,
          imagen_url: uploadedImageUrl,
          quieres_propuesta: wantsProposal,
          nombre: wantsProposal ? clientName : null,
          whatsapp: wantsProposal ? whatsapp : null
        }]);

      if (insertError) {
        throw insertError;
      }

      // 4. Success State
      setIsSuccess(true);
      setComment('');
      setImageFile(null);
      setImagePreview(null);
      setWantsProposal(false);
      setClientName('');
      setWhatsapp('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setErrorMsg(err.message || 'Ocurrió un error al enviar tu sugerencia. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Botón Flotante */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsSuccess(false);
          setErrorMsg('');
        }}
        className="fixed bottom-6 left-6 z-45 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-3 px-4 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-300 border border-purple-500/30 group animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <span className="text-sm group-hover:rotate-12 transition-transform">💡</span>
        <span>¿No encuentras lo que buscas?</span>
      </button>

      {/* Modal / Card desplegable */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:justify-start sm:pl-8">
          {/* Fondo oscuro traslúcido */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Caja del Formulario */}
          <div className="relative w-full max-w-md bg-white border border-gray-150 rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                  <span>💡</span> Pedido Especial / Sugerencia
                </h3>
                <p className="text-[10px] text-gray-400 font-medium mt-1">¿Qué prenda o color especial buscas hoy?</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-900 rounded-full transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido / Scroll */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar text-xs">
              {isSuccess ? (
                <div className="py-8 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl border border-emerald-100 animate-pulse">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-gray-900">¡Petición Recibida!</h4>
                    <p className="text-gray-500 mt-2 leading-relaxed px-4">
                      Revisaremos la viabilidad del corte, color o modelo solicitado con nuestros proveedores textiles y talleres. ¡Muchísimas gracias por ayudarnos a crecer!
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 px-6 rounded-xl transition-all"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Comentario */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Describe tu producto:</label>
                    <textarea
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Sudaderas, playeras, tazas, gorras, termos"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-purple-500 transition-all font-medium min-h-[90px] text-xs resize-none"
                    />
                  </div>

                  {/* Imagen adjunta */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Imagen de Referencia</label>
                    
                    {imagePreview ? (
                      <div className="relative w-28 h-28 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full py-4 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl bg-gray-50/50 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
                          <span className="text-base">📸</span>
                          <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Adjuntar foto de referencia</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interruptor de propuesta */}
                  <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-gray-800 block">¿Te gustaría recibir propuesta?</span>
                        <span className="text-[10px] text-gray-400">Si conseguimos la prenda con proveedores.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWantsProposal(!wantsProposal)}
                        className={`w-11 h-6 rounded-full p-1 transition-all ${wantsProposal ? 'bg-emerald-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-all transform ${wantsProposal ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </button>
                    </div>

                    {/* Inputs de propuesta */}
                    {wantsProposal && (
                      <div className="space-y-3 pt-3 border-t border-gray-200/80 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Tu Nombre</label>
                          <input
                            type="text"
                            required={wantsProposal}
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-850 focus:outline-none focus:border-emerald-500 transition-all font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">WhatsApp de Contacto</label>
                          <input
                            type="tel"
                            required={wantsProposal}
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="Ej. 5512345678"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-850 focus:outline-none focus:border-emerald-500 transition-all font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-100 text-red-600 font-bold p-3 rounded-xl text-center">
                      {errorMsg}
                    </div>
                  )}

                  {/* Botón Enviar */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar Petición</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
