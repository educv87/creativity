import React, { useState } from 'react';

const PRECIOS = {
  REGULAR: { menudeo: 65.00, mayoreo: 59.00 }, // Tallas CH, M, G
  XL: { menudeo: 70.00, mayoreo: 64.00 }       // Tallas XG, XXG (XL)
};

const UMBRAL_MAYOREO = 5; // Piezas mínimas para descuento
const UMBRAL_ENVIO_GRATIS = 20; // Piezas para envío gratis

const FastOrderMatrix = ({ productType, colors, sizes }) => {
  const [quantities, setQuantities] = useState({});

  const handleQuantityChange = (colorId, size, value) => {
    const num = parseInt(value, 10);
    setQuantities(prev => ({
      ...prev,
      [`${colorId}-${size}`]: isNaN(num) ? 0 : num
    }));
  };

  const selecciones = Object.entries(quantities).map(([key, cantidad]) => {
    const [colorId, talla] = key.split('-');
    return { colorId, talla, cantidad };
  });

  const totalPiezas = selecciones.reduce((acc, item) => acc + item.cantidad, 0);
  const tieneMayoreo = totalPiezas >= UMBRAL_MAYOREO;
  const tieneEnvioGratis = totalPiezas >= UMBRAL_ENVIO_GRATIS;
  const piezasFaltantesMayoreo = tieneMayoreo ? 0 : UMBRAL_MAYOREO - totalPiezas;
  const piezasFaltantesEnvio = tieneEnvioGratis ? 0 : UMBRAL_ENVIO_GRATIS - totalPiezas;
  const progresoPorcentaje = Math.min((totalPiezas / UMBRAL_ENVIO_GRATIS) * 100, 100);

  let subtotal = 0;
  selecciones.forEach(item => {
    const isXL = item.talla === 'XG' || item.talla === 'XXG' || item.talla === 'XL';
    const tarifa = isXL ? PRECIOS.XL : PRECIOS.REGULAR;
    const precioAplicado = tieneMayoreo ? tarifa.mayoreo : tarifa.menudeo;
    subtotal += (precioAplicado * item.cantidad);
  });

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-8">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr>
              <th className="p-4 text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">Color</th>
              {sizes.map(size => (
                <th key={size} className="p-4 text-center text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">{size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map(color => (
              <tr key={color.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-300">
                <td className="p-4 flex items-center gap-4">
                  <div className={`relative w-8 h-8 rounded-full shadow-inner flex items-center justify-center ${color.hex}`}>
                    <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10"></div>
                  </div>
                  <div>
                    <span className="block font-semibold text-gray-900">{color.nombre}</span>
                    {color.es_claro && (
                      <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
                        Apto Sublimación
                      </span>
                    )}
                  </div>
                </td>
                {sizes.map(size => {
                  const key = `${color.id}-${size}`;
                  return (
                    <td key={size} className="p-4 text-center">
                      <div className="inline-flex items-center justify-center bg-gray-100/80 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 transition-all">
                        <input 
                          type="number" 
                          min="0"
                          placeholder="0"
                          value={quantities[key] || ''}
                          onChange={(e) => handleQuantityChange(color.id, size, e.target.value)}
                          className="w-16 h-10 text-center bg-transparent border-none font-medium text-gray-900 focus:outline-none placeholder-gray-400"
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Checkout & Progress Panel */}
      <div className="mt-4 bg-gray-900 rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle glowing orb in background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-cyan-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center justify-between">
          
          {/* Progress Section */}
          <div className="w-full lg:w-3/5">
            <div className="flex justify-between text-xs font-bold text-gray-400 mb-3 px-1 uppercase tracking-widest">
              <span>0 Pz</span>
              <span className={`text-center absolute left-[25%] -translate-x-1/2 transition-colors ${tieneMayoreo ? "text-emerald-400" : ""}`}>Mayoreo (5)</span>
              <span className={`transition-colors ${tieneEnvioGratis ? "text-fuchsia-400" : ""}`}>Envío Gratis (20)</span>
            </div>
            
            <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-full ${tieneEnvioGratis ? 'bg-gradient-to-r from-fuchsia-500 to-purple-500' : tieneMayoreo ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gray-500'}`}
                style={{ width: `${progresoPorcentaje}%` }}
              ></div>
              <div className="absolute top-0 left-[25%] w-px h-full bg-white/30"></div>
            </div>
            
            <div className="mt-5 min-h-[1.5rem]">
              {!tieneMayoreo && totalPiezas > 0 && (
                <p className="text-sm text-gray-300 font-medium">
                  Agrega <span className="text-white font-bold">{piezasFaltantesMayoreo} pieza{piezasFaltantesMayoreo !== 1 ? 's' : ''}</span> más para desbloquear el precio de mayoreo.
                </p>
              )}
              {tieneMayoreo && !tieneEnvioGratis && (
                <p className="text-sm text-emerald-300 font-medium">
                  ¡Mayoreo activado! Agrega <span className="text-white font-bold">{piezasFaltantesEnvio} pieza{piezasFaltantesEnvio !== 1 ? 's' : ''}</span> para obtener <strong className="text-emerald-400">ENVÍO GRATIS</strong>.
                </p>
              )}
              {tieneEnvioGratis && (
                <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">
                  ¡Envío Gratis Desbloqueado! Excelente estrategia.
                </p>
              )}
            </div>
          </div>

          {/* Totals & CTA */}
          <div className="w-full lg:w-2/5 flex flex-col items-end text-right">
            <p className="text-sm font-medium text-gray-400 mb-1">Total: {totalPiezas} piezas</p>
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-6">
              ${subtotal.toFixed(2)}
            </p>
            <button className="w-full sm:w-auto px-10 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:bg-gray-100 hover:scale-105 transition-all duration-300 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Completar Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FastOrderMatrix;
