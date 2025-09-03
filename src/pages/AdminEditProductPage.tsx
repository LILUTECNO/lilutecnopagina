import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../services/api'; // Importamos nuestro cliente de API
import { Product } from '../types';

const AdminEditProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        // Usamos apiClient para obtener los datos del producto
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data);
      } catch (err) {
        setError('Error al cargar el producto.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['price', 'stock'].includes(name) || name === 'old_price';
    setProduct(prev => ({
      ...prev,
      [name]: isNumber ? Number(value) || null : value,
    }));
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: 'images' | 'features') => {
    const value = e.target.value.split(',').map(item => item.trim());
    setProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !product.name || !product.category || (product.price ?? 0) <= 0) {
      setError('Por favor, completa los campos requeridos: Nombre, Categoría y Precio.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Usamos apiClient para enviar los datos actualizados al backend
      await apiClient.put(`/products/${id}`, product);
      navigate('/admin');
    } catch (err) {
      setError('Error al actualizar el producto. Inténtalo de nuevo.');
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <h1>Editar Producto</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input name="name" value={product.name || ''} onChange={handleChange} placeholder="Nombre del Producto" required />
        <input name="price" type="number" value={product.price || 0} onChange={handleChange} placeholder="Precio" required />
        <input name="old_price" type="number" value={product.old_price || ''} onChange={handleChange} placeholder="Precio Antiguo (opcional)" />
        <input name="category" value={product.category || ''} onChange={handleChange} placeholder="Categoría" required />
        <input name="stock" type="number" value={product.stock || 0} onChange={handleChange} placeholder="Stock" required />
        <textarea name="summary" value={product.summary || ''} onChange={handleChange} placeholder="Resumen" />
        <input name="images" defaultValue={Array.isArray(product.images) ? product.images.join(', ') : ''} onChange={(e) => handleArrayChange(e, 'images')} placeholder="URLs de Imágenes (separadas por coma)" />
        <textarea name="features" defaultValue={Array.isArray(product.features) ? product.features.join(', ') : ''} onChange={(e) => handleArrayChange(e, 'features')} placeholder="Características (separadas por coma)" />

        <button type="submit" disabled={loading} style={{ padding: '0.75rem' }}>
          {loading ? 'Actualizando...' : 'Actualizar Producto'}
        </button>
      </form>
    </div>
  );
};

export default AdminEditProductPage;
