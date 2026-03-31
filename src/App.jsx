import { useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleRoute from './components/common/RoleRoute';

import Login from './pages/Login';
import ProviderRegister from './pages/ProviderRegister';
import Home from './pages/Home';
import Bookings from './pages/Bookings';
import History from './pages/History';
import Profile from './pages/Profile';

import ProviderDashboard from './pages/provider/ProviderDashboard';
import LotManager from './pages/provider/LotManager';
import QRScanner from './pages/provider/QRScanner';

import AdminDashboard from './pages/admin/AdminDashboard';
import ApprovalQueue from './pages/admin/ApprovalQueue';
import UserManager from './pages/admin/UserManager';
import LotsList from './pages/admin/LotsList';
import Analytics from './pages/admin/Analytics';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function SmartRedirect() {
  const { currentUser, userRole } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (userRole === 'admin') return <Navigate to="/admin" />;
  if (userRole === 'provider') return <Navigate to="/provider" />;
  return <Home />;
}

function App() {
  // Wake-up ping for Render free-tier
  useEffect(() => {
    axios.get('https://parkfinder-hwy4.onrender.com/health-check').catch(() => { });
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/provider/register" element={<ProviderRegister />} />

            <Route path="/" element={<PrivateRoute><SmartRedirect /></PrivateRoute>} />
            <Route path="/bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

            <Route path="/provider" element={<RoleRoute allowedRoles={['provider']}><ProviderDashboard /></RoleRoute>} />
            <Route path="/provider/lots" element={<RoleRoute allowedRoles={['provider']}><LotManager /></RoleRoute>} />
            <Route path="/provider/scanner" element={<RoleRoute allowedRoles={['provider']}><QRScanner /></RoleRoute>} />

            <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
            <Route path="/admin/approvals" element={<RoleRoute allowedRoles={['admin']}><ApprovalQueue /></RoleRoute>} />
            <Route path="/admin/users" element={<RoleRoute allowedRoles={['admin']}><UserManager /></RoleRoute>} />
            <Route path="/admin/lots" element={<RoleRoute allowedRoles={['admin']}><LotsList /></RoleRoute>} />
            <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['admin']}><Analytics /></RoleRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;