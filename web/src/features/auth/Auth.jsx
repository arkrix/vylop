import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  Code2, 
  User, 
  Lock, 
  Mail, 
  ArrowRight, 
  Terminal, 
  Zap, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import PageLoader from '../../components/common/PageLoader';
import './Auth.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vylop.onrender.com';

const getSafeInternalRedirect = (url) => {
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  return '/';
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState({
    message: "Authenticating session...",
    subtext: "Verifying credentials and security tokens..."
  });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    const googleUsername = searchParams.get("googleUsername");
    if (googleUsername) {
      localStorage.setItem("username", googleUsername);
      localStorage.setItem("loginType", "google");
      toast.success("Successfully logged in with Google!");
      
      const rawRedirect = localStorage.getItem('redirectUrl') || "/";
      localStorage.removeItem('redirectUrl'); 
      const safeRedirect = getSafeInternalRedirect(rawRedirect);
      navigate(safeRedirect, { replace: true });
    }
  }, [searchParams, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoadingMessage({
      message: isLogin ? "Signing in to Vylop..." : "Creating your workspace account...",
      subtext: isLogin 
        ? "Verifying cryptographic tokens and user permissions..." 
        : "Allocating dedicated cloud storage and user profile..."
    });
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { username: formData.username, password: formData.password }
      : formData;

    const minimumTransitionDelay = new Promise(resolve => setTimeout(resolve, 1400));

    try {
      const [res] = await Promise.all([
        axios.post(`${API_BASE_URL}${endpoint}`, payload),
        minimumTransitionDelay
      ]);

      localStorage.setItem('username', res.data.username);
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }

      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      const safeDestination = getSafeInternalRedirect(from);
      navigate(safeDestination, { replace: true });
    } catch (error) {
      await minimumTransitionDelay;
      console.error("Auth Error:", error);
      toast.error(error.response?.data?.error || error.response?.data || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoadingMessage({
      message: "Connecting to Google OAuth2...",
      subtext: "Redirecting to Google secure authentication gateway..."
    });
    setLoading(true);
    const safeFrom = getSafeInternalRedirect(from);
    localStorage.setItem('redirectUrl', safeFrom);

    setTimeout(() => {
      window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
    }, 1200);
  };

  if (loading) {
    return (
      <PageLoader 
        message={loadingMessage.message} 
        subtext={loadingMessage.subtext} 
      />
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="ambient-glow glow-top-left"></div>
      <div className="ambient-glow glow-bottom-right"></div>

      <div className="auth-layout">
        {/* Left Side: Product Showcase & Value Proposition */}
        <div className="auth-hero-panel">
          <div className="hero-brand">
            <div className="brand-badge">
              <Code2 className="brand-icon" />
              <span>Vylop</span>
            </div>
          </div>

          <div className="hero-content">
            <h1 className="hero-title">
              Code together in <span className="text-gradient">real time</span> with zero friction.
            </h1>
            <p className="hero-description">
              Collaborative coding rooms, instant sandbox execution, and synchronized workspaces tailored for high-velocity teams.
            </p>

            {/* Interactive Code Preview Mockup */}
            <div className="code-mockup-card">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="mockup-filename">
                  <Terminal className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  workspace.vylop
                </div>
              </div>
              <div className="mockup-body">
                <div className="code-line"><span className="token-keyword">import</span> &#123; createRoom &#125; <span className="token-keyword">from</span> <span className="token-string">'@vylop/core'</span>;</div>
                <div className="code-line"><span className="token-comment">{"// Instant synchronized workspace"}</span></div>
                <div className="code-line"><span className="token-keyword">const</span> session = <span className="token-function">createRoom</span>(&#123;</div>
                <div className="code-line indent"><span className="token-key">engine</span>: <span className="token-string">'docker-sandbox'</span>,</div>
                <div className="code-line indent"><span className="token-key">sync</span>: <span className="token-boolean">true</span>,</div>
                <div className="code-line indent"><span className="token-key">latency</span>: <span className="token-string">'&lt;15ms'</span></div>
                <div className="code-line">&#125;</div>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="hero-feature-list">
              <div className="feature-item">
                <CheckCircle2 className="feature-icon" />
                <span>Isolated Docker Sandboxes</span>
              </div>
              <div className="feature-item">
                <Zap className="feature-icon" />
                <span>Sub-millisecond WebSocket Sync</span>
              </div>
              <div className="feature-item">
                <ShieldCheck className="feature-icon" />
                <span>Secure OAuth2 & JWT Sessions</span>
              </div>
            </div>
          </div>

          <div className="hero-footer-text">
            <span>Trusted by engineers building next-generation software.</span>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="auth-form-panel">
          <div className="auth-card-container">
            
            <div className="auth-card-header">
              <div className="auth-mode-switch">
                <button
                  type="button"
                  className={`tab-btn ${isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(true)}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`tab-btn ${!isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(false)}
                >
                  Register
                </button>
              </div>
              
              <h2 className="auth-title">
                {isLogin ? 'Welcome back' : 'Create your workspace'}
              </h2>
              <p className="auth-subtext">
                {isLogin 
                  ? 'Enter your credentials to access your collaborative sessions.' 
                  : 'Get started with real-time code collaboration in seconds.'}
              </p>
            </div>

            {/* Social Authentication */}
            <button type="button" onClick={handleGoogleLogin} className="google-oauth-button">
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.16-3.16C17.45 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="auth-separator">
              <span className="line"></span>
              <span className="separator-text">or with username</span>
              <span className="line"></span>
            </div>

            {/* Standard Credential Form */}
            <form className="auth-interactive-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="input-field-group">
                  <label htmlFor="email">Work Email</label>
                  <div className="input-box-wrapper">
                    <Mail className="input-adornment-icon" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="styled-auth-input"
                      placeholder="alex@company.com"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="input-field-group">
                <label htmlFor="username">Username</label>
                <div className="input-box-wrapper">
                  <User className="input-adornment-icon" />
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="styled-auth-input"
                    placeholder="shardool"
                    required
                  />
                </div>
              </div>

              <div className="input-field-group">
                <div className="field-label-row">
                  <label htmlFor="password">Password</label>
                </div>
                <div className="input-box-wrapper">
                  <Lock className="input-adornment-icon" />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="styled-auth-input"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="primary-action-button" disabled={loading}>
                <span>{isLogin ? 'Sign In to Workspace' : 'Create Vylop Account'}</span>
                <ArrowRight className="btn-arrow" />
              </button>
            </form>

            <div className="auth-card-footer">
              <p>
                {isLogin ? "New to Vylop? " : "Already registered? "}
                <button 
                  type="button" 
                  className="switch-link-button" 
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? 'Create an account' : 'Sign in here'}
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;