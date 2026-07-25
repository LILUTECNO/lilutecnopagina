import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { VendorRefProvider } from './context/VendorRefContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'
import VendorRefCapture from './pages/VendorRefCapture'
import { Toaster } from 'react-hot-toast'
import './index.css'

// Carga perezosa (Lazy Loading) de las páginas
const App = lazy(() => import('./App').then(module => ({ default: module.App })))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const PendingVerification = lazy(() => import('./pages/PendingVerification'))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'))

// Paneles de Roles
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'))
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'))
const DropshipperDashboard = lazy(() => import('./pages/DropshipperDashboard'))

// Panel Admin Maestro
const MasterAdminDashboard = lazy(() => import('./pages/MasterAdminDashboard'))
const AdminAddProductPage = lazy(() => import('./pages/AdminAddProductPage'))
const AdminEditProductPage = lazy(() => import('./pages/AdminEditProductPage'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <VendorRefProvider>
        <CartProvider>
          {/* Capa de glows TRON (fuera del flujo para no afectar el layout;
              evita el bug de fondo marrón en iOS al no usar background-fixed). */}
          <div className="bg-glow-wrapper-fixed" aria-hidden="true">
            <div className="glow-orange" />
            <div className="glow-cyan" />
          </div>
          {/* Mancha extra TRON DAY — punto de luz naranja sutil en centro */}
          <div className="mancha-extra" aria-hidden="true" />
          <Toaster 
            position="top-right" 
            toastOptions={{
              className: 'font-sans text-xs font-light text-luxury-black bg-white border border-luxury-silver rounded-none tracking-widest',
              duration: 3000,
            }} 
          />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Ruta pública de captura del link personal del vendedor */}
              <Route path="/v/:slug" element={<VendorRefCapture />} />
              {/* Rutas Públicas */}
              <Route path="/" element={<App />} />
              <Route path="/product/:productId" element={<ProductPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/pending-verification" element={<PendingVerification />} />
              <Route path="/como-funciona" element={<HowItWorksPage />} />

              {/* Panel de Cliente (Historial de compras, perfil) */}
              <Route 
                path="/cliente" 
                element={
                  <ProtectedRoute allowedRoles={['cliente']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Panel de Proveedor (Gestión de stock, subir productos) */}
              <Route 
                path="/proveedor" 
                element={
                  <ProtectedRoute allowedRoles={['proveedor']}>
                    <ProviderDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Panel de Dropshipper (Catálogo mayorista, descarga de fotos) */}
              <Route 
                path="/dropshipper" 
                element={
                  <ProtectedRoute allowedRoles={['dropshipper']}>
                    <DropshipperDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Panel de Admin Maestro (CRUD, Categorías, Márgenes, Verificación) */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MasterAdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/add-product" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAddProductPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/edit-product/:id" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminEditProductPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Suspense>
        </CartProvider>
        </VendorRefProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
