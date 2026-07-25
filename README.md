# LiluTecno E-Commerce

This is a modern, responsive, and high-performance e-commerce front-end built with React, TypeScript, and Vite. It provides a seamless shopping experience with features like real-time product filtering, a persistent shopping cart, and a clean, intuitive user interface.

## Features

- **Fast & Responsive Design**: Built with Vite for a lightning-fast development experience and a responsive design that looks great on any device.
- **Advanced Product Filtering**: Users can easily filter products by search term, category, price range, and stock availability.
- **Persistent Shopping Cart**: The shopping cart is saved to local storage, so users won't lose their selected items between sessions.
- **Modern Tech Stack**: Utilizes the latest features of React and TypeScript for a robust and maintainable codebase.
- **Clean & Professional UI**: A user-friendly interface that makes it easy for customers to browse and find products.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd lilutecno-e-commerce
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    This project connects to a Firebase backend. For the application to run, you must create a `.env` file in the root of the project directory.

    Copy the following template into your `.env` file and replace the values with your actual Firebase project credentials.

    ```env
    # Firebase Configuration
    VITE_FIREBASE_API_KEY="YOUR_API_KEY"
    VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    VITE_FIREBASE_APP_ID="YOUR_APP_ID"
    VITE_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
    
    # WOMPI Payment Integration
    VITE_WOMPI_PUBLIC_KEY="YOUR_WOMPI_PUBLIC_KEY"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173` (or the next available port).

## Admin Panel

The application includes a complete admin panel for managing products:

- Admin Login: `/login`
- Dashboard: `/admin`
- Add Product: `/admin/add-product`
- Edit Product: `/admin/edit-product/:id`

To access the admin panel, you'll need valid credentials that are verified against the backend API.

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Lints the TypeScript files for errors.
- `npm run preview`: Serves the production build locally for preview.

## Producción: Firebase y pagos

Antes de desplegar, habilita Email/Password, Google y Facebook en Firebase Authentication. Para Facebook debes configurar el App ID y App Secret de Meta y registrar el dominio de producción como URL autorizada.

El checkout seguro depende de las Cloud Functions incluidas en `functions/`. Instala sus dependencias, configura el secreto de Wompi y despliega las funciones, reglas, índices y Hosting:

```bash
cd functions && npm install && npm run build && cd ..
firebase functions:secrets:set WOMPI_PRIVATE_KEY
firebase deploy --only functions,firestore:rules,firestore:indexes,storage,hosting
```

Configura en el panel de Wompi la URL HTTPS de `wompiWebhook` publicada por Firebase. El navegador nunca debe recibir la llave privada de Wompi.

## Despliegue y Configuración

### 1. Configuración de Secretos (`.env`)

- **Local:** Crea un archivo `functions/.env` con las variables `WOMPI_PRIVATE_KEY` y `WOMPI_EVENTS_SECRET`.
- **Seguridad:** Este archivo está excluido del control de versiones (`.gitignore`). **NUNCA** lo subas al repositorio.
- **Producción:** Las variables se inyectan automáticamente en el despliegue a través del script envoltorio.

### 2. Cómo desplegar funciones

Para subir cambios a Firebase de forma segura, usa siempre el script canónico:

```bash
npm run firebase:deploy:functions
```

Este script compila el código, aplica parches necesarios al CLI de forma temporal y despliega utilizando la cuenta de servicio autorizada.
