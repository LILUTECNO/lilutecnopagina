import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { User, ShoppingBag, LogOut, ArrowLeft } from 'lucide-react';
import logo from '../assets/images/lilutecnologo.png';

interface Order {
  id: string;
  createdAt: string;
  total: number;
  status: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

const formatOrderDate = (value: any) => {
  if (!value) return 'Procesando fecha';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Procesando fecha' : date.toLocaleDateString('es-CO');
};

const ClientDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      try {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(ordersQuery);
        const fetchedOrders: Order[] = [];
        snapshot.forEach((doc) => {
          fetchedOrders.push({
            id: doc.id,
            ...doc.data()
          } as Order);
        });
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada.');
      navigate('/');
    } catch (error) {
      toast.error('Error al cerrar sesión.');
    }
  };

  return (
    <div className="client-shell min-h-screen font-sans">
      {/* Header Premium */}
      <header className="border-b border-white/10 bg-white/[.06] backdrop-blur-2xl sticky top-0 z-10 px-6 py-5 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-1.5 text-slate-400 hover:text-white transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5">
            <ArrowLeft className="h-5 w-5 stroke-1" />
          </Link>
          <img src={logo} alt="Lilu Tecno" className="h-9 w-9 rounded-full object-contain ring-1 ring-white/10" />
          <span className="font-montserrat text-lg font-black tracking-[0.16em] text-white">
            MI CUENTA
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-semibold">
            CLIENTE PREMIUM
          </span>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5" title="Cerrar Sesión">
            <LogOut className="h-5 w-5 stroke-1" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Perfil del Cliente */}
          <div className="bg-white/[.04] border border-white/10 p-8 rounded-2xl shadow-lg backdrop-blur-xl space-y-7">
            <div className="flex items-center space-x-4">
              <div className="bg-white/[.06] p-3 border border-white/12 rounded-full">
                <User className="h-8 w-8 stroke-1 text-orange-400" />
              </div>
              <div>
                <h3 className="font-montserrat text-lg font-medium text-white">{currentUser?.name || 'Cliente'}</h3>
                <p className="text-xs text-slate-400 font-light mt-1">{currentUser?.email}</p>
              </div>
            </div>
            
            <hr className="border-white/10" />

            <div className="space-y-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Detalles de Cuenta</h4>
              <div className="flex justify-between text-sm">
                <span className="font-light text-slate-400">Miembro desde:</span>
                <span className="font-normal text-white">{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-light text-slate-400">Estado:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Activo
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Compras */}
          <div className="lg:col-span-2 bg-white/[.04] border border-white/10 p-8 rounded-2xl shadow-lg backdrop-blur-xl space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <ShoppingBag className="h-6 w-6 stroke-1 text-orange-400" />
              <h3 className="font-montserrat text-lg font-light tracking-wide text-white">Historial de Pedidos</h3>
            </div>

            {loadingOrders ? (
              <div className="flex py-12 justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/15 rounded-2xl bg-white/[.02]">
                <ShoppingBag className="h-10 w-10 stroke-1 text-slate-500 mx-auto mb-4" />
                <p className="text-sm text-slate-400 font-light">Aún no has realizado ninguna compra.</p>
                <Link to="/" className="mt-5 inline-block text-[10px] uppercase tracking-[0.22em] text-orange-400 hover:text-orange-300 font-semibold transition-colors duration-300">
                  Comenzar a comprar →
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white/[.03] border border-white/10 p-6 rounded-2xl space-y-4 transition-colors duration-300 hover:border-orange-400/25">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-400 font-light gap-2 pb-3 border-b border-white/10">
                      <span>ID Pedido: <span className="font-mono text-white">{order.id}</span></span>
                      <span>Fecha: <span className="text-white">{formatOrderDate(order.createdAt)}</span></span>
                      <span className={`px-2.5 py-1 uppercase tracking-[0.16em] text-[10px] font-semibold rounded-full ${
                        order.status === 'completed' || order.status === 'paid' ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-light text-white">
                            {item.name} <span className="text-xs text-slate-400">x{item.quantity}</span>
                          </span>
                          <span className="font-semibold text-white">${item.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Total Pedido</span>
                      <span className="font-montserrat text-lg font-bold text-orange-400">${order.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
