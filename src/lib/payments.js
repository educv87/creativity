import { supabase } from './supabase';

/**
 * Crea una orden en Supabase e inicializa el pago en Mercado Pago
 */
export const processOrderAndPayment = async (orderData) => {
  try {
    // 1. Guardar la orden en Supabase (Estatus: pendiente)
    const { data: order, error: orderError } = await supabase
      .from('ordenes')
      .insert([{
        cliente_nombre: orderData.nombre,
        cliente_email: orderData.email,
        cliente_telefono: orderData.telefono,
        cliente_direccion: orderData.direccion,
        codigo_postal: orderData.cp,
        items: orderData.items,
        subtotal: orderData.subtotal,
        envio_costo: orderData.envio,
        total: orderData.total,
        status: 'pendiente'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Crear la Preferencia de Pago en Mercado Pago
    // NOTA: En un entorno real, esto se hace desde un servidor (Edge Function)
    const mpAccessToken = import.meta.env.VITE_MP_ACCESS_TOKEN;
    
    const preference = {
      items: orderData.items.map(item => ({
        title: `${item.category} - ${item.color} (${item.size})`,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: 'MXN'
      })),
      back_urls: {
        success: `${window.location.origin}/pago-exitoso?orderId=${order.id}`,
        failure: `${window.location.origin}/parar-pedido?orderId=${order.id}`,
        pending: `${window.location.origin}/pago-pendiente?orderId=${order.id}`
      },
      external_reference: order.id.toString()
    };


    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const preferenceData = await response.json();

    if (preferenceData.init_point) {
      window.location.href = preferenceData.init_point;
    } else {
      console.error('Respuesta completa de Mercado Pago:', preferenceData);
      throw new Error(`Error de MP: ${preferenceData.message || 'Sin mensaje'}`);
    }


  } catch (error) {
    console.error('Error procesando el pago:', error);
    alert('Hubo un error al procesar tu pago: ' + (error.message || JSON.stringify(error)));
    throw error;
  }
};
