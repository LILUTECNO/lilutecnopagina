// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Pega aquí tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBv6ezhW0wygSNVkO3DTqI1DISyaGP7lGE",
  authDomain: "lilutecno-pagina-web.firebaseapp.com",
  projectId: "lilutecno-pagina-web",
  storageBucket: "lilutecno-pagina-web.appspot.com",
  messagingSenderId: "907793758364",
  appId: "1:907793758364:web:ba94a732c669cbee70d559"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar la instancia de Firestore para usarla en otros archivos
export const db = getFirestore(app);
