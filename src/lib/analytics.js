import { supabase } from './supabase';

// Generar o recuperar ID de sesión único y persistente para esta pestaña/sesión
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('creativity_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('creativity_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Registra un evento de interacción del usuario en la tabla 'eventos_analitica' de Supabase
 * @param {string} eventName Nombre del evento (ej: 'seleccionar_talla', 'agregar_carrito', 'cotizar_envio', etc.)
 * @param {object} eventData Datos o metadatos adicionales del evento (ej: { talla: 'M', cantidad: 5 })
 */
export const trackEvent = async (eventName, eventData = {}) => {
  try {
    const sessionId = getSessionId();
    const userAgent = navigator.userAgent;
    const urlPath = window.location.pathname;

    const { error } = await supabase
      .from('eventos_analitica')
      .insert([{
        session_id: sessionId,
        event_name: eventName,
        event_data: eventData,
        user_agent: userAgent,
        url_path: urlPath
      }]);

    if (error) {
      console.warn('Analytics logging error:', error);
    }
  } catch (err) {
    console.error('Failed to log analytics event:', err);
  }
};
