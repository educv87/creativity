import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InteractiveShowcase from './components/InteractiveShowcase';
import StorytellingSection from './components/StorytellingSection';
import TestimonialsSection from './components/TestimonialsSection';
import CheckoutPage from './components/CheckoutPage';
import { fetchProjectData } from './lib/data';
import { trackEvent } from './lib/analytics';

const LandingPage = () => {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadColors = async () => {
      const data = await fetchProjectData();
      if (data && data.colores) {
        // Adapt format to what InteractiveShowcase expects
        const adaptedColors = data.colores.map(c => ({
          id: c.nombre.toLowerCase(),
          nombre: c.nombre,
          hex: c.tint_class, // InteractiveShowcase uses class for hex prop names in some places
          real_hex: c.hex
        }));
        setColors(adaptedColors);
      }
      setLoading(false);
      trackEvent('visita_landing');
    };
    loadColors();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Portada Inmersiva con Carrusel */}
      {colors.length > 0 && <InteractiveShowcase colors={colors} />}

      {/* Storytelling y Ventas B2B */}
      <StorytellingSection />

      {/* Reseñas de Clientes Reales */}
      <TestimonialsSection />
    </div>
  );
};

import { supabase } from './lib/supabase';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import SuccessPage from './components/SuccessPage';
import FeedbackWidget from './components/FeedbackWidget';
import PromotionBanner from './components/PromotionBanner';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CerebroDashboard from './components/CerebroDashboard';

function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/login?type=recovery';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <PromotionBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/crear-pedido" element={<CheckoutPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/pago-exitoso" element={<SuccessPage />} />
        <Route path="/admin-analitica" element={<AnalyticsDashboard />} />
        <Route path="/cerebro" element={<CerebroDashboard />} />
      </Routes>
      <FeedbackWidget />
    </Router>
  );
}




export default App;

