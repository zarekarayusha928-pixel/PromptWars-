import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, ArrowRight, CheckCircle2, Wifi } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BrandLogo from '../components/common/BrandLogo';

export default function AuthPage({ isSignUp = false }) {
  const [activeTab, setActiveTab] = useState(isSignUp ? 'signup' : 'login');
  const [email, setEmail] = useState('priya.sharma@demo.saheli.health');
  const [password, setPassword] = useState('demo-password-123');
  const [name, setName] = useState('Priya Sharma');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast, loginUser, signupUser, isBackendConnected } = useApp();
  const navigate = useNavigate();

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'signup' && !name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!email.trim() || !password.trim()) {
      showToast('Please enter email and password', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      if (activeTab === 'signup') {
        result = await signupUser(name, email, password);
      } else {
        result = await loginUser(email, password);
      }

      if (result.success) {
        navigate('/dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header 
        style={{ 
          padding: '1.25rem 2rem', 
          borderBottom: '1px solid var(--border-card)', 
          backgroundColor: 'var(--bg-card)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <BrandLogo to="/" size="md" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isBackendConnected && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-sage, #2E7D52)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Backend API Online
            </span>
          )}
          <Link to="/dashboard" className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
            Skip to Dashboard →
          </Link>
        </div>
      </header>

      {/* Main Centered Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem' }}>
        <div style={{ maxWidth: '460px', width: '100%' }}>
          <div className="saheli-card" style={{ padding: '2.25rem 2rem' }}>
            {/* Tabs */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '0.5rem', 
                backgroundColor: 'var(--bg-secondary)', 
                padding: '4px', 
                borderRadius: 'var(--radius-full)', 
                marginBottom: '1.5rem' 
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                style={{
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: activeTab === 'login' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'login' ? 'var(--color-berry)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'login' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                style={{
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: activeTab === 'signup' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'signup' ? 'var(--color-berry)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'signup' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Create Account
              </button>
            </div>

            {/* Heading and Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.55rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.25 }}>
                {activeTab === 'login' ? 'Welcome Back to Saheli' : 'Begin Your Symptom Diary'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {activeTab === 'login' 
                  ? 'Access your cycle logs, pattern insights, and doctor briefing.'
                  : 'Start tracking daily symptoms to bridge the conversation with your clinician.'}
              </p>
            </div>

            {/* Standard Form */}
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {activeTab === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.75rem 0.7rem 2.25rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-card)',
                        backgroundColor: 'var(--bg-primary)',
                        fontSize: '0.92rem'
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.75rem 0.7rem 2.25rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-primary)',
                      fontSize: '0.92rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={{
                      width: '100%',
                      padding: '0.7rem 2.25rem 0.7rem 2.25rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-primary)',
                      fontSize: '0.92rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', padding: '4px' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--color-berry)' }}
                  />
                  <span>Keep me signed in</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => showToast('Password recovery is available for registered accounts.', 'info')} 
                  style={{ color: 'var(--color-berry)', fontWeight: 500 }}
                >
                  Forgot?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  marginTop: '0.5rem', 
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: isSubmitting ? 0.75 : 1
                }}
              >
                <span>
                  {isSubmitting
                    ? 'Connecting...'
                    : activeTab === 'login'
                    ? 'Sign In to Workspace'
                    : 'Create Account'}
                </span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Saheli · Clinical Bridge for Women's Health
          </div>
        </div>
      </main>
    </div>
  );
}
