import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (orderId) {
      // Actualizar estatus de la orden a 'pagado' y crear envío en Skydropx
      const finalizeOrder = async () => {
        try {
          // 1. Marcar como pagado
          await supabase
            .from('ordenes')
            .update({ status: 'pagado' })
            .eq('id', orderId);
          
          // 2. Crear guía preautorizada en Skydropx
          const { createShipment } = await import('../lib/shipping');
          await createShipment(orderId);
          
          // 3. Registrar evento de conversión exitosa
          trackEvent('pago_exitoso', { orderId });
          
        } catch (error) {
          console.error("Error finalizando orden:", error);
        }
      };
      finalizeOrder();
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl border border-gray-100">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8 animate-bounce">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">¡Pago Exitoso!</h1>
        <p className="text-gray-500 font-medium mb-10 leading-relaxed">
          Tu pedido ha sido procesado correctamente. Te enviaremos un correo con los detalles de tu envío muy pronto.
        </p>
        <div className="bg-gray-50 rounded-2xl p-6 mb-10 text-left border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Referencia de Pedido</p>
          <p className="font-mono text-xs text-gray-900 break-all">{orderId}</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all"
        >
          Volver a la tienda
        </button>
      </div>
    </div>
  );
};

export default SuccessPage;
