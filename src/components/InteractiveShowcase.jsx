import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InteractiveShowcase = ({ colors }) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [rotation, setRotation] = useState(0); 

  const activeColor = colors[activeIndex];


  // Map to tailwind background colors for the big immersive background
  const bgColors = {
    'blanco': 'bg-gray-100',
    'negro': 'bg-neutral-900',
    'rosa baby': 'bg-pink-100',
    'azul cielo': 'bg-sky-100',
    'lila': 'bg-purple-100',
    'menta': 'bg-teal-100'
  };

  // Map to text colors for the giant typography
  const textColors = {
    'blanco': 'text-gray-200',
    'negro': 'text-neutral-800',
    'rosa baby': 'text-pink-200',
    'azul cielo': 'text-sky-200',
    'lila': 'text-purple-200',
    'menta': 'text-teal-200'
  };

  // Map to image paths (cycling through the 3 new silhouettes)
  const colorSilhouetteMap = {
    'blanco': '/tshirt_blanco_hombre.png',
    'negro': '/tshirt_blanco_mujer.png',
    'rosa baby': '/tshirt_blanco_infantil.png',
    'azul cielo': '/tshirt_blanco_hombre.png',
    'lila': '/tshirt_blanco_mujer.png',
    'menta': '/tshirt_blanco_infantil.png'
  };

  const handleNavClick = (index) => {
    if (index === activeIndex) return;
    setIsTransitioning(true);
    setActiveIndex(index);
    setTimeout(() => setIsTransitioning(false), 2000); // match new transition duration
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % colors.length;
      setIsTransitioning(true);
      setActiveIndex(nextIndex);
      setTimeout(() => setIsTransitioning(false), 2000);
    }, 5000); // 5 segundos para que haya tiempo de apreciar la animación lenta
    return () => clearInterval(timer);
  }, [activeIndex, colors.length]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <img src="/Logo_CREATIVITY_web-13.png" alt="Creativity Logo" className="h-10 sm:h-12 w-auto drop-shadow-md" />
        </div>
        <div className="flex items-center gap-6 pointer-events-auto">
          <button 
            onClick={() => navigate('/crear-pedido')}
            className="px-8 py-3 rounded-full bg-black text-white font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
          >
            Crear Pedido
          </button>
        </div>
      </div>
      <div 
        className="flex w-full h-full transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {colors.map((color, idx) => (
          <div 
            key={color.id} 
            className={`relative w-full h-full flex-shrink-0 flex items-center justify-center ${bgColors[color.id]}`}
          >
            {/* Texto Gigante de Fondo Animado */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <h1 
                className={`text-[20vw] font-black uppercase tracking-tighter ${textColors[color.id]} transition-all duration-[2500ms] ease-out ${activeIndex === idx ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-12'}`}
                style={{ lineHeight: 0.8 }}
              >
                {color.nombre.split(' ')[0]}
              </h1>
            </div>
          </div>
        ))}
      </div>

      {/* Playera Estática y Fija al Centro (Crossfade Color + Silueta) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 perspective-[2000px]">
        <div className="relative w-80 h-80 sm:w-[500px] sm:h-[500px] filter drop-shadow-2xl">
          {colors.map((color, idx) => {
            const baseImg = colorSilhouetteMap[color.id];
            return (
              <div 
                key={`shirt-${color.id}`} 
                className={`absolute inset-0 w-full h-full transition-opacity duration-[2000ms] ease-in-out ${activeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                {/* Base Image (White Silhouette) */}
                <img 
                  src={baseImg} 
                  alt={`Playera ${color.nombre}`} 
                  className="absolute inset-0 w-full h-full object-contain" 
                />
                
                {/* Color Tint Overlay for non-white colors */}
                {color.id !== 'blanco' && (
                  <div 
                    className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply ${color.hex}`}
                    style={{ 
                      opacity: color.id === 'negro' ? 0.9 : 0.85, 
                      maskImage: `url(${baseImg})`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', 
                      WebkitMaskImage: `url(${baseImg})`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' 
                    }}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default InteractiveShowcase;
