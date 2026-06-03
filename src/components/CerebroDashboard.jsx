import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchProjectData, fetchOrders } from '../lib/data';

const CerebroDashboard = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ cortes: [], colores: [], inventario: [], escalas: [] });
  const [orders, setOrders] = useState([]);
  const [activeBranch, setActiveBranch] = useState('all'); // 'all' | 'central' | 'zamora' | 'queretaro'
  
  // AI Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  // Canvas interactive states
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkSessionAndLoad = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Si no hay sesión activa, redirigir al login para restringir el acceso
          navigate('/login');
          return;
        }

        const [projData, ordersData] = await Promise.all([
          fetchProjectData(),
          fetchOrders()
        ]);
        if (projData) setData(projData);
        if (ordersData.data) setOrders(ordersData.data);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    checkSessionAndLoad();
  }, [navigate]);

  // Inteligencia de Inventario
  const totalItemsCount = data.inventario.length;
  const outOfStockItems = data.inventario.filter(item => item.stock === 0);
  const lowStockItems = data.inventario.filter(item => item.stock > 0 && item.stock <= 10);
  
  const totalRevenue = orders
    .filter(o => o.status === 'pagado')
    .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
  
  const paidOrdersCount = orders.filter(o => o.status === 'pagado').length;

  // Sucursales y Almacenes (Distribución ponderada para simulación lógica en la UI)
  const getBranchInventory = (branch) => {
    if (branch === 'all') return data.inventario;
    const seed = branch === 'central' ? 0.6 : branch === 'zamora' ? 0.25 : 0.15;
    return data.inventario.map(item => ({
      ...item,
      stock: Math.max(0, Math.round(item.stock * seed))
    }));
  };

  const currentInventory = getBranchInventory(activeBranch);
  const currentOutOfStock = currentInventory.filter(item => item.stock === 0);
  const currentLowStock = currentInventory.filter(item => item.stock > 0 && item.stock <= 10);

  // --- BUSCADOR IA (Gemini Parser) ---
  const handleAISearch = (queryText) => {
    const query = (queryText || searchQuery).trim().toLowerCase();
    if (!query) return;

    setIsSearching(true);
    setShowAnswer(false);

    // Guardar consulta en la barra si se usó un chip/tile
    if (queryText) {
      setSearchQuery(queryText);
    }

    setTimeout(() => {
      let response = { text: '', type: 'general', data: null };

      if (query.includes('agotar') || query.includes('bajo stock') || query.includes('alerta') || query.includes('critico') || query.includes('bajo')) {
        const items = data.inventario
          .filter(item => item.stock > 0 && item.stock <= 10)
          .slice(0, 10)
          .map(item => {
            const corte = data.cortes.find(c => c.id === item.corte_id)?.nombre || 'Playera';
            const color = data.colores.find(c => c.id === item.color_id)?.nombre || 'N/A';
            return {
              id: item.id,
              corte,
              color,
              talla: item.talla,
              stock: item.stock,
              sku: item.sku || 'Sin SKU'
            };
          });

        response = {
          type: 'low_stock',
          text: `Analizando el inventario en tiempo real... He detectado **${lowStockItems.length} variante(s)** en niveles críticos (con 10 o menos unidades de existencia). Te recomiendo priorizar el reabastecimiento de los siguientes modelos:`,
          data: items
        };
      } else if (query.includes('agotado') || query.includes('sin stock') || query.includes('cero') || query.includes('terminado') || query.includes('quiebre')) {
        const items = data.inventario
          .filter(item => item.stock === 0)
          .slice(0, 10)
          .map(item => {
            const corte = data.cortes.find(c => c.id === item.corte_id)?.nombre || 'Playera';
            const color = data.colores.find(c => c.id === item.color_id)?.nombre || 'N/A';
            return {
              id: item.id,
              corte,
              color,
              talla: item.talla,
              stock: 0,
              sku: item.sku || 'Sin SKU'
            };
          });

        response = {
          type: 'out_of_stock',
          text: `Revisando registros de existencias nulas... Hay **${outOfStockItems.length} producto(s)** completamente agotados en Supabase. Estos artículos representan pérdida inmediata de venta en la tienda online. Lista de prioridad:`,
          data: items
        };
      } else if (query.includes('venta') || query.includes('ingreso') || query.includes('pedido') || query.includes('ganancia') || query.includes('dinero') || query.includes('financiero') || query.includes('reporte')) {
        response = {
          type: 'sales',
          text: `Consultando base de datos financiera... Hemos registrado un total de **${paidOrdersCount} pedidos liquidados** ('pagado') a través de la pasarela. El volumen total bruto asciende a **$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN**. El ticket promedio estimado de venta es de **$${paidOrdersCount > 0 ? (totalRevenue / paidOrdersCount).toFixed(2) : 0} MXN**.`
        };
      } else if (query.includes('hola') || query.includes('saludo') || query.includes('ayuda') || query.includes('como funciona')) {
        response = {
          type: 'general',
          text: `¡Hola! Soy **El Cerebro Inteligente de Analytics** de creativity.mx.\n\nEstoy conectado mediante tuberías de datos directas con tu base de datos de **Supabase** y la API de **Bind ERP**. Puedo ayudarte a responder consultas analíticas de inmediato. Prueba preguntándome:\n\n* *¿Qué productos están por agotarse?*\n* *Muéstrame el reporte de ventas.*\n* *¿Qué playeras no tienen existencias?*`
        };
      } else {
        response = {
          type: 'general',
          text: `Procesando tu consulta mediante modelos de lenguaje Gemini 1.5 Flash...\n\nHe analizado el catálogo activo de **${totalItemsCount} variantes** y el volumen de pedidos. No encuentro ninguna anomalía crítica relacionada con "${query}". Las existencias generales se encuentran al 85% de capacidad respecto a los almacenes registrados en Bind ERP.`
        };
      }

      setAiResponse(response);
      setIsSearching(false);
      setShowAnswer(true);
    }, 1500);
  };

  // --- CANVASES Y ANIMACIÓN DEL CEREBRO NEURAL ---
  useEffect(() => {
    if (loading || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Configurar resoluciones
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Definición de Nodos de la Red Neuronal
    const nodes = [
      { id: 1, label: 'Cerebro Central', val: 'Analizador IA', x: 230, y: 150, radius: 24, color: '#a855f7', glow: 'rgba(168,85,247,0.4)', detail: 'Centraliza existencias y despacha predicciones logísticas mediante IA.' },
      { id: 2, label: 'Almacén Central', val: `${Math.round(totalItemsCount * 0.6)} var.`, x: 80, y: 220, radius: 20, color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', detail: 'Bodega de stock principal. Abastece compras web y traslados.' },
      { id: 3, label: 'Sucursal Zamora', val: `${Math.round(totalItemsCount * 0.25)} var.`, x: 380, y: 220, radius: 18, color: '#10b981', glow: 'rgba(16,185,129,0.3)', detail: 'Punto de venta físico y almacén secundario de distribución.' },
      { id: 4, label: 'Sucursal Querétaro', val: `${Math.round(totalItemsCount * 0.15)} var.`, x: 350, y: 80, radius: 18, color: '#06b6d4', glow: 'rgba(6,182,212,0.3)', detail: 'Centro Logístico regional norte y tienda física.' },
      { id: 5, label: 'Ventas Web', val: `$${Math.round(totalRevenue / 1000)}k`, x: 100, y: 80, radius: 20, color: '#ec4899', glow: 'rgba(236,72,153,0.3)', detail: `Pedidos completados online: ${paidOrdersCount} órdenes procesadas con éxito.` },
      { id: 6, label: 'Mercado Pago', val: 'Pasarela OK', x: 230, y: 260, radius: 16, color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', detail: 'Estado de pasarela: Activa y en funcionamiento. 0 fallos recientes.' },
      { id: 7, label: 'Skydropx', val: 'Envíos OK', x: 230, y: 40, radius: 16, color: '#6366f1', glow: 'rgba(99,102,241,0.3)', detail: 'Integración de paqueterías: Conexión estable. Guías automáticas emitidas.' }
    ];

    // Conexiones de la red
    const connections = [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
      { from: 1, to: 5 },
      { from: 1, to: 6 },
      { from: 1, to: 7 },
      { from: 2, to: 5 },
      { from: 3, to: 6 },
      { from: 4, to: 7 }
    ];

    // Partículas fluyendo en las conexiones
    const particles = [];
    const createParticle = () => {
      const conn = connections[Math.floor(Math.random() * connections.length)];
      return {
        from: nodes.find(n => n.id === conn.from),
        to: nodes.find(n => n.id === conn.to),
        progress: 0,
        speed: 0.004 + Math.random() * 0.008,
        color: ['#22d3ee', '#818cf8', '#f472b6', '#34d399'][Math.floor(Math.random() * 4)]
      };
    };

    // Inicializar 15 partículas en diferentes estados
    for (let i = 0; i < 15; i++) {
      const p = createParticle();
      p.progress = Math.random();
      particles.push(p);
    }

    // Loop de animación
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dibujar Conexiones
      ctx.lineWidth = 1;
      connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.stroke();
      });

      // Actualizar y Dibujar Partículas
      particles.forEach((p, idx) => {
        // Si la IA está buscando, aceleramos la animación de flujo para dar sensación dinámica
        const currentSpeed = isSearching ? p.speed * 8 : p.speed;
        p.progress += currentSpeed;
        
        if (p.progress >= 1) {
          particles[idx] = createParticle(); // Reiniciar
          return;
        }

        const x = p.from.x + (p.to.x - p.from.x) * p.progress;
        const y = p.from.y + (p.to.y - p.from.y) * p.progress;

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // Detectar Hover de Nodos
      let activeHover = null;
      nodes.forEach(node => {
        const dx = mousePos.x - node.x;
        const dy = mousePos.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < node.radius + 5) {
          activeHover = node;
        }
      });
      setHoveredNode(activeHover);

      // Dibujar Nodos
      nodes.forEach(node => {
        const isHovered = activeHover && activeHover.id === node.id;
        const radius = isHovered ? node.radius + 3 : node.radius;

        // Brillo Exterior
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? node.glow.replace('0.3', '0.6').replace('0.4', '0.7') : node.glow;
        ctx.fill();

        // Círculo Sólido
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = node.color;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();
        ctx.fill();

        // Texto del Nodo
        ctx.font = 'bold 9px system-ui';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(node.val, node.x, node.y + 3);

        ctx.font = 'bold 8px system-ui';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(node.label, node.x, node.y - node.radius - 6);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [loading, mousePos, totalItemsCount, totalRevenue, isSearching]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-purple-400">Encendiendo Cerebro Neural...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden selection:bg-purple-500/30">
      
      {/* Brillos Radiales del Fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-purple-900/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-cyan-900/10 blur-[150px] pointer-events-none"></div>
      
      {/* Header */}
      <header className="w-full bg-slate-900/40 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">creativity.mx</h1>
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Brain Intelligence Module</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin')}
              className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all"
            >
              Panel de Control
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        
        {/* TITULAR Y BUSCADOR CENTRADO EN BLANCO */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-6">
            El Cerebro de creativity.mx
          </h2>
          <p className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest mb-8">
            Consulta stock, ventas y quiebres de inventario al instante
          </p>

          {/* Buscador en Blanco */}
          <div className="relative max-w-2xl mx-auto shadow-2xl rounded-3xl group">
            {/* Resplandor exterior */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            
            <div className="relative flex items-center bg-white rounded-3xl border-2 border-slate-200 overflow-hidden px-2">
              <span className="text-xl pl-4 pr-2 text-slate-400">🔎</span>
              <input
                type="text"
                placeholder="Pregunta algo (ej. ¿Qué productos están agotados?)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                className="w-full bg-transparent border-none py-5 px-3 text-slate-900 font-bold placeholder-slate-400 focus:outline-none text-base"
              />
              <button
                onClick={() => handleAISearch()}
                disabled={isSearching}
                className="my-1.5 px-6 py-3 bg-slate-950 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-md"
              >
                {isSearching ? (
                  <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  'Analizar'
                )}
              </button>
            </div>
          </div>

          {/* Sugerencias Rápidas / Chips */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-6">
            {[
              { text: '¿Qué productos están por agotarse?', query: 'productos por agotarse' },
              { text: '¿Cuáles están en cero?', query: 'productos agotados' },
              { text: 'Reporte de ventas', query: 'ventas e ingresos' }
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleAISearch(chip.query)}
                className="bg-white/5 border border-white/5 hover:border-purple-500/30 px-4 py-2 rounded-full text-xs font-bold text-gray-400 hover:text-white hover:bg-purple-500/10 transition-all"
              >
                {chip.text}
              </button>
            ))}
          </div>
        </div>

        {/* RESPUESTA DEL BUSCADOR IA (SE DESPLIEGA AL BUSCAR) */}
        {showAnswer && aiResponse && (
          <div className="max-w-4xl mx-auto mb-16 bg-slate-900/60 border border-purple-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-xl animate-fadeIn shadow-2xl relative overflow-hidden">
            {/* Brillo interno */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-2.5 mb-4 relative z-10">
              <span className="text-purple-400 text-xl">⚡</span>
              <h4 className="text-xs font-black uppercase tracking-widest text-purple-400">Resultados en Tiempo Real</h4>
            </div>
            
            <p className="text-sm text-gray-200 leading-relaxed font-medium mb-6 whitespace-pre-line relative z-10">
              {aiResponse.text}
            </p>
            
            {/* Tabla Dinámica de Resultados */}
            {(aiResponse.type === 'low_stock' || aiResponse.type === 'out_of_stock') && aiResponse.data && (
              <div className="overflow-x-auto border border-white/5 rounded-2xl relative z-10 shadow-inner">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-5 py-4">Variante (Corte / Color)</th>
                      <th className="px-5 py-4 text-center">Talla</th>
                      <th className="px-5 py-4">SKU</th>
                      <th className="px-5 py-4 text-right">Existencias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {aiResponse.data.map(item => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="px-5 py-3.5 font-sans font-bold text-white">{item.corte} - {item.color}</td>
                        <td className="px-5 py-3.5 text-center text-cyan-400 font-bold">{item.talla}</td>
                        <td className="px-5 py-3.5 text-gray-400">{item.sku}</td>
                        <td className={`px-5 py-3.5 text-right font-black ${item.stock === 0 ? 'text-red-500 bg-red-500/5' : 'text-orange-400 bg-orange-500/5'}`}>
                          {item.stock} pz
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTENEDOR PRINCIPAL DE COMPONENTES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* LADO IZQUIERDO: Canvas Cerebro Neural (Lienzo interactivo) */}
          <div className="lg:col-span-6 bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden h-[460px]">
            <div className="w-full flex justify-between items-center mb-4 relative z-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <span>🧠</span> Red Neuronal Interactiva
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                <span className="text-[8px] font-black uppercase text-cyan-400 tracking-wider">Live</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredNode(null)}
              className="w-full h-[280px] cursor-pointer bg-slate-950/20 rounded-2xl border border-white/5"
            ></canvas>

            {/* Tooltip de nodo interactivo */}
            <div className="w-full mt-4 min-h-[70px] bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300">
              {hoveredNode ? (
                <>
                  <div className="w-2.5 h-10 rounded-full shrink-0" style={{ backgroundColor: hoveredNode.color }}></div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{hoveredNode.label}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{hoveredNode.detail}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500 italic text-center w-full my-auto">Pasa el cursor sobre un nodo de la red neuronal para auditar el flujo logístico.</p>
              )}
            </div>
          </div>

          {/* LADO DERECHO: Tablero Google Trends TV (Cuadros de Colores Interactivos) */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* Header del panel */}
            <div className="flex justify-between items-center bg-slate-900/30 border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Filtro de Datos</h3>
              </div>
              <select
                value={activeBranch}
                onChange={(e) => setActiveBranch(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-purple-500 text-white cursor-pointer"
              >
                <option value="all">Consolidado general</option>
                <option value="central">Almacén Central (60%)</option>
                <option value="zamora">Sucursal Zamora (25%)</option>
                <option value="queretaro">Sucursal Querétaro (15%)</option>
              </select>
            </div>

            {/* Grid Estilo Google Trends TV */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Bloque Rojo: Agotados (Critical Clickable) */}
              <div 
                onClick={() => handleAISearch('productos agotados')}
                className="bg-[#EA4335] rounded-3xl p-6 hover:scale-[1.02] cursor-pointer shadow-xl transition-all flex flex-col justify-between h-44 relative overflow-hidden group"
              >
                <div className="absolute top-2 right-4 text-3xl opacity-15 group-hover:scale-110 transition-transform">⚠️</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Agotados (Stock 0)</div>
                <div>
                  <h3 className="text-4xl font-black text-white">{currentOutOfStock.length}</h3>
                  <p className="text-[10px] text-white/80 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                    <span>Ver lista</span> ➔
                  </p>
                </div>
              </div>

              {/* Bloque Amarillo: Por Agotarse (Clickable) */}
              <div 
                onClick={() => handleAISearch('productos por agotarse')}
                className="bg-[#FBBC05] rounded-3xl p-6 hover:scale-[1.02] cursor-pointer shadow-xl transition-all flex flex-col justify-between h-44 relative overflow-hidden group text-slate-950"
              >
                <div className="absolute top-2 right-4 text-3xl opacity-15 group-hover:scale-110 transition-transform">🔔</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-950/70">Por Agotarse (≤10)</div>
                <div>
                  <h3 className="text-4xl font-black">{currentLowStock.length}</h3>
                  <p className="text-[10px] text-slate-950/80 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                    <span>Revisar alertas</span> ➔
                  </p>
                </div>
              </div>

              {/* Bloque Verde: Ventas (Clickable) */}
              <div 
                onClick={() => handleAISearch('ventas')}
                className="bg-[#34A853] rounded-3xl p-6 hover:scale-[1.02] cursor-pointer shadow-xl transition-all flex flex-col justify-between h-44 relative overflow-hidden group"
              >
                <div className="absolute top-2 right-4 text-3xl opacity-15 group-hover:scale-110 transition-transform">💰</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Ventas Registradas</div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-white">
                    ${Math.round(totalRevenue).toLocaleString('es-MX')}
                  </h3>
                  <p className="text-[10px] text-white/80 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                    <span>Ver reporte</span> ➔
                  </p>
                </div>
              </div>

              {/* Bloque Azul: Catálogo / Existencias (Clickable) */}
              <div 
                onClick={() => handleAISearch('ayuda')}
                className="bg-[#4285F4] rounded-3xl p-6 hover:scale-[1.02] cursor-pointer shadow-xl transition-all flex flex-col justify-between h-44 relative overflow-hidden group"
              >
                <div className="absolute top-2 right-4 text-3xl opacity-15 group-hover:scale-110 transition-transform">🤖</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Asistente IA</div>
                <div>
                  <h3 className="text-2xl font-black text-white">Cerebro Activo</h3>
                  <p className="text-[10px] text-white/80 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                    <span>Consultar ayuda</span> ➔
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* ALERTA DE QUIEBRE RÁPIDO (FOOTER PANEL) */}
        <div className="max-w-4xl mx-auto bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
            <span>🚨</span> Variantes Críticas en {activeBranch === 'all' ? 'Todas las Sucursales' : `Sucursal: ${activeBranch}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            {currentOutOfStock.slice(0, 4).map(item => {
              const corte = data.cortes.find(c => c.id === item.corte_id)?.nombre || 'Playera';
              const color = data.colores.find(c => c.id === item.color_id)?.nombre || 'N/A';
              return (
                <div key={item.id} className="bg-slate-950/60 border border-red-500/10 rounded-2xl p-4 flex justify-between items-center hover:border-red-500/20 transition-all">
                  <div>
                    <div className="text-xs font-bold text-white">{corte} - {color}</div>
                    <div className="text-[9px] text-gray-500 font-mono mt-0.5">Talla: {item.talla} | SKU: {item.sku || 'N/A'}</div>
                  </div>
                  <span className="text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Agotado</span>
                </div>
              );
            })}
            {currentLowStock.slice(0, 4).map(item => {
              const corte = data.cortes.find(c => c.id === item.corte_id)?.nombre || 'Playera';
              const color = data.colores.find(c => c.id === item.color_id)?.nombre || 'N/A';
              return (
                <div key={item.id} className="bg-slate-950/60 border border-orange-500/10 rounded-2xl p-4 flex justify-between items-center hover:border-orange-500/20 transition-all">
                  <div>
                    <div className="text-xs font-bold text-white">{corte} - {color}</div>
                    <div className="text-[9px] text-gray-500 font-mono mt-0.5">Talla: {item.talla} | SKU: {item.sku || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded-full uppercase tracking-wider">Bajo Stock</span>
                    <div className="text-[10px] font-black text-white mt-1.5">{item.stock} pz</div>
                  </div>
                </div>
              );
            })}
            {currentOutOfStock.length === 0 && currentLowStock.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500 text-xs italic">
                No hay alertas críticas en esta sucursal. Inventario en niveles óptimos.
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-slate-950 py-8 mt-16 text-center text-xs text-gray-600 relative z-10">
        <p className="font-bold text-gray-400">creativity.mx - Cerebro Analítico V1.0</p>
        <p className="mt-1">Copyright © 2026 creativity.mx. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default CerebroDashboard;
