import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GalaxyTransitionProvider } from './components/GalaxyTransition';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Invoices from './pages/Invoices';
import Analytics from './pages/Analytics';
import Features from './pages/Features';
import About from './pages/About';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Vendors from './pages/Vendors';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <GalaxyTransitionProvider>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Pages (still accessible for demo) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/vendors" element={<Vendors />} />

          {/* Fallback - redirect all unknown routes to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GalaxyTransitionProvider>
    </Router>
  );
}

export default App;

