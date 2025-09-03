import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import ProductPage from './pages/ProductPage'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminAddProductPage from './pages/AdminAddProductPage'
import AdminEditProductPage from './pages/AdminEditProductPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<App />} />
            <Route path="/product/:productId" element={<ProductPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas de Admin Protegidas */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/add-product" element={<ProtectedRoute><AdminAddProductPage /></ProtectedRoute>} />
            <Route path="/admin/edit-product/:id" element={<ProtectedRoute><AdminEditProductPage /></ProtectedRoute>} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)