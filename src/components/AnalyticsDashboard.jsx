import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [dateFilter, setDateFilter] = useState('7d'); // 'today' | '7d' | '30d' | 'all' | 'custom'
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [peticiones, setPeticiones] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  // Filtros de demanda
  const [filterCorteDemand, setFilterCorteDemand] = useState('all');
  const [filterColorDemand, setFilterColorDemand] = useState('all');
  const [filterTallaDemand, setFilterTallaDemand] = useState('all');

  const [stats, setStats] = useState({
    totalVisits: 0,
    totalSessions: 0,
    conversionRate: 0,
    funnel: { opened: 0, added: 0, quoted: 0, paid: 0 },
    trafficSources: {},
    cities: {},
    couponStats: { applied: 0, success: 0, revenue: 0, discounts: 0 },
    contentViews: { video: 0, sizes: 0, total: 0 },
    suggestions: [],
    totalUnitsAdded: 0,
    topAddedProducts: []
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        fetchAnalytics();
      }
    };

    const fetchAnalytics = async () => {
      try {
        const [eventsRes, peticionesRes, ordersRes] = await Promise.all([
          supabase.from('eventos_analitica').select('*').order('created_at', { ascending: false }),
          supabase.from('peticiones_productos').select('*').order('created_at', { ascending: false }),
          supabase.from('ordenes').select('total, status, created_at')
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (peticionesRes.error) throw peticionesRes.error;
        if (ordersRes.error) throw ordersRes.error;

        setEvents(eventsRes.data || []);
        setRawOrders(ordersRes.data || []);
        if (peticionesRes.data) {
          setPeticiones(peticionesRes.data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (events.length === 0) return;

    let start = null;
    const now = new Date();

    if (dateFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateFilter === '7d') {
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === '30d') {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'custom' && customDates.start) {
      start = new Date(customDates.start + 'T00:00:00');
    }

    let end = dateFilter === 'custom' && customDates.end ? new Date(customDates.end + 'T23:59:59') : new Date();

    const filteredEvts = events.filter(e => {
      const date = new Date(e.created_at);
      return (!start || date >= start) && date <= end;
    });

    const filteredOrds = rawOrders.filter(o => {
      const date = new Date(o.created_at);
      return (!start || date >= start) && date <= end;
    });

    setFilteredEvents(filteredEvts);
    calculateStats(filteredEvts, filteredOrds);
  }, [events, rawOrders, dateFilter, customDates, filterCorteDemand, filterColorDemand, filterTallaDemand]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const calculateStats = (data, realOrders = []) => {
    const sessions = {};
    const traffic = {};
    const cities = {};
    const content = { video: 0, sizes: 0, total: 0 };
    const funnel = { opened: 0, added: 0, quoted: 0, paid: 0 };
    const coupons = { applied: 0, success: 0, revenue: 0, discounts: 0 };

    const addedProducts = {};
    let totalUnitsAdded = 0;

    // Sumar ingresos reales únicamente de las órdenes pagadas en la base de datos
    realOrders.forEach((order) => {
      if (order.status === 'pagado') {
        coupons.revenue += Number(order.total) || 0;
      }
    });

    data.forEach((evt) => {
      const sessId = evt.session_id;
      const name = evt.event_name;
      const payload = evt.event_data || {};

      if (!sessions[sessId]) {
        sessions[sessId] = [];
      }
      sessions[sessId].push(evt);

      const referrer = payload._traffic?.referrer || 'Directo';
      traffic[referrer] = (traffic[referrer] || 0) + 1;

      const geo = payload._geo;
      if (geo && geo.ciudad && geo.ciudad !== 'Unknown') {
        const cityKey = `${geo.ciudad}, ${geo.estado || ''}`;
        cities[cityKey] = (cities[cityKey] || 0) + 1;
      } else if (payload.cp_destino) {
        const cpKey = `CP ${payload.cp_destino}`;
        cities[cpKey] = (cities[cpKey] || 0) + 1;
      }

      if (name === 'abrir_checkout') funnel.opened++;
      if (name === 'agregar_pedido') {
        funnel.added++;
        const qty = Number(payload.cantidad) || 0;
        const corte = payload.corte || 'Desconocido';
        const color = payload.color || 'Desconocido';
        const talla = payload.talla || 'S/T';

        // Apply filters
        const matchesCorte = filterCorteDemand === 'all' || corte.toLowerCase().includes(filterCorteDemand.toLowerCase());
        const matchesColor = filterColorDemand === 'all' || color.toLowerCase().trim() === filterColorDemand.toLowerCase().trim();
        const matchesTalla = filterTallaDemand === 'all' || talla.toUpperCase().trim() === filterTallaDemand.toUpperCase().trim();

        if (matchesCorte && matchesColor && matchesTalla) {
          totalUnitsAdded += qty;

          const key = `${corte} - ${color} (${talla})`;
          if (!addedProducts[key]) {
            addedProducts[key] = {
              corte,
              color,
              talla,
              units: 0
            };
          }
          addedProducts[key].units += qty;
        }
      }
      if (name === 'cotizar_envio') funnel.quoted++;
      if (name === 'iniciar_pago_click') funnel.paid++;

      if (name === 'visualizar_contenido') {
        content.total++;
        if (payload.es_video) content.video++;
        if (payload.tipo_contenido?.toLowerCase().includes('medidas') || payload.tipo_contenido?.toLowerCase().includes('talla')) {
          content.sizes++;
        }
      }

      if (name === 'aplicar_cupon') {
        coupons.applied++;
        if (payload.exitoso) {
          coupons.success++;
        }
      }

      if (name === 'iniciar_pago_click') {
        const piezas = Number(payload.piezas_totales) || 0;
        if (piezas >= 50) {
          coupons.discounts += piezas * 10;
        }
      }
    });

    const totalSessionsCount = Object.keys(sessions).length || 1;
    const totalPaidSessions = Object.values(sessions).filter(eventsList => 
      eventsList.some(e => e.event_name === 'iniciar_pago_click')
    ).length;

    const conversionRate = ((totalPaidSessions / totalSessionsCount) * 100).toFixed(1);
    const suggestions = [];

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

    if (coupons.success > 0) {
      suggestions.push({
        type: 'profit',
        title: '💎 Retorno de Cupones Altamente Redituable',
        desc: `El cupón CREATIVITY25 ha generado $${coupons.revenue.toLocaleString()} MXN en ingresos. La rebaja de volumen B2B está elevando el ticket promedio de compra. Considera crear un cupón exclusivo de temporada para clientes recurrentes.`
      });
    }

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

    const topSource = Object.entries(traffic).sort((a, b) => b[1] - a[1])[0];
    if (topSource && topSource[0] !== 'Directo') {
      suggestions.push({
        type: 'growth',
        title: `🚀 Tráfico Ganador desde ${topSource[0]}`,
        desc: `${topSource[0]} es tu canal de mayor adquisición con ${topSource[1]} eventos registrados. Te sugerimos enfocar un 15% más de tu presupuesto publicitario a campañas que apunten directo al checkout de Caballero en esta red.`
      });
    }

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
      suggestions,
      totalUnitsAdded,
      topAddedProducts: Object.values(addedProducts).sort((a, b) => b.units - a.units)
    });
  };

  const getDailyTraffic = () => {
    const daily = {};
    // Los eventos en filteredEvents están ordenados de más reciente a más antiguo
    // Recorremos en reversa para procesar cronológicamente y conservar el orden
    [...filteredEvents].reverse().forEach(e => {
      if (e.event_name === 'visita_landing' || e.event_name === 'abrir_checkout') {
        const d = new Date(e.created_at);
        const key = d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
        daily[key] = (daily[key] || 0) + 1;
      }
    });

    const entries = Object.entries(daily);
    if (entries.length === 0) {
      const todayKey = new Date().toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
      return [{ date: todayKey, count: 0 }];
    }

    return entries.map(([date, count]) => ({ date, count })).slice(-10);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-purple-600 border-t-transparent animate-spin mb-4"></div>
        <p className="font-bold text-gray-500 animate-pulse">Cargando Centro de Control B2B...</p>
      </div>
    );
  }

  const dailyData = getDailyTraffic();
  const maxCount = Math.max(...dailyData.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      {/* Header Premium Clean */}
      <nav className="w-full bg-white border-b border-gray-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-ping"></div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            CREATIVITY <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 rounded-md uppercase font-bold tracking-widest">Command Center</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin')} 
            className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl border border-gray-200 transition-all"
          >
            📋 Panel de Control
          </button>
          <button 
            onClick={() => navigate('/crear-pedido')} 
            className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl border border-gray-200 transition-all"
          >
            👕 Ir a Tienda
          </button>
          <button 
            onClick={handleLogout} 
            className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl border border-red-200 transition-all"
          >
            🔒 Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 gap-8">
        
        {/* Barra de Filtros de Fecha */}
        <div className="bg-white border border-gray-200 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rango de Visualización</span>
            <h2 className="text-xl font-black text-gray-900">Filtrar Analíticas</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filtros Rápidos */}
            <div className="flex p-1 bg-gray-105 bg-gray-100 rounded-xl border border-gray-200/50">
              {[
                { id: 'today', name: 'Hoy' },
                { id: '7d', name: '7 Días' },
                { id: '30d', name: '30 Días' },
                { id: 'all', name: 'Todo' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDateFilter(opt.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === opt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-550 text-gray-500 hover:text-gray-900'}`}
                >
                  {opt.name}
                </button>
              ))}
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateFilter === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-550 text-gray-500 hover:text-gray-900'}`}
              >
                Personalizado
              </button>
            </div>

            {/* Selector Personalizado */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 animate-fade-in-up">
                <input
                  type="date"
                  value={customDates.start}
                  onChange={e => setCustomDates({ ...customDates, start: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-purple-500 text-gray-900 cursor-pointer"
                />
                <span className="text-xs text-gray-400 font-bold">a</span>
                <input
                  type="date"
                  value={customDates.end}
                  onChange={e => setCustomDates({ ...customDates, end: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-purple-500 text-gray-900 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Fila 1: KPIs Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 p-6 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Visitas Totales</p>
            <h3 className="text-3xl font-black text-gray-900">{stats.totalVisits}</h3>
            <span className="text-xs text-purple-600 font-medium block mt-2">📊 Interacciones registradas</span>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-50/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sesiones Únicas</p>
            <h3 className="text-3xl font-black text-gray-900">{stats.totalSessions}</h3>
            <span className="text-xs text-blue-600 font-medium block mt-2">👥 Comportamientos agrupados</span>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tasa de Conversión</p>
            <h3 className="text-3xl font-black text-emerald-600">{stats.conversionRate}%</h3>
            <span className="text-xs text-emerald-600/70 font-medium block mt-2">⚡ Éxito de embudo de venta</span>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ingresos Registrados</p>
            <h3 className="text-3xl font-black text-pink-600">${stats.couponStats.revenue.toLocaleString()}<span className="text-sm text-gray-400"> MXN</span></h3>
            <span className="text-xs text-pink-600/70 font-medium block mt-2">💰 Ticket promedio alto</span>
          </div>
        </div>

        {/* Gráfico de Visitas Diarias */}
        <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-[2rem] shadow-sm">
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Tráfico Reciente</span>
            <h2 className="text-xl font-black text-gray-900">Tendencia de Visitas Diarias</h2>
            <p className="text-xs text-gray-400">Total de visitas únicas y aperturas de checkout registradas por día (últimos 10 días activos).</p>
          </div>

          <div className="flex items-end justify-between gap-3 md:gap-6 h-56 pt-4 border-b border-gray-100 px-2 md:px-6">
            {dailyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar h-full justify-end">
                {/* Popover de cantidad */}
                <div className="bg-gray-900 text-white font-mono text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity duration-300 pointer-events-none mb-1 text-center w-max">
                  {d.count === 1 ? '1 visita' : `${d.count} visitas`}
                </div>
                {/* Barra de gráfico */}
                <div 
                  className="w-full bg-purple-100 hover:bg-purple-600 rounded-t-xl transition-all duration-500 cursor-pointer shadow-sm hover:shadow-md"
                  style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: '8px' }}
                ></div>
                {/* Etiqueta del día */}
                <div className="text-[10px] font-bold text-gray-400 truncate w-full text-center mt-1 pb-2">
                  {d.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fila 2: Embudo y Sugerencias de Crecimiento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Embudo de Conversión (8 Columnas) */}
          <div className="lg:col-span-8 bg-white border border-gray-250/80 p-6 md:p-8 rounded-[2rem] shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
              <span>📉</span> Embudo de Conversión Comercial
            </h2>
            <p className="text-xs text-gray-400 mb-8">Monitoreo de caída de usuarios paso a paso en el proceso de checkout.</p>

            <div className="space-y-6">
              {[
                { label: '1. Entraron al checkout (Visitas)', count: stats.funnel.opened || stats.totalSessions, color: 'bg-purple-655 bg-gradient-to-r from-purple-500 to-purple-600', pct: 100 },
                { label: '2. Agregaron playeras al pedido', count: `${stats.funnel.added} (${stats.totalUnitsAdded || 0} pzs)`, color: 'bg-gradient-to-r from-indigo-500 to-indigo-600', pct: stats.funnel.opened ? Math.round((stats.funnel.added / (stats.funnel.opened || 1)) * 100) : 0 },
                { label: '3. Cotizaron envío (Skydropx)', count: stats.funnel.quoted, color: 'bg-gradient-to-r from-blue-500 to-blue-600', pct: stats.funnel.added ? Math.round((stats.funnel.quoted / (stats.funnel.added || 1)) * 100) : 0 },
                { label: '4. Clic en Pagar (MercadoPago)', count: stats.funnel.paid, color: 'bg-gradient-to-r from-emerald-500 to-emerald-600', pct: stats.funnel.quoted ? Math.round((stats.funnel.paid / (stats.funnel.quoted || 1)) * 100) : 0 }
              ].map((step, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>{step.label}</span>
                    <span className="text-gray-400">{step.count} ({step.pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
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
          <div className="lg:col-span-4 bg-white border border-gray-250/80 p-6 rounded-[2rem] shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
              <span>💡</span> Sugerencias de Crecimiento
            </h2>
            <p className="text-xs text-gray-400 mb-6">Recomendaciones automatizadas basadas en los datos analizados.</p>

            <div className="space-y-4">
              {stats.suggestions.map((sug, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    sug.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    sug.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    sug.type === 'profit' ? 'bg-pink-50 border-pink-200 text-pink-900' :
                    sug.type === 'growth' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' :
                    'bg-gray-50 border-gray-200 text-gray-900'
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
          <div className="bg-white border border-gray-250/80 p-6 rounded-[2rem] shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
              <span>🎯</span> Adquisición por Red Social
            </h3>
            <p className="text-xs text-gray-400 mb-6">Orígenes de dónde provienen las visitas a tu checkout.</p>

            <div className="space-y-4">
              {Object.keys(stats.trafficSources).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay suficientes datos de origen aún.</p>
              ) : (
                Object.entries(stats.trafficSources).map(([source, count]) => {
                  const maxVal = Math.max(...Object.values(stats.trafficSources));
                  const pct = maxVal ? Math.round((count / maxVal) * 100) : 0;
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{source}</span>
                        <span className="text-gray-400">{count} visitas</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ciudades de México */}
          <div className="bg-white border border-gray-250/80 p-6 rounded-[2rem] shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
              <span>📍</span> Ciudades Destacadas
            </h3>
            <p className="text-xs text-gray-400 mb-6">Hotspots geográficos de tus clientes interesados.</p>

            <div className="space-y-4">
              {Object.keys(stats.cities).length === 0 ? (
                <p className="text-xs text-gray-400 italic">Esperando primeras geolocalizaciones...</p>
              ) : (
                Object.entries(stats.cities).slice(0, 5).map(([city, count]) => {
                  const maxVal = Math.max(...Object.values(stats.cities));
                  const pct = maxVal ? Math.round((count / maxVal) * 100) : 0;
                  return (
                    <div key={city} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{city}</span>
                        <span className="text-purple-600 font-bold">{count} interesados</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cupones & Motivación Visual */}
          <div className="bg-white border border-gray-250/80 p-6 rounded-[2rem] shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
              <span>🎟️</span> Rendimiento de Cupones B2B
            </h3>
            <p className="text-xs text-gray-400 mb-6">Métricas de conversión asociadas a promociones.</p>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Cupones Aplicados</span>
                  <span className="text-2xl font-black text-purple-600">{stats.couponStats.applied}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Cupones Exitosos</span>
                  <span className="text-2xl font-black text-emerald-600">{stats.couponStats.success}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-150 space-y-3 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Descuentos B2B otorgados:</span>
                  <span className="font-bold text-gray-900">${stats.couponStats.discounts.toLocaleString()} MXN</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Ingresos Netos con Cupón:</span>
                  <span className="font-bold text-emerald-600">${stats.couponStats.revenue.toLocaleString()} MXN</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Fila 3.5: Demanda de Productos (Playeras Añadidas) */}
        <div className="bg-white border border-gray-250/80 p-6 md:p-8 rounded-[2rem] shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 pb-6 border-b border-gray-100">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-purple-650 uppercase tracking-widest">Interés y Demanda</span>
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span>👕</span> Volumen de Playeras Añadidas al Pedido
              </h3>
              <p className="text-xs text-gray-400">
                Monitoreo en tiempo real de qué prendas están agregando tus clientes al carrito, con un total de <strong className="text-purple-700">{stats.totalUnitsAdded || 0} piezas</strong> filtradas.
              </p>
            </div>
            
            {/* Controles de Filtros de Producto */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Género / Corte</label>
                <select
                  value={filterCorteDemand}
                  onChange={e => setFilterCorteDemand(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-purple-500 text-gray-700 cursor-pointer"
                >
                  <option value="all">Todos los géneros</option>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer / Dama</option>
                  <option value="infantil">Infantil</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Color</label>
                <select
                  value={filterColorDemand}
                  onChange={e => setFilterColorDemand(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-purple-500 text-gray-700 cursor-pointer"
                >
                  <option value="all">Todos los colores</option>
                  <option value="blanco">Blanco</option>
                  <option value="negro">Negro</option>
                  <option value="lila">Lila</option>
                  <option value="menta">Menta</option>
                  <option value="rosa baby">Rosa Baby</option>
                  <option value="azul cielo">Azul Cielo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Talla</label>
                <select
                  value={filterTallaDemand}
                  onChange={e => setFilterTallaDemand(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-purple-500 text-gray-700 cursor-pointer"
                >
                  <option value="all">Todas las tallas</option>
                  <option value="XS">XS</option>
                  <option value="CH">CH</option>
                  <option value="M">M</option>
                  <option value="G">G</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.topAddedProducts && stats.topAddedProducts.slice(0, 10).map((item, idx) => {
              const pct = stats.totalUnitsAdded ? Math.round((item.units / stats.totalUnitsAdded) * 100) : 0;
              
              const getColorHex = (colorName) => {
                const name = String(colorName).toLowerCase().trim();
                if (name.includes('negro')) return '#121316';
                if (name.includes('blanco')) return '#ffffff';
                if (name.includes('lila')) return '#d0bfff';
                if (name.includes('menta')) return '#a7f3d0';
                if (name.includes('rosa')) return '#fbcfe8';
                if (name.includes('azul')) return '#bae6fd';
                return '#e5e7eb'; // fallback gray
              };

              return (
                <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-150 flex items-center justify-between shadow-sm group hover:border-purple-300 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    {/* Rank Number */}
                    <span className="text-xl font-black text-gray-300 font-mono w-6 text-center select-none">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="w-8 h-8 rounded-full border border-gray-200 shadow-inner flex-shrink-0" style={{ backgroundColor: getColorHex(item.color) }}></div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{item.corte}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {item.color} • Talla {item.talla}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-purple-650">{item.units} pzs</div>
                    <div className="text-[9px] font-bold text-gray-400">{pct}% de demanda</div>
                  </div>
                </div>
              );
            })}
            {(!stats.topAddedProducts || stats.topAddedProducts.length === 0) && (
              <div className="col-span-full py-16 text-center text-gray-400 italic text-xs">
                No hay datos de playeras añadidas con la combinación de filtros seleccionada.
              </div>
            )}
          </div>
        </div>

        {/* Fila 4: Peticiones Especiales de Clientes */}
        <div className="bg-white border border-gray-250/80 p-6 md:p-8 rounded-[2rem] shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
            <span>📥</span> Peticiones Especiales (B2B Lead Collector)
          </h3>
          <p className="text-xs text-gray-400 mb-8">
            Prendas, cortes o colores especiales solicitados por clientes potenciales. Revisa con tus proveedores y arma una propuesta a su medida.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-450 pb-4">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Cliente (Contacto)</th>
                  <th className="px-6 py-4">Prenda / Comentario Solicitado</th>
                  <th className="px-6 py-4 text-center">Foto de Referencia</th>
                  <th className="px-6 py-4 text-center">Tipo de Petición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {peticiones.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {new Date(p.created_at).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {p.quieres_propuesta ? (
                        <div className="space-y-1">
                          <div className="font-bold text-gray-800">{p.nombre}</div>
                          <div className="font-mono text-purple-650 font-bold bg-purple-50 px-2 py-0.5 rounded w-fit border border-purple-100">
                            🟢 {p.whatsapp}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Solo sugerencia (Anónimo)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium max-w-sm whitespace-pre-wrap leading-relaxed">
                      {p.comentario}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.imagen_url ? (
                        <div className="flex justify-center">
                          <img
                            src={p.imagen_url}
                            alt="Referencia"
                            onClick={() => setSelectedImage(p.imagen_url)}
                            className="w-12 h-12 object-cover rounded-xl border border-gray-200 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-md"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-300 font-medium">Sin foto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        p.quieres_propuesta 
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                          : 'bg-gray-100 border border-gray-200 text-gray-500'
                      }`}>
                        {p.quieres_propuesta ? 'Solicita Propuesta' : 'Sugerencia de Catálogo'}
                      </span>
                    </td>
                  </tr>
                ))}

                {peticiones.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-3xl">📥</span>
                        <div>
                          <p className="text-gray-900 font-black text-sm">Sin peticiones aún</p>
                          <p className="text-gray-400 text-xs mt-1">
                            Las prendas o colores especiales que tus clientes no encuentren se recopilarán en esta sección.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Lightbox / Visor de Imagen Flotante */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-sm" 
            onClick={() => setSelectedImage(null)}
          ></div>
          <div className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center animate-fade-in-up">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={selectedImage} 
              alt="Ampliada" 
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <span className="text-white/60 font-bold text-xs mt-4 uppercase tracking-widest">Foto de Referencia del Cliente</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
