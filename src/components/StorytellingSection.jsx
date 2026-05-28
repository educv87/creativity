import React, { useState, useEffect } from 'react';

// SVG Wave Divider for organic transitions between color blocks
const WaveDivider = ({ fill, bgClass = 'bg-transparent', animated = false }) => (
  <div className={`w-full overflow-hidden leading-[0] ${bgClass}`}>
    {animated ? (
      <svg className="w-[200%] h-12 md:h-24 block" viewBox="0 0 2880 100" preserveAspectRatio="none" style={{ animation: 'wave-move 10s linear infinite' }}>
        <path fill={fill} d="M0,50 C320,150 420,-50 740,50 C1060,150 1280,-50 1440,50 C1760,150 1860,-50 2180,50 C2500,150 2720,-50 2880,50 L2880,100 L0,100 Z" />
      </svg>
    ) : (
      <svg viewBox="0 0 1440 100" className="w-full h-12 md:h-24 block" preserveAspectRatio="none">
        <path fill={fill} d="M0,50 C320,150 420,-50 740,50 C1060,150 1280,-50 1440,50 L1440,100 L0,100 Z" />
      </svg>
    )}
  </div>
);

// Playful floating sticker component
const Sticker = ({ children, className = '', style = {} }) => (
  <div
    className={`absolute pointer-events-none select-none z-10 ${className}`}
    style={{ animation: 'float 6s ease-in-out infinite', ...style }}
  >
    {children}
  </div>
);

import { useNavigate } from 'react-router-dom';

// Botón de acción principal
const CreateOrderBtn = ({ className = "" }) => {
  const navigate = useNavigate();
  return (
    <button 
      className={`group relative bg-gray-900 text-white px-8 md:px-12 py-4 md:py-5 rounded-full font-black text-lg md:text-xl hover:-translate-y-1 transition-all duration-300 shadow-xl overflow-hidden inline-block ${className}`}
      onClick={() => navigate('/crear-pedido')}
    >
      <div className="absolute inset-0 w-full h-full bg-green-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out z-0"></div>
      <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white">
        Crear Pedido
        <svg className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </span>
    </button>
  );
};

const StorytellingSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const showcases = [
    { color: 'bg-white', design: '/hello_summer.png', size: 'w-[35%] mt-[-10%]' },
    { color: 'bg-purple-200', design: '/dope_design.png', size: 'w-[35%] mt-[-15%]' },
    { color: 'bg-pink-200', design: '/beach_sunset.png', size: 'w-[35%] mt-[-10%]' },
    { color: 'bg-sky-200', design: '/dope_design.png', size: 'w-[35%] mt-[-15%]' },
    { color: 'bg-teal-200', design: '/hello_summer.png', size: 'w-[35%] mt-[-10%]' }
  ];

  const catalogColors = [
    { id: 'blanco', name: 'Blanco', hex: '#ffffff', blobBg: 'bg-transparent', sectionBg: 'bg-white', cardBg: 'bg-gray-50', cardHover: 'group-hover:bg-gray-100', tint: 'bg-transparent', textHover: 'group-hover:text-gray-900', borderHover: 'group-hover:border-gray-300' },
    { id: 'negro', name: 'Negro', hex: '#111827', blobBg: 'bg-gray-200', sectionBg: 'bg-gray-100/50', cardBg: 'bg-gray-100', cardHover: 'group-hover:bg-gray-200', tint: 'bg-gray-700', textHover: 'group-hover:text-gray-900', borderHover: 'group-hover:border-gray-400' },
    { id: 'lila', name: 'Lila', hex: '#e9d5ff', blobBg: 'bg-purple-100', sectionBg: 'bg-purple-50/20', cardBg: 'bg-purple-50', cardHover: 'group-hover:bg-purple-100', tint: 'bg-purple-200', textHover: 'group-hover:text-purple-600', borderHover: 'group-hover:border-purple-300' },
    { id: 'rosa', name: 'Rosa Baby', hex: '#fbcfe8', blobBg: 'bg-pink-100', sectionBg: 'bg-pink-50/20', cardBg: 'bg-pink-50', cardHover: 'group-hover:bg-pink-100', tint: 'bg-pink-200', textHover: 'group-hover:text-pink-600', borderHover: 'group-hover:border-pink-300' },
    { id: 'menta', name: 'Menta', hex: '#ccfbf1', blobBg: 'bg-teal-100', sectionBg: 'bg-teal-50/20', cardBg: 'bg-teal-50', cardHover: 'group-hover:bg-teal-100', tint: 'bg-teal-200', textHover: 'group-hover:text-teal-600', borderHover: 'group-hover:border-teal-300' },
    { id: 'cielo', name: 'Azul Cielo', hex: '#bae6fd', blobBg: 'bg-sky-100', sectionBg: 'bg-sky-50/20', cardBg: 'bg-sky-50', cardHover: 'group-hover:bg-sky-100', tint: 'bg-sky-200', textHover: 'group-hover:text-sky-600', borderHover: 'group-hover:border-sky-300' },
    { id: 'amarillo', name: 'Amarillo Pastel', hex: '#fef08a', blobBg: 'bg-yellow-100', sectionBg: 'bg-yellow-50/20', cardBg: 'bg-yellow-50', cardHover: 'group-hover:bg-yellow-100', tint: 'bg-yellow-200', textHover: 'group-hover:text-yellow-600', borderHover: 'group-hover:border-yellow-300', comingSoon: true },
    { id: 'gris', name: 'Gris Perla', hex: '#e5e7eb', blobBg: 'bg-slate-200', sectionBg: 'bg-slate-100/50', cardBg: 'bg-slate-100', cardHover: 'group-hover:bg-slate-200', tint: 'bg-slate-300', textHover: 'group-hover:text-slate-600', borderHover: 'group-hover:border-slate-400', comingSoon: true },
    { id: 'marino', name: 'Azul Marino', hex: '#1e3a8a', blobBg: 'bg-blue-200', sectionBg: 'bg-blue-100/50', cardBg: 'bg-blue-100', cardHover: 'group-hover:bg-blue-200', tint: 'bg-blue-700', textHover: 'group-hover:text-blue-900', borderHover: 'group-hover:border-blue-400', comingSoon: true }
  ];

  const [hoveredColor, setHoveredColor] = useState(null);
  const [autoColorIndex, setAutoColorIndex] = useState(0);

  useEffect(() => {
    if (hoveredColor) return;
    const catalogTimer = setInterval(() => {
      setAutoColorIndex((prev) => (prev + 1) % catalogColors.length);
    }, 3500);
    return () => clearInterval(catalogTimer);
  }, [hoveredColor, catalogColors.length]);

  const activeCatalogColor = hoveredColor || catalogColors[autoColorIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % showcases.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const [activeHeadingColor, setActiveHeadingColor] = useState('text-pink-400');
  const headingColors = ['text-pink-400', 'text-purple-400', 'text-sky-400', 'text-teal-400', 'text-yellow-400'];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeadingColor(prev => {
        const currentIndex = headingColors.indexOf(prev);
        return headingColors[(currentIndex + 1) % headingColors.length];
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full bg-white z-20">
      {/* Ola superpuesta al Cover (InteractiveShowcase) para suavizar la transición */}
      <div className="absolute top-0 left-0 w-full -translate-y-[99%] pointer-events-none">
        <svg viewBox="0 0 1440 100" className="w-full h-12 md:h-24 block drop-shadow-sm" preserveAspectRatio="none">
          <path fill="#ffffff" d="M0,50 C320,150 420,-50 740,50 C1060,150 1280,-50 1440,50 L1440,100 L0,100 Z" />
        </svg>
      </div>

      {/* SECCIÓN 1: EL MITO (BLANCO - PAZ Y LIMPIEZA) */}
      <div className="bg-white py-24 sm:py-32 relative">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">

          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 tracking-tighter leading-[1.1] mb-8">
            Las playeras de sublimación ahora tienen <span className={`transition-colors duration-1000 ${activeHeadingColor}`}>color.</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto mb-10">
            Tus diseños merecen más que un lienzo aburrido. Las playeras Creativity le dan color y vida a tu marca desde el primer hilo.
          </p>
          <CreateOrderBtn />
        </div>
      </div>

      {/* Transición a Rosa Baby */}
      <WaveDivider fill="#FCE7F3" bgClass="bg-white" />

      {/* SECCIÓN 2: EL NEGOCIO (ROSA BABY - DIVERTIDO Y CLARO) */}
      <div className="bg-pink-100 py-20 sm:py-24 relative border-t-0">
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h3 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-6">
              El negocio está en crear <span className="text-pink-500 bg-white px-6 py-2 rounded-full inline-block rotate-[-3deg] shadow-sm ml-2">tu marca</span>
            </h3>
            <p className="text-xl md:text-2xl text-gray-700 font-medium max-w-3xl mx-auto">
              Con nuestros precios de fabricante tu margen crece. Inyecta tu creatividad en tus proyectos de sublimación.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
            {/* Paso 1 */}
            <div className="bg-white rounded-[3rem] p-6 lg:p-8 shadow-lg w-full md:w-1/3 text-center border-4 border-white hover:border-sky-100 relative group flex flex-col items-center transition-all duration-300 hover:shadow-xl">
              <div className="w-full aspect-square mb-6 transition-transform duration-500 group-hover:scale-105 flex items-center justify-center overflow-hidden">
                <img src="/step1_new.jpg" alt="El Lienzo" className="w-full h-full object-contain mix-blend-multiply scale-[1.35]" />
              </div>
              <div className="text-3xl font-black text-pink-500 mb-2">$70</div>
              <h4 className="text-2xl font-black text-gray-900 mb-2">1. El Lienzo</h4>
              <p className="text-gray-500 text-sm md:text-base">Playeras premium a un precio de mayoreo que protege tu bolsillo.</p>
            </div>

            {/* Plus */}
            <div className="text-4xl lg:text-5xl text-pink-400 font-black rotate-12 hidden md:block">✚</div>
            <div className="text-5xl text-pink-400 font-black md:hidden">✚</div>

            {/* Paso 2 */}
            <div className="bg-white rounded-[3rem] p-6 lg:p-8 shadow-lg w-full md:w-1/3 text-center border-4 border-white hover:border-purple-100 relative group flex flex-col items-center transition-all duration-300 hover:shadow-xl">
              <Sticker className="-top-6 -right-4 text-5xl z-20" style={{ animationDelay: '1s' }}>🎨</Sticker>
              <div className="w-full aspect-square mb-6 transition-transform duration-500 group-hover:scale-105 flex items-center justify-center overflow-hidden">
                <img src="/step2_new.jpg" alt="Tu Arte" className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <div className="text-3xl font-black text-purple-500 mb-2">$180</div>
              <h4 className="text-2xl font-black text-gray-900 mb-2">2. Tu Arte</h4>
              <p className="text-gray-500 text-sm md:text-base">Estampa tus diseños únicos. Los colores quedarán ultra brillantes.</p>
            </div>

            {/* Equals */}
            <div className="text-4xl lg:text-5xl text-pink-400 font-black rotate-[-12deg] hidden md:block">🟰</div>
            <div className="text-5xl text-pink-400 font-black md:hidden">🟰</div>

            {/* Paso 3 */}
            <div className="bg-white rounded-[3rem] p-6 lg:p-8 shadow-2xl w-full md:w-1/3 text-center border-4 border-teal-300 relative group flex flex-col items-center transition-all duration-300 hover:-translate-y-4 transform md:scale-105 z-10">
              <div className="absolute -top-5 bg-teal-400 text-white font-black px-6 py-2 rounded-full shadow-lg transform rotate-3 z-20">
                ¡Tu Creación!
              </div>
              <div className="w-full aspect-square mb-2 transition-transform duration-700 group-hover:scale-110 mt-2 relative flex items-center justify-center overflow-hidden">
                <img src="/step3_new.jpg" alt="Playera Final" className="w-full h-full object-contain mix-blend-multiply scale-[1.35]" />
              </div>
              <div className="text-5xl font-black text-teal-500 mb-2">$250</div>
              <h4 className="text-2xl font-black text-gray-900 mb-2">3. Tu Negocio</h4>
              <p className="text-gray-500 font-medium text-sm md:text-base">Rentabilidad alta y clientes enamorados que regresarán por más.</p>
            </div>
          </div>
          <div className="mt-16 text-center relative z-20">
            <CreateOrderBtn />
          </div>
        </div>
      </div>

      {/* Transición a Blanco puro */}
      <WaveDivider fill="#ffffff" bgClass="bg-pink-100" />

      {/* SECCIÓN 3: TEXTO DE CALIDAD (PIEL DE DURAZNO) */}
      <div className="bg-white pt-10 pb-16 sm:pt-16 sm:pb-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-16 md:gap-24">
          
          {/* PLAYERA CAMBIANDO DE COLOR CON DISEÑOS SINCRONIZADOS */}
          <div className="w-full lg:w-1/2 relative flex items-center justify-center min-h-[500px]">
            
            {/* ÓRBITA TRASERA */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ animation: 'spin-slow 20s linear infinite' }}>
              <div className="absolute top-5 md:top-10 right-0 md:-right-10 w-32 md:w-48 aspect-square blur-[2px] opacity-60" style={{ animation: 'counter-spin-slow 20s linear infinite' }}>
                <div className="relative w-full h-full">
                  {showcases.map((showcase, i) => (
                    <img key={i} src={showcase.design} alt="Orbit Back" className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply transition-opacity duration-1000 ${i === currentIndex ? 'opacity-100' : 'opacity-0'}`} />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="relative w-[350px] h-[350px] md:w-[500px] md:h-[500px] z-20 transition-transform duration-700 hover:scale-105" style={{ animation: 'float 6s ease-in-out infinite' }}>
              
              {/* Imagen Base (Playera Blanca) */}
              <img src="/tshirt_blanco_hombre.png" alt="Playera Blanca" className="absolute inset-0 w-full h-full object-contain drop-shadow-xl" />
              
              {/* Capa de Tintado (Ciclo de colores pastel) */}
              <div 
                className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-80 transition-colors duration-[2000ms] ease-in-out ${showcases[currentIndex].color}`}
                style={{ 
                  maskImage: `url(/tshirt_blanco_hombre.png)`, 
                  maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', 
                  WebkitMaskImage: `url(/tshirt_blanco_hombre.png)`, 
                  WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' 
                }}
              ></div>

              {/* Diseño Estampado en el Pecho (Crossfade suave) */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center z-30">
                {showcases.map((showcase, i) => (
                  <img 
                    key={i} 
                    src={showcase.design} 
                    alt="Estampado" 
                    className={`absolute ${showcase.size} mix-blend-multiply drop-shadow-sm transition-opacity duration-1000 ${i === currentIndex ? 'opacity-90' : 'opacity-0'}`} 
                  />
                ))}
              </div>
            </div>

            {/* ÓRBITA DELANTERA */}
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none" style={{ animation: 'spin-slow 15s linear infinite reverse' }}>
              <div className="absolute bottom-5 md:bottom-10 left-0 md:-left-5 w-32 md:w-48 aspect-square drop-shadow-2xl" style={{ animation: 'counter-spin-slow 15s linear infinite reverse' }}>
                <div className="relative w-full h-full">
                  {showcases.map((showcase, i) => (
                    <img key={i} src={showcase.design} alt="Orbit Front" className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply transition-opacity duration-1000 ${i === currentIndex ? 'opacity-100' : 'opacity-0'}`} />
                  ))}
                </div>
              </div>
            </div>
            
          </div>

          {/* Texto Limpio y Premium */}
          <div className="w-full lg:w-1/2 relative z-30 text-center lg:text-left flex flex-col justify-center">
            <div className="inline-block bg-teal-50 text-teal-600 font-bold px-5 py-2 rounded-full mb-6 shadow-sm text-sm md:text-base border border-teal-100 w-max mx-auto lg:mx-0">
              Piel de Durazno 🍑
            </div>
            <h3 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 tracking-tight mb-6 leading-[1.05]">
              Suavidad que <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-sky-500">enamora.</span>
            </h3>
            <p className="text-lg md:text-xl text-gray-500 leading-relaxed font-medium max-w-lg mx-auto lg:mx-0 mb-10">
              A pesar de ser 100% poliéster especializado para anclar colores de sublimación, tienen el porcentaje exacto de elastano para abrazar cada silueta. Son sorprendentemente <strong className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg">más suaves que el algodón y no se transparentan.</strong>
            </p>
            <CreateOrderBtn className="mx-auto lg:mx-0" />
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: CATÁLOGO Y CIERRE (BLANCO - PAZ PARA CERRAR) */}
      <div className={`pt-24 pb-16 sm:pt-32 sm:pb-20 relative transition-colors duration-700 overflow-hidden ${activeCatalogColor ? activeCatalogColor.sectionBg : 'bg-white'}`}>
        
        {/* OLA ANIMADA (MOVIMIENTO EN EL BORDE SUPERIOR) */}
        <div className="absolute top-0 left-0 w-full transform rotate-180 z-20">
          <WaveDivider fill="#ffffff" animated={true} />
        </div>

        {/* BLOBS ORGÁNICOS DE FONDO (MOVIMIENTO Y COLOR NOTABLE) */}
        <div className={`absolute top-0 -left-1/4 w-[100%] aspect-square organic-blob opacity-60 transition-colors duration-1000 blur-3xl pointer-events-none z-0 ${activeCatalogColor ? activeCatalogColor.blobBg : 'bg-transparent'}`}></div>
        <div className={`absolute bottom-0 -right-1/4 w-[80%] aspect-square organic-blob opacity-60 transition-colors duration-1000 blur-3xl pointer-events-none z-0 ${activeCatalogColor ? activeCatalogColor.blobBg : 'bg-transparent'}`} style={{ animationDirection: 'reverse', animationDelay: '-5s' }}></div>

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <h3 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-6">
            Envíos a todo <span className="text-purple-400 bg-purple-50 px-4 py-1 rounded-full">México</span>
          </h3>
          
          {/* Shipping Carriers Grid */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-16 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/FedEx_logo.svg" alt="FedEx" className="h-6 md:h-10 w-auto" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b9/DHL_Logo.svg" alt="DHL" className="h-6 md:h-10 w-auto" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/7f/Logo_de_Estafeta.svg" alt="Estafeta" className="h-4 md:h-8 w-auto" />
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-16 mb-16">
            {/* Infantil */}
            <div className="relative group w-64 md:w-72 cursor-pointer transition-transform duration-300">
              <div className={`w-full aspect-square rounded-[3rem] flex items-center justify-center mb-6 transition-all duration-500 group-hover:-translate-y-4 shadow-inner border-2 border-transparent group-hover:shadow-xl ${activeCatalogColor ? activeCatalogColor.cardBg : 'bg-gray-50'} ${activeCatalogColor ? activeCatalogColor.cardHover : 'group-hover:bg-gray-100'} ${activeCatalogColor ? activeCatalogColor.borderHover : 'group-hover:border-gray-300'}`}>
                
                {/* Capa de la playera con mezcla de color */}
                <div className="relative w-3/4 h-3/4 transition-transform duration-500 group-hover:scale-110">
                  <img src="/tshirt_blanco_infantil.png" alt="Infantil" className="absolute inset-0 w-full h-full object-contain drop-shadow-md z-10" />
                  <div 
                    className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-90 transition-colors duration-500 z-20 ${activeCatalogColor ? activeCatalogColor.tint : 'bg-transparent'}`}
                    style={{ maskImage: `url(/tshirt_blanco_infantil.png)`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: `url(/tshirt_blanco_infantil.png)`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' }}
                  ></div>
                  {activeCatalogColor?.comingSoon && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/80 backdrop-blur-sm text-white font-bold text-[10px] md:text-xs uppercase tracking-widest py-1.5 px-3 md:py-2 md:px-4 rounded-full z-30 shadow-xl border border-gray-700 w-max rotate-[-10deg] animate-pulse">
                      Próximamente
                    </div>
                  )}
                </div>

              </div>
              <h4 className={`text-2xl font-bold text-gray-800 transition-colors duration-300 ${activeCatalogColor ? activeCatalogColor.textHover : 'group-hover:text-gray-900'}`}>Corte Infantil</h4>
            </div>

            {/* Mujer */}
            <div className="relative group w-64 md:w-72 cursor-pointer mt-8 md:mt-0 transition-transform duration-300">
              <div className={`w-full aspect-square rounded-[3rem] flex items-center justify-center mb-6 transition-all duration-500 group-hover:-translate-y-4 shadow-inner border-2 border-transparent group-hover:shadow-xl ${activeCatalogColor ? activeCatalogColor.cardBg : 'bg-gray-50'} ${activeCatalogColor ? activeCatalogColor.cardHover : 'group-hover:bg-gray-100'} ${activeCatalogColor ? activeCatalogColor.borderHover : 'group-hover:border-gray-300'}`}>
                
                <div className="relative w-3/4 h-3/4 transition-transform duration-500 group-hover:scale-110">
                  <img src="/tshirt_blanco_mujer.png" alt="Mujer" className="absolute inset-0 w-full h-full object-contain drop-shadow-md z-10" />
                  <div 
                    className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-90 transition-colors duration-500 z-20 ${activeCatalogColor ? activeCatalogColor.tint : 'bg-transparent'}`}
                    style={{ maskImage: `url(/tshirt_blanco_mujer.png)`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: `url(/tshirt_blanco_mujer.png)`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' }}
                  ></div>
                  {activeCatalogColor?.comingSoon && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/80 backdrop-blur-sm text-white font-bold text-[10px] md:text-xs uppercase tracking-widest py-1.5 px-3 md:py-2 md:px-4 rounded-full z-30 shadow-xl border border-gray-700 w-max rotate-[-10deg] animate-pulse">
                      Próximamente
                    </div>
                  )}
                </div>

              </div>
              <h4 className={`text-2xl font-bold text-gray-800 transition-colors duration-300 ${activeCatalogColor ? activeCatalogColor.textHover : 'group-hover:text-gray-900'}`}>Corte Mujer</h4>
            </div>

            {/* Hombre */}
            <div className="relative group w-64 md:w-72 cursor-pointer mt-8 md:mt-0 transition-transform duration-300">
              <div className={`w-full aspect-square rounded-[3rem] flex items-center justify-center mb-6 transition-all duration-500 group-hover:-translate-y-4 shadow-inner border-2 border-transparent group-hover:shadow-xl ${activeCatalogColor ? activeCatalogColor.cardBg : 'bg-gray-50'} ${activeCatalogColor ? activeCatalogColor.cardHover : 'group-hover:bg-gray-100'} ${activeCatalogColor ? activeCatalogColor.borderHover : 'group-hover:border-gray-300'}`}>
                
                <div className="relative w-3/4 h-3/4 transition-transform duration-500 group-hover:scale-110">
                  <img src="/tshirt_blanco_hombre.png" alt="Hombre" className="absolute inset-0 w-full h-full object-contain drop-shadow-md z-10" />
                  <div 
                    className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-90 transition-colors duration-500 z-20 ${activeCatalogColor ? activeCatalogColor.tint : 'bg-transparent'}`}
                    style={{ maskImage: `url(/tshirt_blanco_hombre.png)`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: `url(/tshirt_blanco_hombre.png)`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' }}
                  ></div>
                  {activeCatalogColor?.comingSoon && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/80 backdrop-blur-sm text-white font-bold text-[10px] md:text-xs uppercase tracking-widest py-1.5 px-3 md:py-2 md:px-4 rounded-full z-30 shadow-xl border border-gray-700 w-max rotate-[-10deg] animate-pulse">
                      Próximamente
                    </div>
                  )}
                </div>

              </div>
              <h4 className={`text-2xl font-bold text-gray-800 transition-colors duration-300 ${activeCatalogColor ? activeCatalogColor.textHover : 'group-hover:text-gray-900'}`}>Corte Hombre</h4>
            </div>
          </div>

          {/* SELECTOR GLOBAL DE VARIANTES (HOVER) */}
          <div className="flex flex-col items-center justify-center mb-16 relative z-30">
            <span className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4">Descubre los colores</span>
            <div className="flex flex-wrap gap-3 md:gap-4 p-2 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm relative justify-center" onMouseLeave={() => setHoveredColor(null)}>
              {catalogColors.map((color) => (
                <button
                  key={color.id}
                  className={`w-10 h-10 rounded-full transition-transform duration-300 focus:outline-none shadow-sm ${activeCatalogColor.id === color.id ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-110 hover:ring-2 hover:ring-offset-2 hover:ring-gray-400'}`}
                  style={{ backgroundColor: color.hex }}
                  onMouseEnter={() => setHoveredColor(color)}
                  title={color.name}
                  aria-label={`Ver en color ${color.name}`}
                ></button>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center relative z-30">
            <CreateOrderBtn />
          </div>

          {/* Preguntas Frecuentes - Landing Page Version */}
          <div className="mt-32 max-w-4xl mx-auto text-left relative z-30">
            <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-12 text-center">
              Preguntas <span className="text-pink-500">Frecuentes</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <h4 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm">01</span>
                  ¿Cuánto tarda el envío?
                </h4>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Realizamos envíos nacionales vía FedEx y DHL. El tiempo promedio de entrega es de 3 a 5 días hábiles. Todos los pedidos incluyen número de guía para rastreo en tiempo real.
                </p>
              </div>

              <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <h4 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">02</span>
                  ¿La tela es de calidad?
                </h4>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Totalmente. Usamos poliéster premium de 180g con acabado "Piel de Durazno". No se transparenta, es ultra suave y está diseñada específicamente para que los colores de sublimación queden vibrantes.
                </p>
              </div>

              <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <h4 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-sm">03</span>
                  ¿Manejan mayoreo?
                </h4>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Sí, somos fabricantes. El sistema aplica descuentos automáticos a partir de 50 piezas. Si necesitas más de 500 unidades, contáctanos por WhatsApp para un precio especial de distribuidor.
                </p>
              </div>

              <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <h4 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm">04</span>
                  ¿Garantía de cambio?
                </h4>
                <p className="text-gray-500 font-medium leading-relaxed">
                  En Creativity cuidamos cada costura. Si recibes una prenda con defecto de fábrica, solo envíanos una foto y procesamos el cambio o reposición en tu siguiente compra.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* OLA INFERIOR HACIA TESTIMONIOS */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden rotate-180 leading-[0] z-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[80px]">
            <path fill="#f9fafb" d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
          </svg>
        </div>
      </div>

    </div>
  );
};

export default StorytellingSection;
