import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalSessions: 0,
    conversionRate: 0,
    funnel: { opened: 0, added: 0, quoted: 0, paid: 0 },
    trafficSources: {},
    cities: {},
    couponStats: { applied: 0, success: 0, revenue: 0, discounts: 0 },
    contentViews: { video: 0, sizes: 0, total: 0 },
    suggestions: []
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data, error } = await supabase
          .from('eventos_analitica')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          setEvents(data);
          calculateStats(data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const calculateStats = (data) => {
    // 1. Agrupar por sesión
    const sessions = {};
    const traffic = {};
    const cities = {};
    const content = { video: 0, sizes: 0, total: 0 };
    const funnel = { opened: 0, added: 0, quoted: 0, paid: 0 };
    const coupons = { applied: 0, success: 0, revenue: 0, discounts: 0 };

    data.forEach((evt) => {
      const sessId = evt.session_id;
      const name = evt.event_name;
      const payload = evt.event_data || {};

      if (!sessions[sessId]) {
        sessions[sessId] = [];
      }
      sessions[sessId].push(evt);

      // Origen de tráfico (desde el primer evento de la sesión o enriquecidos)
      const referrer = payload._traffic?.referrer || 'Directo';
      traffic[referrer] = (traffic[referrer] || 0) + 1;

      // Geolocalización
      const geo = payload._geo;
      if (geo && geo.ciudad && geo.ciudad !== 'Unknown') {
        const cityKey = `${geo.ciudad}, ${geo.estado || ''}`;
        cities[cityKey] = (cities[cityKey] || 0) + 1;
      } else if (payload.cp_destino) {
        const cpKey = `CP ${payload.cp_destino}`;
        cities[cpKey] = (cities[cpKey] || 0) + 1;
      }

      // Conteo de Funnel
      if (name === 'abrir_checkout') funnel.opened++;
      if (name === 'agregar_pedido') funnel.added++;
      if (name === 'cotizar_envio') funnel.quoted++;
      if (name === 'iniciar_pago_click') funnel.paid++;

      // Conteo de contenido visual
      if (name === 'visualizar_contenido') {
        content.total++;
        if (payload.es_video) content.video++;
        if (payload.tipo_contenido?.toLowerCase().includes('medidas') || payload.tipo_contenido?.toLowerCase().includes('talla')) {
          content.sizes++;
        }
      }

      // Estadísticas de Cupones
      if (name === 'aplicar_cupon') {
        coupons.applied++;
        if (payload.exitoso) {
          coupons.success++;
        }
      }

      // Ingresos aproximados de órdenes exitosas
      if (name === 'iniciar_pago_click') {
        const totalPago = Number(payload.total_pago) || 0;
        coupons.revenue += totalPago;
        // Calcular descuentos aplicados (si totalPieces >= 50, se ahorraron $10 por prenda)
        const piezas = Number(payload.piezas_totales) || 0;
        if (piezas >= 50) {
          coupons.discounts += piezas * 10; // $10 pesos de descuento por prenda en B2B
        }
      }
    });

    // Calcular tasa de conversión (sesiones que pagaron / sesiones totales)
    const totalSessionsCount = Object.keys(sessions).length || 1;
    const totalPaidSessions = Object.values(sessions).filter(eventsList => 
      eventsList.some(e => e.event_name === 'iniciar_pago_click')
    ).length;

    const conversionRate = ((totalPaidSessions / totalSessionsCount) * 100).toFixed(1);

    // Generar Sugerencias / AI-Insights accionables basados en lógica real de negocio
    const suggestions = [];

    // Regla 1: Visualizaciones del Video Real
    const paidSessionsWithVideo = Object.values(sessions).filter(eventsList => 
      eventsList.some(e => e.event_name === 'iniciar_pago_click') &&
      eventsList.some(e => e.event_name === 'visualizar_contenido' && e.event_data?.es_video)
    ).length;

    if (totalPaidSessions > 0) {
      const pct = Math.round((paidSessionsWithVideo / totalPaidSessions) * 100);
      if (pct > 40) {
        suggestions.push({
          type: 'success',
          title: '🔥 Video Real es tu mayor gancho de ventas',
          desc: `El ${pct}% de los compradores ve el Video Real antes de pagar. Te sugerimos añadir un segundo video detallando las costuras e incentivar su reproducción destacando el botón con un marco animado.`
        });
      } else {
        suggestions.push({
          type: 'info',
          title: '🎥 Oportunidad: Fomentar el uso de Video Real',
          desc: 'Menos del 30% de los compradores reproduce el Video Real. Coloca un botón flotante que recuerde que pueden ver la playera en video para incrementar la confianza y reducir carritos vacíos.'
        });
      }
    }

    // Regla 2: Cupones y Rentabilidad B2B
    if (coupons.success > 0) {
      suggestions.push({
        type: 'profit',
        title: '💎 Retorno de Cupones Altamente Redituable',
        desc: `El cupón CREATIVITY25 ha generado $${coupons.revenue.toLocaleString()} MXN en ingresos. La rebaja de volumen B2B está elevando el ticket promedio de compra. Considera crear un cupón exclusivo de temporada para clientes recurrentes.`
      });
    }

    // Regla 3: Caídas del Embudo (Shipping Step)
    const quoteDropoffs = funnel.added - funnel.quoted;
    if (quoteDropoffs > 0 && funnel.added > 0) {
      const dropoffPct = Math.round((quoteDropoffs / funnel.added) * 100);
      if (dropoffPct > 35) {
        suggestions.push({
          type: 'warning',
          title: '⚠️ Fuga Crítica en Cotización de Envío',
          desc: `El ${dropoffPct}% de los clientes añade playeras pero no cotiza envío. Esto ocurre si los campos de dirección o selección de colonia no quedan claros. Sugerimos pre-cargar un ejemplo visual de dirección completa.`
        });
      }
    }

    // Regla 4: Origen del Tráfico
    const topSource = Object.entries(traffic).sort((a, b) => b[1] - a[1])[0];
    if (topSource && topSource[0] !== 'Directo') {
      suggestions.push({
        type: 'growth',
        title: `🚀 Tráfico Ganador desde ${topSource[0]}`,
        desc: `${topSource[0]} es tu canal de mayor adquisición con ${topSource[1]} eventos registrados. Te sugerimos enfocar un 15% más de tu presupuesto publicitario a campañas que apunten directo al checkout de Caballero en esta red.`
      });
    }

    // Sugerencia genérica si no hay suficientes datos
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'info',
        title: '🌱 Recomendación inicial de crecimiento',
        desc: 'El flujo de compra actual es muy limpio. Mantén activa la promoción de envío gratis en más de 50 prendas, ya que representa el incentivo psicológico número uno para pedidos industriales.'
      });
    }

    setStats({
      totalVisits: data.length,
      totalSessions: totalSessionsCount,
      conversionRate,
      funnel,
      trafficSources: traffic,
      cities,
      couponStats: coupons,
      contentViews: content,
      suggestions
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4"></div>
        <p className="font-bold text-gray-400 animate-pulse">Cargando Centro de Control B2B...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-12">
      {/* Header Premium */}
      <nav className="w-full bg-gray-900/60 backdrop-blur-xl border-b border-gray-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-ping"></div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            CREATIVITY <span className="text-xs bg-purple-950 text-purple-400 border border-purple-800/50 px-2 py-0.5 rounded-md uppercase font-bold tracking-widest">Command Center</span>
          </h1>
        </div>
        <button 
          onClick={() => navigate('/crear-pedido')} 
          className="text-xs font-bold text-gray-400 bg-gray-850 hover:bg-gray-800 px-4 py-2 rounded-xl border border-gray-700/50 transition-all flex items-center gap-2"
        >
          <span>👕 Ir al Configurador</span>
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 gap-8">
        
        {/* Fila 1: KPIs Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-850 p-6 rounded-3xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-500">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Visitas Totales</p>
            <h3 className="text-3xl font-black text-white">{stats.totalVisits}</h3>
            <span className="text-xs text-purple-400 font-medium block mt-2">📊 Interacciones registradas</span>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-850 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-50/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sesiones Únicas</p>
            <h3 className="text-3xl font-black text-white">{stats.totalSessions}</h3>
            <span className="text-xs text-blue-400 font-medium block mt-2">👥 Comportamientos agrupados</span>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-850 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tasa de Conversión</p>
            <h3 className="text-3xl font-black text-emerald-400">{stats.conversionRate}%</h3>
            <span className="text-xs text-emerald-500/70 font-medium block mt-2">⚡ Éxito de embudo de venta</span>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-850 p-6 rounded-3xl relative overflow-hidden group hover:border-pink-500/30 transition-all duration-500">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ingresos Registrados (Intenciones)</p>
            <h3 className="text-3xl font-black text-pink-400">${stats.couponStats.revenue.toLocaleString()}<span className="text-sm text-gray-500"> MXN</span></h3>
            <span className="text-xs text-pink-500/70 font-medium block mt-2">💰 Ticket promedio alto</span>
          </div>
        </div>

        {/* Fila 2: Embudo y Sugerencias de Crecimiento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Embudo de Conversión (8 Columnas) */}
          <div className="lg:col-span-8 bg-gray-900/20 border border-gray-850 p-6 md:p-8 rounded-[2rem] backdrop-blur-md">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <span>📉</span> Embudo de Conversión Comercial
            </h2>
            <p className="text-xs text-gray-500 mb-8">Monitoreo de caída de usuarios paso a paso en el proceso de checkout.</p>

            <div className="space-y-6">
              {[
                { label: '1. Entraron al checkout (Visitas)', count: stats.funnel.opened || stats.totalSessions, color: 'bg-purple-500', pct: 100 },
                { label: '2. Agregaron playeras al pedido', count: stats.funnel.added, color: 'bg-indigo-500', pct: stats.funnel.opened ? Math.round((stats.funnel.added / (stats.funnel.opened || 1)) * 100) : 0 },
                { label: '3. Cotizaron envío (Skydropx)', count: stats.funnel.quoted, color: 'bg-blue-500', pct: stats.funnel.added ? Math.round((stats.funnel.quoted / (stats.funnel.added || 1)) * 100) : 0 },
                { label: '4. Clic en Pagar (MercadoPago)', count: stats.funnel.paid, color: 'bg-emerald-500', pct: stats.funnel.quoted ? Math.round((stats.funnel.paid / (stats.funnel.quoted || 1)) * 100) : 0 }
              ].map((step, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-300">
                    <span>{step.label}</span>
                    <span className="text-gray-400">{step.count} ({step.pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${step.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${Math.min(100, Math.max(2, step.pct))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sugerencias de Crecimiento Inteligente (4 Columnas) */}
          <div className="lg:col-span-4 bg-gray-900/20 border border-gray-850 p-6 rounded-[2rem] backdrop-blur-md">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <span>💡</span> Sugerencias de Crecimiento
            </h2>
            <p className="text-xs text-gray-500 mb-6">Recomendaciones automatizadas basadas en los datos analizados.</p>

            <div className="space-y-4">
              {stats.suggestions.map((sug, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    sug.type === 'success' ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-300' :
                    sug.type === 'warning' ? 'bg-amber-950/20 border-amber-900/60 text-amber-300' :
                    sug.type === 'profit' ? 'bg-pink-950/20 border-pink-900/60 text-pink-300' :
                    sug.type === 'growth' ? 'bg-indigo-950/20 border-indigo-900/60 text-indigo-300' :
                    'bg-gray-850/50 border-gray-800 text-gray-300'
                  }`}
                >
                  <h4 className="font-black text-sm mb-2">{sug.title}</h4>
                  <p className="opacity-90">{sug.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fila 3: Orígenes de Tráfico, Ciudades y Cupones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Tráfico (Redes Sociales) */}
          <div className="bg-gray-900/20 border border-gray-850 p-6 rounded-[2rem] backdrop-blur-md">
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <span>🎯</span> Adquisición por Red Social
            </h3>
            <p className="text-xs text-gray-500 mb-6">Orígenes de dónde provienen las visitas a tu checkout.</p>

            <div className="space-y-4">
              {Object.keys(stats.trafficSources).length === 0 ? (
                <p className="text-xs text-gray-500 italic">No hay suficientes datos de origen aún.</p>
              ) : (
                Object.entries(stats.trafficSources).map(([source, count]) => {
                  const maxVal = Math.max(...Object.values(stats.trafficSources));
                  const pct = maxVal ? Math.round((count / maxVal) * 100) : 0;
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{source}</span>
                        <span className="text-gray-400">{count} visitas</span>
                      </div>
                      <div className="w-full h-2 bg-gray-850 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ciudades de México */}
          <div className="bg-gray-900/20 border border-gray-850 p-6 rounded-[2rem] backdrop-blur-md">
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <span>📍</span> Ciudades Destacadas
            </h3>
            <p className="text-xs text-gray-500 mb-6">Hotspots geográficos de tus clientes interesados.</p>

            <div className="space-y-4">
              {Object.keys(stats.cities).length === 0 ? (
                <p className="text-xs text-gray-500 italic">Esperando primeras geolocalizaciones...</p>
              ) : (
                Object.entries(stats.cities).slice(0, 5).map(([city, count]) => {
                  const maxVal = Math.max(...Object.values(stats.cities));
                  const pct = maxVal ? Math.round((count / maxVal) * 100) : 0;
                  return (
                    <div key={city} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{city}</span>
                        <span className="text-purple-400">{count} interesados</span>
                      </div>
                      <div className="w-full h-2 bg-gray-850 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cupones & Motivación Visual */}
          <div className="bg-gray-900/20 border border-gray-850 p-6 rounded-[2rem] backdrop-blur-md">
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <span>🎟️</span> Rendimiento de Cupones B2B
            </h3>
            <p className="text-xs text-gray-500 mb-6">Métricas de conversión asociadas a promociones.</p>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950/40 p-4 rounded-2xl border border-gray-850">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Cupones Aplicados</span>
                  <span className="text-2xl font-black text-purple-400">{stats.couponStats.applied}</span>
                </div>
                <div className="bg-gray-950/40 p-4 rounded-2xl border border-gray-850">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Cupones Exitosos</span>
                  <span className="text-2xl font-black text-emerald-400">{stats.couponStats.success}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 space-y-3 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Descuentos B2B otorgados:</span>
                  <span className="font-bold text-white">${stats.couponStats.discounts.toLocaleString()} MXN</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Ingresos Netos con Cupón:</span>
                  <span className="font-bold text-emerald-400">${stats.couponStats.revenue.toLocaleString()} MXN</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;
