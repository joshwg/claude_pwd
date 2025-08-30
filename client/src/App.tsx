import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthLayout from './components/AuthLayout';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Tags from './pages/Tags';
import PasswordEdit from './pages/PasswordEdit';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route 
          path="/auth/*" 
          element={user ? <Navigate to="/dashboard" replace /> : <AuthLayout />} 
        />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <Layout>
                <AdminPanel />
              </Layout>
            </AdminRoute>
          } 
        />
        <Route 
          path="/tags" 
          element={
            <PrivateRoute>
              <Layout>
                <Tags />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/password/new" 
          element={
            <PrivateRoute>
              <Layout>
                <PasswordEdit />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/password/edit" 
          element={
            <PrivateRoute>
              <Layout>
                <PasswordEdit />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/auth/login"} replace />} 
        />
      </Routes>
    </div>
  );
}

export default App;
