import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Product } from '../types';

const AdminAddProductPage = () => {
  const navigate = useNavigate();
  const [product, setProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    old_price: null,
    category: '',
    stock: 0,
    summary: '',
    images: [],
    features: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['price', 'stock'].includes(name) || name === 'old_price';
    setProduct(prev => ({
      ...prev,
      [name]: isNumber ? Number(value) || null : value,
    }));
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'images' | 'features') => {
    // Simple comma-separated string to array
    const value = e.target.value.split(',').map(item => item.trim());
    setProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.name || !product.category || product.price <= 0) {
      setError('Por favor, completa los campos requeridos: Nombre, Categoría y Precio.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const productsCollection = collection(db, 'products');
      await addDoc(productsCollection, product);
      navigate('/admin');
    } catch (err) {
      setError('Error al guardar el producto. Inténtalo de nuevo.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <h1>Añadir Nuevo Producto</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input name="name" value={product.name} onChange={handleChange} placeholder="Nombre del Producto" required />
        <input name="price" type="number" value={product.price} onChange={handleChange} placeholder="Precio" required />
        <input name="old_price" type="number" value={product.old_price ?? ''} onChange={handleChange} placeholder="Precio Antiguo (opcional)" />
        <input name="category" value={product.category} onChange={handleChange} placeholder="Categoría" required />
        <input name="stock" type="number" value={product.stock} onChange={handleChange} placeholder="Stock" required />
        <textarea name="summary" value={product.summary} onChange={handleChange} placeholder="Resumen" />
        <input name="images" onChange={(e) => handleArrayChange(e, 'images')} placeholder="URLs de Imágenes (separadas por coma)" />
        <textarea name="features" onChange={(e) => handleArrayChange(e, 'features')} placeholder="Características (separadas por coma)" />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '0.75rem' }}>
          {loading ? 'Guardando...' : 'Guardar Producto'}
        </button>
      </form>
    </div>
  );
};

export default AdminAddProductPage;
