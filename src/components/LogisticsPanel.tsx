import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { Truck, Package, CheckCircle2, Boxes, Wallet, MapPin, X, Printer } from 'lucide-react';
import type { Order, CollectionRoute } from '../types';

const LOGISTICS_COLUMNS: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'por_recolectar', label: 'Por recolectar', icon: <Truck className='h-4 w-4' />, color: 'border-amber-400' },
  { key: 'en_bodega', label: 'En bodega', icon: <Boxes className='h-4 w-4' />, color: 'border-blue-400' },
  { key: 'para_empaque', label: 'Para empaque', icon: <Package className='h-4 w-4' />, color: 'border-purple-400' },
  { key: 'despachado', label: 'Despachado', icon: <Truck className='h-4 w-4' />, color: 'border-cyan-400' },
  { key: 'entregado', label: 'Entregado', icon: <CheckCircle2 className='h-4 w-4' />, color: 'border-green-500' },
];

const STATUS_NEXT: Record<string, string> = {
  por_recolectar: 'en_bodega',
  en_bodega: 'para_empaque',
  para_empaque: 'despachado',
  despachado: 'entregado',
  entregado: 'para_pagar',
};

const formatCOP = (n: number) => '$' + (Number(n) || 0).toLocaleString('es-CO');
const formatDate = (v: any) => {
  if (!v) return '';
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const LogisticsPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<CollectionRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [trackingGuide, setTrackingGuide] = useState('');
  const [carrier, setCarrier] = useState('Inter Rapidísimo');
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    const ordersQ = query(
      collection(db, 'orders'),
      where('paymentStatus', '==', 'paid')
    );
    const unsub = onSnapshot(ordersQ, (snap) => {
      const list: Order[] = [];
      snap.forEach(doc => {
        const snap = doc.data() as Order;
        // Solo órdenes dentro del flujo logístico
        if (['por_recolectar', 'en_bodega', 'para_empaque', 'despachado', 'entregado', 'para_pagar', 'garantia'].includes(String(snap.status))) {
          const data = doc.data();
          list.push({ id: doc.id, ...(data as Record<string, unknown>) } as Order);
        }
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const routesQ = query(collection(db, 'collectionRoutes'), orderBy('date', 'desc'));
    const unsub = onSnapshot(routesQ, (snap) => {
      setRoutes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollectionRoute)).slice(0, 10));
    });
    return () => unsub();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, Order[]> = {};
    for (const col of LOGISTICS_COLUMNS) g[col.key] = [];
    g['para_pagar'] = [];
    g['garantia'] = [];
    for (const o of orders) {
      const s = String(o.status);
      if (g[s]) g[s].push(o);
    }
    return g;
  }, [orders]);

  const advance = httpsCallable(functions, 'advanceOrderStatus');
  const createRoute = httpsCallable(functions, 'createCollectionRoute');

  const advanceOrder = async (order: Order) => {
    const current = String(order.status);
    const next = STATUS_NEXT[current] || '';
    if (!next) {
      toast.error('Esta orden no admite avance automático.');
      return;
    }
    setSelectedOrderId(order.id);
    setTrackingGuide(order.trackingGuide || '');
    setCarrier(order.carrier || 'Inter Rapidísimo');
    // Si avanza a en_bodega o despachado, debe abrir modal con foto/guía
    if (next === 'en_bodega' || next === 'despachado') {
      return;
    }
    // Caso simple: avanzar directo
    setAdvancing(true);
    try {
      await advance({ orderId: order.id, nextStatus: next });
      toast.success(`Orden avanzada a "${next.replace('_', ' ')}".`);
      setSelectedOrderId(null);
    } catch (err: any) {
      toast.error(err?.message || 'No fue posible avanzar la orden.');
    } finally {
      setAdvancing(false);
    }
  };

  const submitAdvancement = async () => {
    if (!selectedOrderId) return;
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;
    const next = STATUS_NEXT[String(order.status)] || '';
    setAdvancing(true);
    try {
      if (next === 'en_bodega') {
        if (!photoFile) {
          toast.error('Adjunta la foto de validación.');
          return;
        }
        const storageRef = ref(storage, `validationPhotos/${selectedOrderId}/${Date.now()}_${photoFile.name}`);
        const upl = await uploadBytes(storageRef, photoFile);
        const url = await getDownloadURL(upl.ref);
        await advance({ orderId: selectedOrderId, nextStatus: next, photoUrl: url });
        toast.success('Ingreso a bodega validado con foto.');
      } else if (next === 'despachado') {
        if (!trackingGuide.trim()) {
          toast.error('Ingresa la guía de envío.');
          return;
        }
        await advance({ orderId: selectedOrderId, nextStatus: next, trackingGuide, carrier });
        toast.success('Orden despachada.');
      } else {
        await advance({ orderId: selectedOrderId, nextStatus: next });
      }
      setSelectedOrderId(null);
      setPhotoFile(null);
      setTrackingGuide('');
    } catch (err: any) {
      toast.error(err?.message || 'No fue posible avanzar la orden.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleCreateRoute = async () => {
    try {
      const res = await createRoute({ date: new Date().toISOString().split('T')[0] }) as any;
      toast.success(`Ruta generada con ${res.data.stopsCount} paradas (proveedores).`);
    } catch (err: any) {
      toast.error(err?.message || 'No fue posible generar la ruta.');
    }
  };

  const printRoute = (route: CollectionRoute) => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    const rowsHtml = route.stops.map((stop, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${stop.providerStoreName || stop.providerName}</strong><br/>${stop.providerAddress || ''}</td>
        <td>${stop.providerPhone || ''}</td>
        <td>${stop.units} u.</td>
        <td>${stop.orderIds.length} pedidos</td>
      </tr>
    `).join('');
    w.document.write(`<html><head><title>Ruta ${route.date}</title><style>body{font-family:sans-serif;padding:24px}h1{margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}</style></head><body><h1>Ruta de recolección ${route.date}</h1><p>Mensajero: ${route.messenger || 'Sin asignar'} · ${route.stops.length} paradas · ${route.stops.reduce((sum, s) => sum + s.orderIds.length, 0)} pedidos</p><table><thead><tr><th>#</th><th>Proveedor / Dirección</th><th>Teléfono</th><th>Unidades</th><th>Pedidos</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.print()</script></body></html>`);
    w.document.close();
  };

  const columnOrders: Order[] = grouped['para_pagar'] || [];

  return (
    <div className='space-y-6'>
      {/* Rutas de recolección */}
      <div className='bg-white border border-luxury-silver p-6 shadow-luxury rounded-none'>
        <div className='flex items-center justify-between mb-3'>
          <div>
            <h3 className='font-montserrat text-base font-light text-luxury-black'>Rutas de recolección</h3>
            <p className='text-xs text-gray-500 font-light'>Genera la ruta optimizada del mensajero agrupando órdenes pagadas por proveedor.</p>
          </div>
          <button onClick={handleCreateRoute} className='flex items-center gap-2 border border-luxury-gold bg-luxury-black px-4 py-2 text-xs uppercase tracking-widest text-white hover:bg-white hover:text-luxury-black transition-colors'>
            <MapPin className='h-4 w-4' /> Generar ruta de hoy
          </button>
        </div>
        {routes.length === 0 ? (
          <p className='text-xs text-gray-400 font-light'>No hay rutas generadas todavía.</p>
        ) : (
          <div className='space-y-2'>
            {routes.map(route => (
              <div key={route.id} className='flex items-center justify-between border border-luxury-silver p-3 rounded text-sm'>
                <div>
                  <p className='font-medium text-luxury-black'>{route.date} · {route.stops.length} paradas · {route.stops.reduce((sum, s) => sum + s.orderIds.length, 0)} pedidos</p>
                  <p className='text-xs text-gray-400 font-light'>Mensajero: {route.messenger || 'Sin asignar'} · Estado: {route.status}</p>
                </div>
                <div className='flex gap-2'>
                  <button onClick={() => printRoute(route)} className='border border-luxury-silver p-2 text-gray-600 hover:text-luxury-black' title='Imprimir'>
                    <Printer className='h-4 w-4' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanban logístico */}
      {loading ? (
        <div className='flex justify-center py-12'>
          <div className='h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold border-t-transparent'></div>
        </div>
      ) : (
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-3'>
          {LOGISTICS_COLUMNS.map(col => (
            <div key={col.key} className={`bg-white border-t-4 ${col.color} border-luxury-silver shadow-luxury`}>
              <div className='p-3 border-b border-luxury-silver flex items-center gap-2'>
                <span className='text-luxury-gold'>{col.icon}</span>
                <p className='text-xs uppercase tracking-widest font-semibold text-luxury-black'>{col.label}</p>
                <span className='ml-auto text-[10px] bg-luxury-off-white border border-luxury-silver px-2 py-0.5'>{grouped[col.key]?.length || 0}</span>
              </div>
              <div className='p-2 space-y-2 max-h-[600px] overflow-y-auto'>
                {(grouped[col.key] || []).map(order => {
                  const next = STATUS_NEXT[String(order.status)] || '';
                  const itemsSummary = (order.items || []).map(item => `${item.name} x${item.quantity}`).join(', ');
                  return (
                    <div key={order.id} className='border border-luxury-silver p-2 text-xs rounded'>
                      <div className='flex justify-between'>
                        <span className='font-mono text-[10px] text-gray-400'>#{order.id.slice(0, 6)}</span>
                        <span className='text-[10px] text-luxury-gold uppercase'>{order.type || 'direct'}</span>
                      </div>
                      <p className='mt-1 font-medium text-luxury-black line-clamp-2'>{itemsSummary}</p>
                      <p className='mt-1 text-[10px] text-gray-500'>{formatDate(order.paidAt || order.createdAt)}</p>
                      <p className='mt-0.5 text-[10px] text-gray-600'>Total: {formatCOP(order.total)}</p>
                      {order.dropshipperName && <p className='text-[10px] text-purple-500'>Vendedor: {order.dropshipperName}</p>}
                      {order.trackingGuide && <p className='text-[10px] text-cyan-600'>Guía: {order.trackingGuide} ({order.carrier})</p>}
                      {order.validationPhotoUrl && <a href={order.validationPhotoUrl} target='_blank' rel='noreferrer' className='text-[10px] text-blue-500 underline'>Ver foto</a>}
                      {next && (
                        <button onClick={() => advanceOrder(order)} disabled={advancing} className='mt-2 w-full border border-luxury-gold bg-luxury-black text-white py-1 text-[10px] uppercase tracking-widest hover:bg-white hover:text-luxury-black transition-colors'>
                          → {next.replace('_', ' ')}
                        </button>
                      )}
                    </div>
                  );
                })}
                {(grouped[col.key] || []).length === 0 && <p className='text-[10px] text-gray-300 text-center py-3'>Sin órdenes</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Para pagar (batch martes/viernes) */}
      <div className='bg-white border border-luxury-silver p-6 shadow-luxury rounded-none'>
        <div className='flex items-center gap-2 mb-3'>
          <Wallet className='h-5 w-5 text-luxury-gold' />
          <h3 className='font-montserrat text-base font-light text-luxury-black'>Listos para el batch de pago (martes / viernes)</h3>
        </div>
        {columnOrders.length === 0 ? (
          <p className='text-xs text-gray-400 font-light'>No hay órdenes marcadas para pago todavía. Las órdenes entregadas se marcan como "para_pagar" para el batch.</p>
        ) : (
          <div className='space-y-2'>
            {columnOrders.map(order => (
              <div key={order.id} className='flex justify-between border border-luxury-silver p-3 text-xs'>
                <div>
                  <p className='font-mono text-[10px] text-gray-400'>#{order.id.slice(0, 6)}</p>
                  <p>Proveedor: {formatCOP(Number(order.providerCost) || Number(order.subtotal) || order.total)}</p>
                  <p>Vendedor: {formatCOP(order.dropshipperCommission || 0)}</p>
                  <p>Plataforma: {formatCOP((order.total || 0) - (Number(order.providerCost) || order.total) - (order.dropshipperCommission || 0))}</p>
                </div>
                <p className='text-right text-[10px] text-gray-500'>Entregado: {formatDate(order.deliveredAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal avance */}
      {selectedOrderId && (() => {
        const order = orders.find(o => o.id === selectedOrderId);
        if (!order) return null;
        const next = STATUS_NEXT[String(order.status)] || '';
        const needsPhoto = next === 'en_bodega';
        const needsGuide = next === 'despachado';
        return (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/40 backdrop-blur-sm p-4'>
            <div className='w-full max-w-md bg-white border border-luxury-silver p-6 shadow-luxury space-y-4 rounded-none relative'>
              <div className='flex justify-between items-center'>
                <h3 className='font-montserrat text-lg font-light text-luxury-black'>Avanzar orden a "{next.replace('_', ' ')}"</h3>
                <button onClick={() => setSelectedOrderId(null)} className='text-gray-400 hover:text-luxury-black'><X className='h-5 w-5' /></button>
              </div>
              <p className='text-xs text-gray-500'>Pedido #{order.id.slice(0, 6)} de {formatCOP(order.total)}</p>
              {needsPhoto && (
                <div>
                  <label className='block text-[10px] uppercase tracking-widest text-gray-400 mb-1'>Foto de validación en bodega (obligatoria)</label>
                  <input type='file' accept='image/*' onChange={e => setPhotoFile(e.target.files?.[0] || null)} className='block w-full text-xs' />
                  {photoFile && <p className='text-[10px] text-luxury-gold mt-1'>{photoFile.name}</p>}
                </div>
              )}
              {needsGuide && (
                <>
                  <div>
                    <label className='block text-[10px] uppercase tracking-widest text-gray-400 mb-1'>Número de guía</label>
                    <input value={trackingGuide} onChange={e => setTrackingGuide(e.target.value)} className='w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm' placeholder='Ej. IR-123456' />
                  </div>
                  <div>
                    <label className='block text-[10px] uppercase tracking-widest text-gray-400 mb-1'>Transportadora</label>
                    <select value={carrier} onChange={e => setCarrier(e.target.value)} className='w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm'>
                      <option>Inter Rapidísimo</option>
                      <option>Envía</option>
                      <option>Coordinadora</option>
                      <option>Servientrega</option>
                    </select>
                  </div>
                </>
              )}
              <div className='flex justify-end gap-2 pt-3 border-t border-luxury-silver'>
                <button onClick={() => setSelectedOrderId(null)} className='border border-luxury-silver px-4 py-2 text-xs uppercase tracking-widest'>Cancelar</button>
                <button onClick={submitAdvancement} disabled={advancing} className='border border-luxury-gold bg-luxury-black px-4 py-2 text-xs uppercase tracking-widest text-white hover:bg-white hover:text-luxury-black disabled:opacity-50'>
                  {advancing ? 'Avanzando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LogisticsPanel;
