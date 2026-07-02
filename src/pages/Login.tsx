import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuthStore();
  const navigate = useNavigate();

  // Se já estiver logado, redireciona para o painel
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setError('Credenciais inválidas. Tente novamente.');
      setLoading(false);
    }
    // Se deu certo, o useEffect ali em cima vai perceber a mudança do 'user' e redirecionar
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ backgroundColor: '#000000', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <img 
            src="/logo.png" 
            alt="GYM PLAY Mídia" 
            style={{ 
              width: '200px', 
              height: 'auto'
            }} 
          />
        </div>
        <p className="auth-subtitle">Painel Administrativo</p>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">E-mail</label>
            <input 
              id="email"
              type="email" 
              className="input-field" 
              placeholder="adm@gymplay.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label className="input-label" htmlFor="password">Senha</label>
            <input 
              id="password"
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }} disabled={loading}>
            {loading ? <div className="loader"></div> : (
              <>
                <LogIn size={18} />
                Entrar no Painel
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
