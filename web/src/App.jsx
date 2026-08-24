import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, useToasterStore, toast } from 'react-hot-toast';
import Home from './features/dashboard/Home';
import CodeEditor from './features/editor/CodeEditor';
import Auth from './features/auth/Auth';
import AuthCallback from './features/auth/AuthCallback';

const ToastLimiter = () => {
  const { toasts } = useToasterStore();
  const TOAST_LIMIT = 2;

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= TOAST_LIMIT)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  return null;
};

function App() {
  return (
    <Router>
      <ToastLimiter />
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 2000,
          style: {
            background: '#0e1117',
            color: '#f1f5f9',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
            padding: '10px 14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#08090c',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#08090c',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/room/:roomId" element={<CodeEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;