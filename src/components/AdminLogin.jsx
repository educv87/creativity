import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciales inválidas. Revisa tu correo y contraseña.');
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/admin',
    });

    if (error) {
      setError('Error al enviar el correo de recuperación: ' + error.message);
    } else {
      setMessage('Te hemos enviado un correo con las instrucciones para recuperar tu contraseña.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 selection:bg-blue-500/30">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black font-black text-3xl mb-4 shadow-2xl shadow-white/10">
            C
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">creativity.mx</h1>
          <p className="text-gray-500 font-medium text-sm mt-1 uppercase tracking-widest">Admin Access</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
          <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Correo Electrónico</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                placeholder="admin@creativity.com"
              />
            </div>
            
            {!isResetMode && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Contraseña</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsResetMode(true); setError(null); setMessage(null); }}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold p-3 rounded-xl text-center">
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin"></div>
              ) : (
                isResetMode ? 'Enviar Enlace de Recuperación' : 'Iniciar Sesión'
              )}
            </button>

            {isResetMode && (
              <button 
                type="button"
                onClick={() => { setIsResetMode(false); setError(null); setMessage(null); }}
                className="w-full text-center text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >
                Volver al inicio de sesión
              </button>
            )}
          </form>
        </div>

        <p className="text-center mt-8 text-gray-600 text-xs font-medium">
          Si no tienes cuenta, créala en tu panel de Supabase Auth.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
