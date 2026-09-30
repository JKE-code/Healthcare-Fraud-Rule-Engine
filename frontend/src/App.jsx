import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Payment } from './pages/Payment';
import { PolicyRules } from './pages/PolicyRules';
import { AuditLogs } from './pages/AuditLogs';
import { initialMockTransactions } from './data/mockTransactions';
import { API_URL } from './api';

export function App() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    const path = window.location.pathname;
    if (path === '/pay') return '/pay';
    if (path === '/rules') return '/rules';
    if (path === '/logs') return '/logs';
    return '/dashboard';
  });

  const [transactions, setTransactions] = useState(initialMockTransactions);
  const [wsStatus, setWsStatus] = useState('live');
  const [modelStatus, setModelStatus] = useState(null);

  // Fetch model status from health endpoint on mount
  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(r => r.json())
      .then(data => setModelStatus(data.model_status || 'mock'))
      .catch(() => setModelStatus('offline'));
  }, []);

  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname;
      if (path === '/pay') setCurrentRoute('/pay');
      else if (path === '/rules') setCurrentRoute('/rules');
      else if (path === '/logs') setCurrentRoute('/logs');
      else setCurrentRoute('/dashboard');
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route) => {
    setCurrentRoute(route);
    window.history.pushState(null, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTransactionCreated = (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  return (
    <div className="app-layout">
      <Navbar
        currentRoute={currentRoute}
        onNavigate={navigate}
        wsStatus={wsStatus}
        modelStatus={modelStatus}
      />

      <main className="app-main-content">
        {currentRoute === '/pay' && (
          <Payment
            onTransactionCreated={handleTransactionCreated}
            onNavigate={navigate}
          />
        )}

        {currentRoute === '/rules' && (
          <PolicyRules />
        )}

        {currentRoute === '/logs' && (
          <AuditLogs />
        )}

        {currentRoute === '/dashboard' && (
          <Dashboard
            sharedTransactions={transactions}
            onNewTransaction={setTransactions}
            wsStatus={wsStatus}
            setWsStatus={setWsStatus}
          />
        )}
      </main>
    </div>
  );
}

export default App;
