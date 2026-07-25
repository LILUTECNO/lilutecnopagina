import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { LayoutGrid, Plus, LogOut, Edit, Trash, Package } from 'lucide-react';
import logo from '../assets/images/lilutecnologo.png';

const AdminDashboardPage = () => {
  const { allProducts, loading, refetchProducts } = useProducts();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEdit = (product: Product) => {
    navigate(`/admin/edit-product/${product.id}`);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
      try {
        await apiClient.delete(`/products/${product.id}`);
        refetchProducts();
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
    return (
      <div className="admin-shell flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="admin-shell font-sans">
      <header className="border-b border-white/10 bg-white/[.06] backdrop-blur-2xl sticky top-0 z-10 px-6 py-5 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="Lilu Tecno" className="h-9 w-9 rounded-full object-contain ring-1 ring-white/10" />
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 stroke-1 text-orange-400" />
            <span className="font-montserrat text-lg font-black tracking-[0.16em] text-white">
              LILUTECNO ADMIN
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-semibold">
            Panel de Administración
          </span>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5" title="Cerrar Sesión">
            <LogOut className="h-5 w-5 stroke-1" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div>
            <h1 className="font-montserrat text-3xl font-light text-white tracking-tight">Gestión de Productos</h1>
            <p className="text-sm text-slate-400 font-light mt-2 leading-relaxed">Controla el inventario global, añade nuevos productos y edita los existentes.</p>
          </div>
          <button onClick={handleAddProduct} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-[0.2em] text-white border border-orange-400/40 bg-orange-400/10 hover:bg-orange-400/20 hover:border-orange-400/60 transition-all duration-300 hover:scale-[1.02]">
            <Plus className="h-4 w-4" />
            <span>Añadir Producto</span>
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur-xl shadow-2xl overflow-hidden">
          {allProducts.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="h-12 w-12 stroke-1 text-orange-400 mx-auto mb-4" />
              <p className="text-sm text-slate-400 font-light">No hay productos en el catálogo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[.03]">
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Nombre</th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Categoría</th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Precio</th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Stock</th>
                    <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((product) => (
                    <tr key={product.id} className="border-b border-white/5 transition-colors duration-200 hover:bg-white/[.03]">
                      <td className="px-6 py-4 text-sm font-medium text-white">{product.name}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{product.category}</td>
                      <td className="px-6 py-4 text-sm font-mono text-orange-300">{product.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${product.stock > 5 ? 'bg-green-500/15 text-green-400 border border-green-500/30' : product.stock > 0 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-orange-400 hover:border-orange-400/40 hover:bg-orange-400/10 transition-all duration-300 hover:scale-105"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4 stroke-1" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition-all duration-300 hover:scale-105"
                            title="Eliminar"
                          >
                            <Trash className="h-4 w-4 stroke-1" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
