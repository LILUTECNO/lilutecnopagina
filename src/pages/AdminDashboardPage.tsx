import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';

const AdminDashboardPage = () => {
  const { allProducts, loading, refetchProducts } = useProducts();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleEdit = (product: Product) => {
    navigate(`/admin/edit-product/${product.id}`);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
      try {
        const productRef = doc(db, 'products', product.id);
        await deleteDoc(productRef);
        refetchProducts(); // Vuelve a cargar los productos para reflejar el cambio
      } catch (error) {
        console.error("Error al eliminar el producto: ", error);
        alert("Hubo un error al eliminar el producto.");
      }
    }
  };

  const handleAddProduct = () => {
    navigate('/admin/add-product');
  };

  if (loading) {
    return <div>Cargando productos...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>Cerrar Sesión</button>
      </div>
      <button onClick={handleAddProduct} style={{ marginBottom: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
        Añadir Nuevo Producto
      </button>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nombre</th>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Categoría</th>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Precio</th>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Stock</th>
            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {allProducts.map((product) => (
            <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{product.name}</td>
              <td style={{ padding: '0.5rem' }}>{product.category}</td>
              <td style={{ padding: '0.5rem' }}>{product.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
              <td style={{ padding: '0.5rem' }}>{product.stock}</td>
              <td style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(product)}>Editar</button>
                <button onClick={() => handleDelete(product)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboardPage;
