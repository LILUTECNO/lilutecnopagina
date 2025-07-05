import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App' // Asegúrate de que App se exporta como 'export const App'
import './index.css' // Esta línea importa tus estilos principales

// Vite se encarga de encontrar el 'root' por ti
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)