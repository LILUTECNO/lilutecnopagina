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
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173` (or the next available port).

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Lints the TypeScript files for errors.
- `npm run preview`: Serves the production build locally for preview.
