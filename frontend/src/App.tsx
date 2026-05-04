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
import Signup from './pages/Signup';
import Vendors from './pages/Vendors';
import Staff from './pages/Staff';
import Reorder from './pages/Reorder';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Demo from './pages/Demo';
import Kitchen from './pages/Kitchen';
import KitchenLogger from './pages/KitchenLogger';
import Residents from './pages/Residents';
import PrepSheet from './pages/PrepSheet';
import TrayTickets from './pages/TrayTickets';
import ScanData from './pages/ScanData';
import CycleCount from './pages/CycleCount';

import ScrollToTop from './components/ScrollToTop';
import PrivateRoute from './components/PrivateRoute';
import { FacilityProvider } from './components/FacilityTypeGate';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <FacilityProvider>
      <GalaxyTransitionProvider>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Pages */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
          <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/vendors" element={<PrivateRoute><Vendors /></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute><Staff /></PrivateRoute>} />
          <Route path="/reorder" element={<PrivateRoute><Reorder /></PrivateRoute>} />
          <Route path="/kitchen" element={<PrivateRoute><Kitchen /></PrivateRoute>} />
          <Route path="/kitchen/log" element={<PrivateRoute><KitchenLogger /></PrivateRoute>} />
          <Route path="/residents" element={<PrivateRoute><Residents /></PrivateRoute>} />
          <Route path="/kitchen/prep" element={<PrivateRoute><PrepSheet /></PrivateRoute>} />
          <Route path="/kitchen/tray-tickets" element={<PrivateRoute><TrayTickets /></PrivateRoute>} />
          <Route path="/scan-data" element={<PrivateRoute><ScanData /></PrivateRoute>} />
          <Route path="/cycle-count" element={<PrivateRoute><CycleCount /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GalaxyTransitionProvider>
      </FacilityProvider>
    </Router>
  );
}

export default App;

