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
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="GYM PLAY Mídia" style={{ height: '42px', width: 'auto' }} />
        </div>
        <h1 className="auth-title">Bem-vindo de volta</h1>
        <p className="auth-subtitle">Painel Administrativo</p>
        
        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '4px', padding: '10px' }} disabled={loading}>
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
