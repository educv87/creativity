import React, { useEffect, useState } from 'react';

const HeroCover = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full h-[70vh] sm:h-[80vh] overflow-hidden flex items-center justify-center bg-gray-900">
      {/* Background Image with Fixed Parallax Effect */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/hero_bg.png')",
          backgroundAttachment: "fixed",
          transform: `translateY(${scrollY * 0.3}px)`, // Slight extra parallax move
        }}
      ></div>

      {/* Color Overlay Mask (Gradient for premium look) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-fuchsia-900/80 via-purple-900/70 to-cyan-900/80 mix-blend-multiply"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-black/30"></div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto transform transition-transform duration-1000 translate-y-0 opacity-100">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight drop-shadow-lg mb-6">
          Creativity <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Pro</span>
        </h1>
        <p className="text-xl sm:text-2xl text-gray-200 font-medium drop-shadow-md mb-10 max-w-2xl mx-auto leading-relaxed">
          Sistema de Pedidos Ágil y Mayorista. Acelera tu producción con calidad premium.
        </p>
        <div className="flex justify-center gap-4">
          <button className="bg-cyan-500 hover:bg-cyan-400 text-white px-8 py-4 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]">
            Hacer Pedido
          </button>
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-bold transition-all hover:-translate-y-1">
            Ver Catálogo
          </button>
        </div>
      </div>
      
      {/* Scroll Down Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
};

export default HeroCover;
