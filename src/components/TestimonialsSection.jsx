import React, { useState, useEffect } from 'react';

const testimonials = [
  {
    name: "Eva Edith Echavarría",
    stars: 5,
    text: "Excelente atención en línea vía WhatsApp, vivo en Durango y me han resuelto dudas, pero sobretodo muy buena calidad en sus playeras y sudaderas, envíos rápidos, confiables y excelente empaque.",
    initials: "EE",
    color: "bg-sky-500",
    image: "https://i.pravatar.cc/150?u=eva"
  },
  {
    name: "Gerardo Garces Tapia",
    stars: 5,
    text: "Elaboran playeras de excelente calidad y tacto, sus colores son adecuadas para la sublimación ya que son de poliéster 100%. La atención y el seguimiento es de resaltar, sin duda lo recomiendo.",
    initials: "GG",
    color: "bg-pink-500"
  },
  {
    name: "Victor Johan Serrano",
    stars: 5,
    text: "Excelente servicio!! Me apoyaron mucho con mis dudas y necesidades, además de que me atendieron rápido.",
    initials: "VS",
    color: "bg-purple-500"
  },
  {
    name: "Ho Lk FV",
    stars: 5,
    text: "Excelente atención y servicio. Sus productos de alta calidad.",
    initials: "HL",
    color: "bg-indigo-500"
  },
  {
    name: "Deyanira Ruiz",
    stars: 5,
    text: "Excelente servicio y atención, muy recomendados.",
    initials: "DR",
    color: "bg-teal-500"
  }
];

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const displayTestimonials = [...testimonials, ...testimonials, ...testimonials];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getVisibleCards = () => {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  const visible = getVisibleCards();
  const cardWidth = 100 / visible;
  const centerOffset = (100 - cardWidth) / 2;

  return (
    <section className="py-24 bg-gray-50 overflow-hidden relative">

      <div className="max-w-7xl mx-auto px-6 pt-16 relative z-10">
        <div className="absolute top-40 -left-20 w-96 h-96 opacity-[0.03] pointer-events-none rotate-12">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#000000" d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,76.4,-44.7C83.6,-31.3,86.9,-15.7,85.2,-0.9C83.6,13.8,77.1,27.7,68.2,40.1C59.3,52.5,48.1,63.4,35,71.2C21.9,79.1,6.8,83.8,-8.3,82.4C-23.4,80.9,-38.5,73.4,-51,64.1C-63.5,54.8,-73.4,43.6,-79.8,30.6C-86.2,17.6,-89.1,2.8,-86.3,-11.3C-83.6,-25.3,-75.2,-38.6,-64.3,-48.6C-53.4,-58.6,-39.9,-65.3,-26.6,-72.5C-13.3,-79.7,0,-87.4,14,-85.4C28,-83.4,44.7,-76.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
        <div className="absolute bottom-20 -right-20 w-80 h-80 opacity-[0.03] pointer-events-none -rotate-12">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#000000" d="M38.1,-65.4C50.3,-58.1,61.7,-49,69.5,-37.2C77.3,-25.4,81.4,-11,79.7,2.9C78,16.8,70.5,30.2,60.8,40.7C51.1,51.2,39.1,58.8,26.4,64.4C13.7,70,0.3,73.6,-13.4,71.7C-27.1,69.8,-41.1,62.4,-52,51.9C-62.9,41.4,-70.7,27.8,-74.2,13.2C-77.7,-1.4,-76.9,-17.1,-70,-30.4C-63.1,-43.7,-50.2,-54.6,-36.8,-61.2C-23.4,-67.8,-9.6,-70.1,2.2,-74C14.1,-77.9,25.9,-72.7,38.1,-65.4Z" transform="translate(100 100)" />
          </svg>
        </div>

        <div className="text-center mb-16">
          <div className="flex justify-center text-yellow-400 mb-4">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            La voz de nuestros clientes.
          </h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
            Extraído directamente de <span className="text-blue-600">Google Reviews</span>
          </p>
        </div>

        <div className="relative px-4">
          <div 
            className="flex transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ 
              transform: `translateX(calc(${centerOffset}% - ${(activeIndex + testimonials.length) * cardWidth}%))` 
            }}
          >
            {displayTestimonials.map((t, i) => {
              const isActive = (i % testimonials.length) === activeIndex;
              
              return (
                <div 
                  key={i} 
                  style={{ width: `${cardWidth}%` }}
                  className="flex-shrink-0 px-3"
                >
                  <div className={`h-full p-7 rounded-[2rem] border transition-all duration-700 flex flex-col justify-between ${isActive ? `${t.color} text-white border-transparent shadow-xl scale-100 z-10` : 'bg-gray-50 text-gray-900 border-transparent scale-90 opacity-20'}`}>
                    <div>
                      <div className="text-2xl mb-3 opacity-20">"</div>
                      <p className={`text-sm md:text-base font-medium leading-relaxed mb-6 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                        {t.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[10px] overflow-hidden ${isActive ? 'bg-white/20 text-white backdrop-blur-md' : 'bg-white text-gray-400'}`}>
                        {t.image ? (
                          <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          t.initials
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-widest">{t.name}</h4>
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                          Comprador Verificado
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-2 mt-12">
            {testimonials.map((_, i) => (
              <button 
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${activeIndex === i ? 'w-8 bg-black' : 'w-2 bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <a 
            href="https://www.google.com/search?q=creativity+queretaro" 
            target="_blank" 
            rel="noreferrer"
            className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black transition-colors"
          >
            Ver todas las reseñas en Google →
          </a>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
