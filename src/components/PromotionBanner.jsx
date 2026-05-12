import React from 'react';

const PromotionBanner = () => {
  return (
    <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-teal-600 text-white py-2 px-4 text-center relative z-[60] overflow-hidden shadow-lg">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <div className="relative flex items-center justify-center gap-3 md:gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="bg-white text-pink-600 font-black text-[10px] px-2 py-0.5 rounded-full uppercase animate-bounce">
            Oferta de Lanzamiento
          </span>
          <p className="text-xs md:text-sm font-bold tracking-tight">
            ¡Solo para los primeros <span className="underline decoration-teal-400 decoration-2 underline-offset-2">25 pedidos</span>! 
          </p>
        </div>
        
        <div className="h-4 w-[1px] bg-white/30 hidden md:block"></div>
        
        <p className="text-xs md:text-sm font-medium">
          Lleva <strong className="font-black">50+ piezas</strong> a precio de distribuidor (<strong className="text-teal-300">$69</strong>) + <strong className="text-teal-300">ENVÍO GRATIS</strong> 🚛
        </p>
        
        <div className="flex items-center gap-2 ml-0 md:ml-4">
          <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Usa el cupón:</span>
          <code className="bg-black/20 px-3 py-1 rounded-lg border border-white/20 font-black text-xs md:text-sm tracking-tighter text-teal-300">
            CREATIVITY25
          </code>
        </div>
      </div>
    </div>
  );
};

export default PromotionBanner;
