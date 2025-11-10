import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Homepage from './components/logic/homepage';
import Dashboard from './components/logic/Dashboard';
import PredictForm from '../PredictForm'
import Recent from './components/logic/Recent'
import Beneficiaries from './components/logic/Beneficiaries';
import HelpSupport from './components/logic/HelpSupport';
import Statement from './components/logic/Statement';
const RouteTitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const routeToTitle = {
      '/': 'SafePayAI - Home',
      '/dashboard': 'SafePayAI - Dashboard',
      '/send-money': 'SafePayAI - Send Money',
      '/transactions': 'SafePayAI - Transactions',
      '/statements': 'SafePayAI - Statements',
      '/beneficiaries': 'SafePayAI - Beneficiaries',
      '/settings': 'SafePayAI - Settings',
      '/help-support': 'SafePayAI - Help & Support',
    };

    const title = routeToTitle[location.pathname] || 'SafePayAI';
    document.title = title;
  }, [location]);

  return null; // This component does not render anything
};

const App = () => {
  return (
    <Router>
      <RouteTitleUpdater />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/send-money" element={<Homepage />} />
        <Route path="/transactions" element={<Recent />} />
        <Route path="/statements" element={<Statement />} />
        <Route path="/beneficiaries" element={<Beneficiaries/>} />
        <Route path="/settings" element={<PredictForm />} />
        <Route path="/help-support" element={<HelpSupport />} />
      </Routes>
    </Router>
    
  );
};

export default App;



