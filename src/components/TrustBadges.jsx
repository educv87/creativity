import React from 'react';

const TrustBadges = ({ className = "" }) => {
  const guarantees = [
    {
      icon: (
        <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h2a2 2 0 012 2v12z" />
        </svg>
      ),
      title: "Envíos Asegurados a todo México",
      description: "Número de guía rastreable con FedEx, DHL y Estafeta directo a tu puerta.",
      badge: "Guía 24/7"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Compra 100% Protegida",
      description: "Pagos procesados de forma segura vía Mercado Pago (Tarjetas, OXXO, SPEI).",
      badge: "Encriptado SSL"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      title: "Inventario Sincronizado BIND ERP",
      description: "Stock real y garantía de disponibilidad inmediata de cada prenda y talla.",
      badge: "Stock Real ERP"
    },
    {
      icon: (
        <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h47m0 0l-3 3m3-3l-3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Garantía de Calidad Total",
      description: "Te garantizamos playeras con acabados premium o te reemplazamos tu pedido.",
      badge: "Garantía Total"
    }
  ];

  return (
    <section className={`py-12 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white rounded-3xl my-10 shadow-2xl border border-gray-800 relative overflow-hidden ${className}`}>
      {/* Background glow effects */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-10">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            Tranquilidad Garantizada
          </span>
          <h3 className="text-2xl md:text-3xl font-black mt-3">
            ¿Por qué comprar con certeza en <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">creativity.mx</span>?
          </h3>
          <p className="text-gray-400 text-sm md:text-base mt-2 max-w-2xl mx-auto">
            Procesamos tu pedido con los estándares más altos de seguridad y logística en México.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {guarantees.map((item, index) => (
            <div key={index} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gray-900/80 rounded-xl border border-gray-700/50 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-md">
                    {item.badge}
                  </span>
                </div>
                <h4 className="font-bold text-lg text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
