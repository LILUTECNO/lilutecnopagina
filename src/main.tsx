import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import ProductPage from './pages/ProductPage'
import { CartProvider } from './context/CartContext' // Importar CartProvider
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider> {/* Envolver con CartProvider */}
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/product/:productId" element={<ProductPage />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>,
)