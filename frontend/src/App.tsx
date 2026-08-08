import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Overview from './pages/overview';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import Challans from './pages/Challans';

export default function App() {
  return (
    <AuthProvider>

      <Routes>

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >

          <Route
            path="/overview"
            element={<Overview />}
          />

          <Route
            path="/customers"
            element={<Customers />}
          />

          <Route
            path="/customers/:id"
            element={<CustomerDetail />}
          />

          <Route
            path="/products"
            element={<Products />}
          />

          <Route
            path="/challans"
            element={<Challans />}
          />

        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to="/overview"
              replace
            />
          }
        />

      </Routes>

    </AuthProvider>
  );
}