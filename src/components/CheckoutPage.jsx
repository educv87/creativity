import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProjectData } from '../lib/data';
import { getShippingQuotes } from '../lib/shipping';
import { processOrderAndPayment } from '../lib/payments';


const CheckoutPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({});
  const [colorOptions, setColorOptions] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeColorId, setActiveColorId] = useState(null);
  const [activeSize, setActiveSize] = useState(null);
  const [showSizeError, setShowSizeError] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [shippingOptions, setShippingOptions] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customer, setCustomer] = useState({
    nombre: '',
    email: '',
    telefono: '',
    calle_numero: '',
    colonia: '',
    ciudad: '',
    estado: '',
    cp: ''
  });
  const [debugMsg, setDebugMsg] = useState('');
  const [coloniasDisponibles, setColoniasDisponibles] = useState([]);
  const [isFetchingZip, setIsFetchingZip] = useState(false);

  const totalPieces = cart.reduce((acc, item) => acc + Number(item.quantity), 0);

  // Invalidar cotización de envío si cambia la cantidad total de playeras
  useEffect(() => {
    setShippingOptions(null);
    setSelectedShipping(null);
  }, [totalPieces]);




  useEffect(() => {
    const loadData = async () => {
      const data = await fetchProjectData();
      if (data) {
        setInventory(data.inventario || []);
        
        // Transform Colors
        const colorsObj = {};
        data.colores.forEach(c => {
          colorsObj[c.id] = { id: c.id, name: c.nombre, hex: c.hex, tint: c.tint_class };
        });

        // Transform Categories
        const catsObj = {};
        data.cortes.forEach(c => {
          const relatedColorIds = data.relations
            .filter(r => r.corte_id === c.id)
            .map(r => r.color_id);
          
          catsObj[c.id] = {
            id: c.id,
            name: c.nombre,
            image: c.imagen_url,
            colors: relatedColorIds,
            sizes: ['CH', 'M', 'G', 'XL', 'XXL'] 
          };
        });

        setColorOptions(colorsObj);
        setCategories(catsObj);
        
        const firstCatId = data.cortes[0]?.id;
        setActiveCategory(firstCatId);
        
        const firstColorId = data.relations.find(r => r.corte_id === firstCatId)?.color_id;
        setActiveColorId(firstColorId);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    const fetchZipInfo = async () => {
      if (customer.cp && customer.cp.trim().length === 5) {
        setIsFetchingZip(true);
        setDebugMsg('Buscando información del Código Postal...');
        try {
          const res = await fetch(`https://api.zippopotam.us/mx/${customer.cp}`);
          if (res.ok) {
            const data = await res.json();
            const places = data.places || [];
            if (places.length > 0) {
              const state = places[0].state || '';
              const placeNames = places.map(p => p['place name']);
              
              setColoniasDisponibles(placeNames);
              setCustomer(prev => ({
                ...prev,
                estado: state,
                colonia: placeNames.length === 1 ? placeNames[0] : ''
              }));
              setDebugMsg('Código Postal encontrado. Selecciona tu colonia.');
            } else {
              setColoniasDisponibles([]);
              setDebugMsg('El Código Postal no devolvió colonias.');
            }
          } else {
            setColoniasDisponibles([]);
            setDebugMsg(''); // Si no se encuentra, dejamos que el usuario lo llene manualmente
          }
        } catch (error) {
          console.error(error);
          setColoniasDisponibles([]);
          setDebugMsg('');
        } finally {
          setIsFetchingZip(false);
        }
      } else {
        setColoniasDisponibles([]);
      }
    };
    
    // Solo disparar cuando cambia el CP, independientemente de isQuoting
    fetchZipInfo();
  }, [customer.cp]);

  if (loading || !activeCategory) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-gray-900 uppercase tracking-widest text-xs">Cargando Catálogo Real...</p>
        </div>
      </div>
    );
  }

  const categoryData = categories[activeCategory];
  const activeColor = colorOptions[activeColorId];

  let medidasImg = '/tallas_caballero.jpg';
  if (categoryData?.name.toLowerCase().includes('mujer') || categoryData?.name.toLowerCase().includes('dama')) {
    medidasImg = '/tallas_dama.jpg';
  } else if (categoryData?.name.toLowerCase().includes('infantil') || categoryData?.name.toLowerCase().includes('niño')) {
    medidasImg = '/tallas_infantil.jpg';
  }

  const galleryImages = [
    { id: 'tshirt', name: 'Vista General', icon: '👕' },
    { id: 'video', name: 'Video Real', icon: '▶️', isVideo: true, videoId: 'TF5nBZMDSMw' },
    { id: 'costura', name: 'Alta Costura', image: '/attr_costura.jpg', icon: '🪡', needsTint: true },
    { id: 'suavidad', name: 'Suavidad', image: '/attr_suavidad.jpg', icon: '🍑', needsTint: true },
    { id: 'medidas', name: 'Tabla de Medidas', image: medidasImg, icon: '📏' },
  ];

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    const newCatData = categories[catId];
    if (!newCatData.colors.includes(activeColorId)) {
      setActiveColorId(newCatData.colors[0]);
    }
  };

  // Find real price from inventory
  const variant = inventory.find(i => 
    i.corte_id === activeCategory && 
    i.color_id === activeColorId && 
    (activeSize ? i.talla === activeSize : true) // Si no hay talla seleccionada, usa la primera variante que encuentre
  );

  const potentialTotal = totalPieces + (Number(quantity) || 0);

  const getTieredPrice = (qty) => {
    const total = Number(qty);
    // Oferta de Lanzamiento: Si el cupón está activo y lleva 50+, dar precio de $69
    if (isPromoApplied && total >= 50) return 69;
    
    if (total >= 100) return 69;
    if (total >= 50) return 79;
    return 89;
  };

  const pricePerUnit = getTieredPrice(potentialTotal);
  const basePrice = pricePerUnit;
  const totalPrice = pricePerUnit * (Number(quantity) || 0);
  
  const hasFreeShipping = isPromoApplied && potentialTotal >= 50;

  // Calculate real stock
  const totalColorStock = inventory
    .filter(i => i.corte_id === activeCategory && i.color_id === activeColorId)
    .reduce((acc, curr) => acc + curr.stock, 0);
  const displayStock = (activeSize && variant) ? variant.stock : totalColorStock;
  const alreadyInCartForActive = cart
    .filter(item => item.inventoryId === variant?.id)
    .reduce((acc, item) => acc + item.quantity, 0);



  const handleAddToCart = () => {
    if (!activeSize || !variant) {
      setShowSizeError(true);
      setTimeout(() => setShowSizeError(false), 3000);
      return;
    }

    // Calcular cuánto ya hay en el carrito de ESTA misma variante
    const alreadyInCart = cart
      .filter(item => item.inventoryId === variant.id)
      .reduce((acc, item) => acc + item.quantity, 0);

    if (quantity + alreadyInCart > variant.stock) {
      const disponible = variant.stock - alreadyInCart;
      if (disponible <= 0) {
        alert(`Ya tienes todas las piezas disponibles (${variant.stock}) de esta talla en tu pedido.`);
      } else {
        alert(`Lo sentimos, solo puedes agregar ${disponible} piezas más de esta variante (Stock total: ${variant.stock}).`);
      }
      return;
    }
    
    setShowSizeError(false);
    
    // Buscar si ya existe el producto exacto en el carrito para combinarlo
    const existingItemIndex = cart.findIndex(item => 
      item.inventoryId === variant.id
    );

    if (existingItemIndex > -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += quantity;
      setCart(newCart);
    } else {
      const newItem = {
        id: Date.now().toString() + Math.random(),
        inventoryId: variant.id,
        category: categoryData.name,
        color: activeColor.name,
        colorHex: activeColor.hex,
        size: activeSize,
        quantity,
        originalPrice: 89,
        discount: 0
      };
      setCart([...cart, newItem]);
    }

    setQuantity(1);
    setActiveSize(null);
  };

  const updateCartQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const v = inventory.find(inv => inv.id === item.inventoryId);
    if (v && newQuantity > v.stock) {
      alert(`Lo sentimos, el stock máximo para esta variante es de ${v.stock} piezas.`);
      return;
    }

    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTierPrice = getTieredPrice(totalPieces);
  const subtotalCart = cart.reduce((acc, item) => acc + (cartTierPrice * Number(item.quantity)), 0);
  const finalTotal = subtotalCart;

  const handleCpChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
    setCustomer(prev => ({ ...prev, cp: val, colonia: '', estado: '', ciudad: '' }));
  };


  const handleQuoteShipping = async () => {
    setDebugMsg('Validando datos...');
    
    // Validación Rigurosa
    if (!customer.cp || customer.cp.trim().length !== 5) {
      setDebugMsg('Error: El Código Postal debe tener exactamente 5 dígitos.');
      return;
    }
    if (!customer.nombre || customer.nombre.trim().length < 3) {
      setDebugMsg('Error: El Nombre Completo es obligatorio.');
      return;
    }
    if (!customer.calle_numero || customer.calle_numero.trim().length < 5) {
      setDebugMsg('Error: La Calle y Número son obligatorios.');
      return;
    }
    if (!customer.colonia) {
      setDebugMsg('Error: Por favor selecciona tu Colonia.');
      return;
    }
    if (!customer.email || !customer.email.includes('@')) {
      setDebugMsg('Error: Ingresa un Correo Electrónico válido.');
      return;
    }
    if (!customer.telefono || customer.telefono.trim().length < 10) {
      setDebugMsg('Error: Ingresa un Teléfono válido a 10 dígitos.');
      return;
    }

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setDebugMsg('Error crítico: Faltan credenciales de Supabase en Vercel.');
      return;
    }

    setIsQuoting(true);
    setDebugMsg('Enviando paquete de datos estructurados a Skydropx...');
    
    try {
      const result = await getShippingQuotes(customer.cp, totalPieces);
      setDebugMsg(`Respuesta de Servidor: ${result.success ? 'Exitosa' : 'Fallida'}`);

      if (result.success) {
        if (result.options && result.options.length > 0) {
          setShippingOptions(result.options);
          setDebugMsg(''); // Limpiar si es exitoso
        } else {
          setDebugMsg('Alerta: No se encontraron paqueterías para este CP.');
        }
      } else {
        setDebugMsg(`Error del servidor: ${result.message}`);
      }
    } catch (err) {
      setDebugMsg(`Crash detectado: ${err.message}`);
    } finally {
      setIsQuoting(false);
    }
  };


  const handlePayment = async () => {
    if (!customer.nombre || !customer.email || !customer.calle_numero || !customer.colonia || !customer.cp) {
      alert('Por favor completa tus datos de envío (Nombre, Calle, Colonia y CP son obligatorios).');
      return;
    }

    const fullDireccion = `${customer.calle_numero}, ${customer.colonia}, ${customer.ciudad}, ${customer.estado}`;
    
    const orderData = {
      ...customer,
      direccion: fullDireccion,
      items: cart.map(item => ({
        ...item,
        price: cartTierPrice
      })),
      subtotal: finalTotal,
      envio: selectedShipping ? selectedShipping.price : 0,
      total: finalTotal + (selectedShipping ? selectedShipping.price : 0)
    };

    try {
      await processOrderAndPayment(orderData);
    } catch (err) {
      alert("Hubo un error al iniciar el pago: " + err.message);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden font-sans">
      
      {/* Navbar Simple */}
      <nav className="w-full bg-white px-6 py-4 flex items-center justify-between shadow-sm relative z-40">
        <div className="flex items-center gap-2">
          <img src="/Logo_CREATIVITY_web-13.png" alt="Creativity Logo" className="h-10 w-auto" />
        </div>
        <button onClick={() => navigate('/')} className="text-sm font-bold text-gray-500 hover:text-gray-900">Volver al inicio</button>
      </nav>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative z-10 min-h-[calc(100vh-72px)] lg:pt-10">
        
        {/* Lado Izquierdo: Visualizador Dinámico y Galería */}
        <div className="flex flex-col gap-4 w-full">
          <div className="relative w-full aspect-square bg-gray-100 rounded-[3rem] shadow-inner flex items-center justify-center p-6 lg:p-12 overflow-hidden">
            
            {/* Fondo Orgánico */}
            <div className={`absolute inset-0 organic-blob opacity-40 blur-3xl transition-colors duration-700 ${activeColor.tint}`}></div>

            {activeGalleryIndex === 0 ? (
              <div className="relative w-full h-full max-w-md mx-auto z-20 drop-shadow-2xl transition-transform duration-500 hover:scale-105">
                <img 
                  src={categoryData.image} 
                  alt={categoryData.name} 
                  className="absolute inset-0 w-full h-full object-contain z-10" 
                />
                {/* Tinte de Color */}
                <div 
                  className={`absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-90 transition-colors duration-500 z-20 ${activeColor.tint}`}
                  style={{ 
                    maskImage: `url(${categoryData.image})`, 
                    maskSize: 'contain', 
                    maskRepeat: 'no-repeat', 
                    maskPosition: 'center', 
                    WebkitMaskImage: `url(${categoryData.image})`, 
                    WebkitMaskSize: 'contain', 
                    WebkitMaskRepeat: 'no-repeat', 
                    WebkitMaskPosition: 'center' 
                  }}
                ></div>
              </div>
            ) : galleryImages[activeGalleryIndex].isVideo ? (
              <div className="relative w-full h-full z-20 flex items-center justify-center rounded-[2rem] overflow-hidden drop-shadow-xl bg-black">
                <iframe 
                  className="w-full h-full border-0"
                  src={`https://www.youtube.com/embed/${galleryImages[activeGalleryIndex].videoId}?autoplay=1&mute=1&loop=1&playlist=${galleryImages[activeGalleryIndex].videoId}`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="relative w-full h-full z-20 transition-transform duration-500 hover:scale-105 flex items-center justify-center rounded-[2rem] overflow-hidden drop-shadow-xl">
                <img 
                  src={galleryImages[activeGalleryIndex].image} 
                  alt={galleryImages[activeGalleryIndex].name} 
                  className={`w-full h-full object-cover rounded-[2rem] ${galleryImages[activeGalleryIndex].needsTint ? 'grayscale contrast-125 brightness-110' : ''}`} 
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = `https://placehold.co/600x600/f3f4f6/a1a1aa?text=${encodeURIComponent(galleryImages[activeGalleryIndex].name)}`;
                  }}
                />
                {/* Capa de Tinte Dinámico para las texturas de la galería */}
                {galleryImages[activeGalleryIndex].needsTint && (
                  <div className={`absolute inset-0 w-full h-full mix-blend-color opacity-100 transition-colors duration-500 rounded-[2rem] ${activeColor.tint}`}></div>
                )}
              </div>
            )}
          </div>

          {/* Miniaturas de Galería */}
          <div className="flex gap-3 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {galleryImages.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveGalleryIndex(index)}
                className={`snap-start flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 overflow-hidden relative transition-all duration-300 bg-white ${activeGalleryIndex === index ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2 scale-105' : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'}`}
              >
                {index === 0 ? (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center p-2">
                    <div className="relative w-full h-full">
                      <img src={categoryData.image} alt="Tshirt" className="absolute inset-0 w-full h-full object-contain scale-[1.5] mt-2" />
                      <div className={`absolute inset-0 w-full h-full mix-blend-multiply opacity-90 scale-[1.5] mt-2 ${activeColor.tint}`} 
                           style={{ maskImage: `url(${categoryData.image})`, maskSize: 'contain', maskPosition: 'center', maskRepeat: 'no-repeat', WebkitMaskImage: `url(${categoryData.image})`, WebkitMaskSize: 'contain', WebkitMaskPosition: 'center', WebkitMaskRepeat: 'no-repeat' }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center relative group">
                    <img 
                      src={item.isVideo ? `https://img.youtube.com/vi/${item.videoId}/0.jpg` : item.image} 
                      alt={item.name} 
                      className={`w-full h-full object-cover ${item.needsTint ? 'grayscale contrast-125 brightness-110' : ''}`} 
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = `https://placehold.co/150x150/f3f4f6/a1a1aa?text=${encodeURIComponent(item.icon)}`;
                      }}
                    />
                    {(item.needsTint || item.isVideo) && (
                      <div className={`absolute inset-0 w-full h-full mix-blend-color opacity-100 ${item.isVideo ? 'bg-black/20' : activeColor.tint}`}></div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <span className={`${item.isVideo ? 'text-3xl text-white' : 'text-2xl'} drop-shadow-md`}>{item.icon}</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lado Derecho: Configurador */}
        <div className="flex flex-col gap-4 md:gap-5">
          <div>
            <h1 className="text-2xl md:text-4xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3">Configura tu Pedido</h1>
            
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-bold text-gray-900">Playeras 100% poliéster</span> recomendada para una sublimación de alta calidad. En <span className="text-gray-900 font-black">Creativity</span> cuidamos la calidad de nuestras telas y las costuras para que puedas entregar un producto creativo, duradero y usable a tus clientes.
              </p>
            </div>
          </div>

          {/* 1. Corte */}
          <div>
            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">1. Elige el Corte</h3>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {Object.values(categories).map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`py-2 px-2 rounded-xl font-bold text-sm md:text-sm border-2 transition-all duration-300 ${activeCategory === cat.id ? 'border-gray-900 bg-gray-900 text-white shadow-md scale-105' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}`}
                >
                  {cat.name.replace('Corte ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Color */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase">2. Elige el Color</h3>
              {activeColor.name.toLowerCase().includes('negro') && (
                <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-yellow-200 animate-pulse">
                  Recomendada para DTF y Vinil Textil
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {categoryData.colors.map((colorId) => {
                const color = colorOptions[colorId];
                return (
                  <button
                    key={color.id}
                    onClick={() => setActiveColorId(color.id)}
                    className={`w-10 h-10 md:w-10 md:h-10 rounded-full border border-gray-200 shadow-sm transition-transform duration-300 ${activeColorId === color.id ? 'ring-2 ring-offset-4 ring-gray-900 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  ></button>
                );
              })}
            </div>
          </div>

          {/* 3. Talla */}
          <div className={`transition-all duration-300 ${showSizeError ? 'bg-red-50 p-4 -mx-4 rounded-2xl border border-red-200' : ''}`}>
            <h3 className={`text-xs font-bold tracking-widest uppercase mb-3 ${showSizeError ? 'text-red-500' : 'text-gray-400'}`}>
              3. Elige la Talla {showSizeError && <span className="text-red-500 animate-pulse ml-1">*Requerido</span>}
            </h3>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {categoryData.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setActiveSize(size);
                    if (showSizeError) setShowSizeError(false);
                  }}
                  className={`w-10 h-10 md:w-10 md:h-10 rounded-xl font-bold text-xs md:text-sm border-2 transition-all duration-300 flex items-center justify-center ${activeSize === size ? 'border-gray-900 bg-gray-900 text-white shadow-md scale-110' : (showSizeError ? 'border-red-300 bg-white text-red-500 hover:border-red-400' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400')}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Cantidad */}
          <div>
            <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">4. Cantidad</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  className="px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-black text-base transition-colors"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >-</button>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value);
                    setQuantity(val);
                  }}
                  onBlur={() => {
                    if (quantity === '' || quantity < 1) setQuantity(1);
                  }}
                  className="w-16 text-center font-bold text-gray-900 border-x-2 border-gray-100 py-2 focus:outline-none focus:bg-gray-50 text-sm cursor-text"
                  min="1"
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
                <button 
                  className="px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-black text-base transition-colors"
                  onClick={() => setQuantity(quantity + 1)}
                >+</button>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stock Disponible</span>
                  {activeSize && displayStock > 0 && displayStock <= 20 && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black animate-pulse">
                      ¡POCAS UNIDADES!
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-600 flex flex-col mt-0.5">
                  <div className="flex items-center gap-1.5">
                    {activeSize ? (
                      <>
                        <span className={`w-2 h-2 rounded-full ${displayStock - alreadyInCartForActive > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <span className={displayStock - alreadyInCartForActive > 0 ? 'text-green-600 font-black' : 'text-red-500 font-bold'}>
                          {displayStock - alreadyInCartForActive > 0 
                            ? `${displayStock - alreadyInCartForActive} piezas disponibles` 
                            : (alreadyInCartForActive >= displayStock ? 'Ya agregaste todo el stock' : 'Agotado en esta talla')}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Selecciona una talla para ver stock</span>
                    )}
                  </div>
                  {new Date().getHours() < 14 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                      <p className="text-[9px] font-bold text-green-600 uppercase tracking-tight">Listo para envío hoy</p>
                    </div>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Escala de Precios Visual */}
          <div className="mb-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Escala de Precios</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-2 rounded-xl border-2 text-center transition-all duration-300 ${potentialTotal < 50 ? 'border-gray-900 bg-white shadow-md' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <p className="text-[9px] font-bold text-gray-400 uppercase">1 - 49</p>
                <p className={`text-lg font-black ${potentialTotal < 50 ? 'text-gray-900' : 'text-gray-400'}`}>$89</p>
              </div>
              <div className={`p-2 rounded-xl border-2 text-center transition-all duration-300 ${potentialTotal >= 50 && potentialTotal < 100 ? 'border-pink-500 bg-white shadow-md' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <p className="text-[9px] font-bold text-gray-400 uppercase">50 - 99</p>
                <p className={`text-lg font-black ${potentialTotal >= 50 && potentialTotal < 100 ? 'text-pink-500' : 'text-gray-400'}`}>$79</p>
              </div>
              <div className={`p-2 rounded-xl border-2 text-center transition-all duration-300 ${potentialTotal >= 100 ? 'border-teal-500 bg-white shadow-md' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <p className="text-[9px] font-bold text-gray-400 uppercase">100+</p>
                <p className={`text-lg font-black ${potentialTotal >= 100 ? 'text-teal-500' : 'text-gray-400'}`}>$69</p>
              </div>
            </div>
            
            {/* Indicador de siguiente nivel */}
            {potentialTotal < 100 && (
              <div className="mt-3 bg-white rounded-lg p-2 border border-gray-100 flex items-center justify-between">
                <p className="text-[10px] font-medium text-gray-500 italic">
                  {potentialTotal < 50 
                    ? `¡Agrega ${50 - potentialTotal} más para bajar a $79!` 
                    : `¡Agrega ${100 - potentialTotal} más para bajar a $69!`}
                </p>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 transition-all duration-500" 
                    style={{ width: `${potentialTotal < 50 ? (potentialTotal / 50) * 100 : ((potentialTotal - 50) / 50) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Total y CTA */}
          <div className="bg-gray-100 rounded-2xl p-4 md:p-5 mt-1 border border-gray-200">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Subtotal de variante</p>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-black text-gray-900">${totalPrice.toLocaleString()}<span className="text-base text-gray-400">.00 MXN</span></div>
                  <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                    ${basePrice} c/u
                  </span>
                  {hasFreeShipping && (
                    <span className="ml-2 bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border border-teal-200 animate-bounce">
                      🚛 Envío Gratis
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cupón de Descuento */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Código de cupón"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-purple-400 uppercase"
                />
                <button 
                  onClick={() => {
                    if (promoCode === 'CREATIVITY25') {
                      setIsPromoApplied(true);
                    } else {
                      alert('Código no válido');
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPromoApplied ? 'bg-teal-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                >
                  {isPromoApplied ? 'Aplicado' : 'Aplicar'}
                </button>
              </div>
              {isPromoApplied && (
                <p className="text-[9px] text-teal-600 font-bold mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Oferta de Lanzamiento Activada
                </p>
              )}
            </div>

            <button 
              className="w-full bg-green-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-400 hover:-translate-y-1 transition-all duration-300 shadow-sm group flex items-center justify-center gap-2"
              onClick={handleAddToCart}
            >
              Agregar al pedido
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <p className="text-center text-gray-500 font-medium text-[10px] mt-2">
              Agrega más de <strong className="text-gray-700">50 piezas</strong> y obtén un descuento automático.
            </p>

            {/* Trust Badges */}
            <div className="mt-5 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap justify-center gap-4 opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-500">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 w-auto" />
                <div className="h-5 w-[1px] bg-gray-300 mx-1"></div>
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/FedEx_logo.svg" alt="FedEx" className="h-3 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b9/DHL_Logo.svg" alt="DHL" className="h-3 w-auto" />
              </div>
              <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest mt-3 flex items-center justify-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Transacción Segura y Encriptada
              </p>
            </div>

            </div>
            
            {cart.length > 0 && (
              <button 
                onClick={() => document.getElementById('order-summary')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex flex-col items-center justify-center mt-5 text-green-500 animate-bounce w-full hover:text-green-600 transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-black uppercase tracking-widest mb-1">Revisar Pedido</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            )}
          </div>
        </div>

      {/* Tabla Dinámica del Pedido (Constructor B2B) */}
      {cart.length > 0 && (
        <div id="order-summary" className="w-full bg-white border-t border-gray-200 py-12 md:py-20 relative z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">Tu Pedido</h2>
            <p className="text-gray-500 font-medium mb-8">El precio unitario mejora automáticamente al aumentar el volumen total.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-gray-400 text-xs md:text-sm tracking-widest uppercase">
                    <th className="py-4 px-4 font-bold">Producto</th>
                    <th className="py-4 px-4 font-bold text-center">Cantidad</th>
                    <th className="py-4 px-4 font-bold text-right hidden sm:table-cell">Precio Un.</th>
                    <th className="py-4 px-4 font-bold text-right">Subtotal</th>
                    <th className="py-4 px-4 font-bold text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-200 shadow-sm flex-shrink-0" style={{ backgroundColor: item.colorHex }}></div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm md:text-base">{item.category}</p>
                            <p className="text-xs md:text-sm text-gray-500">{item.color} <span className="mx-1">•</span> Talla <span className="font-bold text-gray-900">{item.size}</span></p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <button className="px-2 md:px-3 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</button>
                            <input 
                              type="number" 
                              value={item.quantity} 
                              onChange={(e) => {
                                const val = e.target.value === '' ? 1 : parseInt(e.target.value);
                                updateCartQuantity(item.id, isNaN(val) ? 1 : val);
                              }}
                              className="w-14 md:w-16 text-center font-bold text-gray-900 border-x border-gray-100 py-1 focus:outline-none focus:bg-gray-50 cursor-text"
                              min="1"
                              pattern="[0-9]*"
                              inputMode="numeric"
                            />
                            <button className="px-2 md:px-3 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-gray-600 hidden sm:table-cell">
                        {cartTierPrice < 89 && (
                          <span className="block text-[10px] line-through opacity-50">$89.00</span>
                        )}
                        ${cartTierPrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-gray-900">${(cartTierPrice * item.quantity).toFixed(2)}</td>
                      <td className="py-4 px-4 text-center">
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" title="Eliminar fila">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Block */}
            <div className="mt-8 flex flex-col lg:flex-row justify-end items-end lg:items-center gap-6 lg:gap-8 bg-gray-50 p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-inner">
              <div className="text-right w-full lg:w-auto">
                <div className="flex justify-between lg:justify-end gap-4 text-gray-500 font-medium mb-2">
                  <span>Piezas totales:</span>
                  <span className="text-gray-900 font-bold">{totalPieces} pz</span>
                </div>
                <div className="flex justify-between lg:justify-end gap-4 text-gray-500 font-medium mb-2">
                  <span>Subtotal:</span>
                  <span className="text-gray-900 font-bold">${subtotalCart.toLocaleString()}</span>
                </div>
                <div className="w-full h-px bg-gray-200 my-4"></div>
                <div className="flex justify-between lg:justify-end items-end gap-8">
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-widest pb-1">Total Final</div>
                  <div className="text-4xl md:text-5xl font-black text-gray-900">${finalTotal.toLocaleString()} <span className="text-xl text-gray-400">MXN</span></div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowShippingForm(true);
                  setTimeout(() => document.getElementById('shipping-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="w-full lg:w-auto bg-gray-900 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-blue-600 hover:-translate-y-1 transition-all duration-300 shadow-xl mt-4 lg:mt-0 flex items-center justify-center gap-2"
              >
                Cotizar envío
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </button>
            </div>

            {/* Formulario de Envío (Skydropx) */}
            {showShippingForm && (
              <div id="shipping-form" className="mt-8 bg-white border border-gray-200 rounded-[2rem] p-6 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-500">
                <div className="mb-8 border-b border-gray-100 pb-6">
                  <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    Datos de Envío
                  </h3>
                  <p className="text-gray-500 font-medium ml-13">Ingresa tus datos para calcular el costo con Skydropx.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={customer.nombre}
                      onChange={(e) => setCustomer({...customer, nombre: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                      placeholder="Ej. Juan Pérez" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase text-blue-500">Código Postal *</label>
                    <input 
                      type="text" 
                      value={customer.cp}
                      onChange={handleCpChange}
                      className="w-full bg-gray-50 border-2 border-blue-100 rounded-xl px-4 py-3 font-black text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                      placeholder="Ej. 76000" 
                      maxLength="5"
                    />
                    {isFetchingZip && <p className="text-xs text-blue-500 font-bold">Buscando CP...</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Calle y Número</label>
                    <input 
                      type="text" 
                      value={customer.calle_numero}
                      onChange={(e) => setCustomer({...customer, calle_numero: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                      placeholder="Ej. Av. Constituyentes 123" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Colonia</label>
                    {coloniasDisponibles.length > 0 ? (
                      <select
                        value={customer.colonia}
                        onChange={(e) => setCustomer({...customer, colonia: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors appearance-none"
                      >
                        <option value="">Selecciona tu colonia</option>
                        {coloniasDisponibles.map((col, idx) => (
                          <option key={idx} value={col}>{col}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={customer.colonia}
                        onChange={(e) => setCustomer({...customer, colonia: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                        placeholder="Ej. Centro" 
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Ciudad</label>
                    <input 
                      type="text" 
                      value={customer.ciudad}
                      onChange={(e) => setCustomer({...customer, ciudad: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                      placeholder="Ej. Querétaro" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Estado</label>
                    <input 
                      type="text" 
                      value={customer.estado}
                      onChange={(e) => setCustomer({...customer, estado: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                      placeholder="Ej. Querétaro" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Teléfono</label>
                    <input 
                      type="tel" 
                      value={customer.telefono}
                      onChange={(e) => setCustomer({...customer, telefono: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                      placeholder="A 10 dígitos" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={customer.email}
                      onChange={(e) => setCustomer({...customer, email: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                      placeholder="tu@correo.com" 
                    />
                  </div>
                </div>

                <div 
                  className="mt-8 pt-6 border-t border-gray-100 flex flex-col justify-end items-end gap-4"
                >
                  {debugMsg && (
                    <div className="w-full bg-yellow-100 text-yellow-800 p-4 rounded-xl font-bold border border-yellow-300">
                      Estado del sistema: {debugMsg}
                    </div>
                  )}
                  {!shippingOptions ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleQuoteShipping();
                        }}
                        disabled={isQuoting}
                        className="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-xl font-black text-lg hover:bg-blue-500 hover:-translate-y-1 transition-all duration-300 shadow-[0_15px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none relative z-50 cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                      >
                        {isQuoting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Calculando...
                          </>
                        ) : (
                          <>
                            Generar Cotización Ahora
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          </>
                        )}
                      </button>
                  ) : (
                    <div className="w-full animate-fade-in-up">
                      <h4 className="text-xl font-black text-gray-900 mb-4">Selecciona tu Paquetería</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {shippingOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedShipping(opt)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 ${selectedShipping?.id === opt.id ? 'border-blue-500 bg-blue-50 shadow-md scale-105' : 'border-gray-100 bg-white hover:border-blue-300'}`}
                          >
                            <div className="text-2xl mb-2">{opt.logo}</div>
                            <h5 className="font-bold text-gray-900">{opt.name}</h5>
                            <p className="text-xs text-gray-500 mb-2">{opt.time}</p>
                            <div className="font-black text-blue-600 text-lg">${opt.price.toFixed(2)}</div>
                          </button>
                        ))}
                      </div>

                      {selectedShipping && (
                        <div className="mt-8 bg-white border-2 border-gray-100 rounded-[2rem] p-6 md:p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] text-gray-900 animate-fade-in-up">
                          <h4 className="text-2xl font-black mb-6 flex items-center gap-2">
                            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Resumen Final
                          </h4>
                          
                          <div className="space-y-4 mb-6 text-gray-600">
                            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                              <span className="font-medium">Monto del pedido</span>
                              <span className="font-bold text-gray-900">${finalTotal.toLocaleString()} MXN</span>
                            </div>
                            <div className="flex flex-col pb-4 border-b border-gray-100">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Envío ({selectedShipping.name})</span>
                                <span className="font-bold text-gray-900">${selectedShipping.price.toFixed(2)} MXN</span>
                              </div>
                              <span className="text-xs text-blue-500 font-medium mt-1">Tiempo estimado de entrega: 3 a 7 días</span>
                            </div>
                            <div className="flex justify-between items-end pt-2">
                              <span className="text-sm font-bold tracking-widest uppercase text-gray-400">Total a Pagar</span>
                              <span className="text-4xl md:text-5xl font-black text-gray-900">${(finalTotal + selectedShipping.price).toLocaleString()} <span className="text-xl text-gray-400">MXN</span></span>
                            </div>
                          </div>

                          <button 
                            onClick={handlePayment}
                            className="w-full bg-[#009EE3] text-white px-8 py-5 rounded-xl font-black text-xl hover:bg-[#008CDB] hover:-translate-y-1 transition-all duration-300 shadow-[0_15px_30px_rgba(0,158,227,0.3)] flex items-center justify-center gap-3"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                              <path d="M14.656 18.599c-.642 0-1.282-.128-1.921-.384L5.64 15.65c-1.152-.426-1.536-1.921-1.025-2.946l2.947-5.892c.384-.768 1.152-1.281 2.05-1.281h5.892c1.281 0 2.306 1.025 2.306 2.306v6.404c0 .897-.513 1.666-1.282 2.051l-1.874.937v1.365z" />
                              <path fill="#fff" d="M13.633 13.606c-.854 0-1.537-.683-1.537-1.537s.683-1.537 1.537-1.537 1.537.683 1.537 1.537-.683 1.537-1.537 1.537zm-3.074 0c-.854 0-1.537-.683-1.537-1.537s.683-1.537 1.537-1.537 1.537.683 1.537 1.537-.683 1.537-1.537 1.537z" />
                            </svg>
                            Elegir método de pago con MercadoPago
                          </button>
                          <p className="text-center text-xs font-medium text-gray-400 mt-4 flex items-center justify-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Tus pagos están encriptados y seguros.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CheckoutPage;
