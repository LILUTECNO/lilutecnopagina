import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { Wallet, CheckCircle2, FileText } from 'lucide-react';
import type { Order, PayoutBatch } from '../types';

const formatCOP = (n: number) => '$' + (Number(n) || 0).toLocaleString('es-CO');
const formatDate = (v: any) => {
  if (!v) return '';
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO');
};

const PayoutsPanel: React.FC = () => {
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [paidOrders, setPaidOrders] = useState<Order[]>([]);
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [period, setPeriod] = useState<'martes' | 'viernes'>(new Date().getDay() === 2 ? 'martes' : new Date().getDay() === 5 ? 'viernes' : 'martes');
  const [reference, setReference] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const readyQ = query(collection(db, 'orders'), where('status', 'in', ['entregado', 'para_pagar']));
    const paidQ = query(collection(db, 'orders'), where('status', '==', 'pagado'));
    const batchesQ = collection(db, 'payoutBatches');
    const unsub1 = onSnapshot(readyQ, snap => setReadyOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))));
    const unsub2 = onSnapshot(paidQ, snap => setPaidOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))));
    const unsub3 = onSnapshot(batchesQ, snap => setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutBatch)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20)));
    setLoading(false);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const totals = useMemo(() => {
    let providers = 0, dropshippers = 0, platform = 0;
    for (const o of readyOrders) {
      if (!selected[o.id]) continue;
      const prov = Math.max(0, Number(o.providerCost) || Number(o.subtotal) || Number(o.total) || 0) - (Number(o.wholesaleCommission) || 0);
      const dropper = Number(o.dropshipperCommission) || 0;
      providers += prov;
      dropshippers += dropper;
      platform += Number(o.total || 0) - prov - dropper;
    }
    return { providers, dropshippers, platform, total: providers + dropshippers + platform };
  }, [readyOrders, selected]);

  const batchTotal = useMemo(() => {
    let providers = 0, dropshippers = 0, platform = 0, orders = 0;
    for (const b of batches) {
      providers += b.totalProvidersAmount || 0;
      dropshippers += b.totalDropshippersAmount || 0;
      platform += b.totalPlatformNet || 0;
      orders += (b.orderIds?.length || 0);
    }
    return { providers, dropshippers, platform, orders, batches: batches.length };
  }, [batches]);

  const registerPayouts = httpsCallable(functions, 'registerPayouts');

  const payNow = async () => {
    const orderIds = Object.keys(selected).filter(id => selected[id]);
    if (orderIds.length === 0) {
      toast.error('Selecciona al menos una orden para registrar el pago.');
      return;
    }
    setPaying(true);
    try {
      const result = await registerPayouts({ orderIds, period, reference: reference || `${period}-${new Date().toISOString().split('T')[0]}` }) as any;
      toast.success(`Pago registrado. Proveedor: ${formatCOP(result.data.totalProviders)} · Vendedor: ${formatCOP(result.data.totalDropshippers)} · Plataforma: ${formatCOP(result.data.totalPlatformNet)}.`);
      setSelected({});
      setReference('');
    } catch (err: any) {
      toast.error(err?.message || 'No fue posible registrar el batch de pago.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Resumen histórico */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='bg-white border border-luxury-silver p-4 shadow-luxury'>
          <p className='text-[9px] uppercase tracking-widest text-gray-400'>Batches ejecutados</p>
          <p className='mt-1 text-2xl font-montserrat font-light text-luxury-black'>{batchTotal.batches}</p>
        </div>
        <div className='bg-white border border-luxury-silver p-4 shadow-luxury'>
          <p className='text-[9px] uppercase tracking-widest text-gray-400'>Pagado a proveedores</p>
          <p className='mt-1 text-lg font-montserrat font-light text-luxury-black'>{formatCOP(batchTotal.providers)}</p>
        </div>
        <div className='bg-white border border-luxury-silver p-4 shadow-luxury'>
          <p className='text-[9px] uppercase tracking-widest text-gray-400'>Comisiones a vendedores</p>
          <p className='mt-1 text-lg font-montserrat font-light text-luxury-black'>{formatCOP(batchTotal.dropshippers)}</p>
        </div>
        <div className='bg-white border border-luxury-silver p-4 shadow-luxury'>
          <p className='text-[9px] uppercase tracking-widest text-gray-400'>Utilidad neta plataforma</p>
          <p className='mt-1 text-lg font-montserrat font-light text-luxury-black'>{formatCOP(batchTotal.platform)}</p>
        </div>
      </div>

      {/* Batch actual */}
      <div className='bg-white border border-luxury-silver p-6 shadow-luxury rounded-none'>
        <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
          <div className='flex items-center gap-2'>
            <Wallet className='h-5 w-5 text-luxury-gold' />
            <h3 className='font-montserrat text-lg font-light text-luxury-black'>Batch de pago {period}</h3>
          </div>
          <div className='flex items-center gap-2'>
            <select value={period} onChange={e => setPeriod(e.target.value as 'martes' | 'viernes')} className='rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-xs'>
              <option value='martes'>Martes</option>
              <option value='viernes'>Viernes</option>
            </select>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder='Referencia Nequi/banco' className='rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-xs w-48' />
            <button onClick={payNow} disabled={paying} className='border border-luxury-gold bg-luxury-black px-4 py-2 text-xs uppercase tracking-widest text-white hover:bg-white hover:text-luxury-black disabled:opacity-50'>
              {paying ? 'Registrando...' : `Registrar pago · ${Object.keys(selected).filter(k => selected[k]).length} órdenes`}
            </button>
          </div>
        </div>

        {loading ? (
          <div className='flex justify-center py-6'><div className='h-6 w-6 animate-spin rounded-full border-2 border-luxury-gold border-t-transparent'></div></div>
        ) : readyOrders.length === 0 ? (
          <p className='text-xs text-gray-400 font-light'>No hay órdenes entregadas pendientes por pagar.</p>
        ) : (
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='border-b border-luxury-silver text-[10px] uppercase tracking-widest text-gray-400'>
                <th className='py-2 px-2'><input type='checkbox' onChange={e => { const next: Record<string, boolean> = {}; readyOrders.forEach(o => next[o.id] = e.target.checked); setSelected(next); }} checked={Object.keys(selected).length === readyOrders.length && readyOrders.length > 0} /></th>
                <th className='py-2 px-2'>Orden</th>
                <th className='py-2 px-2'>Proveedor</th>
                <th className='py-2 px-2'>Vendedor</th>
                <th className='py-2 px-2'>Plataforma</th>
                <th className='py-2 px-2'>Entregado</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-luxury-off-white text-xs font-light'>
              {readyOrders.map(order => {
                const prov = Math.max(0, (Number(order.providerCost) || Number(order.subtotal) || Number(order.total) || 0) - (Number(order.wholesaleCommission) || 0));
                const dropper = Number(order.dropshipperCommission) || 0;
                const platform = (Number(order.total) || 0) - prov - dropper;
                return (
                  <tr key={order.id} className='hover:bg-luxury-off-white/40'>
                    <td className='py-3 px-2'><input type='checkbox' checked={selected[order.id] || false} onChange={e => setSelected(s => ({ ...s, [order.id]: e.target.checked }))} /></td>
                    <td className='py-3 px-2 font-mono text-[10px]'>#{order.id.slice(0, 6)} <span className='text-luxury-gold uppercase ml-1'>{order.type}</span></td>
                    <td className='py-3 px-2'>{formatCOP(prov)}</td>
                    <td className='py-3 px-2'>{formatCOP(dropper)}</td>
                    <td className='py-3 px-2 font-medium text-luxury-black'>{formatCOP(platform)}</td>
                    <td className='py-3 px-2 text-gray-500'>{formatDate(order.deliveredAt)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className='border-t-2 border-luxury-silver text-xs font-medium'>
                <td colSpan={2} className='py-3 px-2 uppercase tracking-widest text-[10px] text-gray-400'>Total seleccionado</td>
                <td className='py-3 px-2'>{formatCOP(totals.providers)}</td>
                <td className='py-3 px-2'>{formatCOP(totals.dropshippers)}</td>
                <td className='py-3 px-2'>{formatCOP(totals.platform)}</td>
                <td className='py-3 px-2 text-gray-400'>{Object.keys(selected).filter(k => selected[k]).length} ord.</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Histórico de batches */}
      <div className='bg-white border border-luxury-silver p-6 shadow-luxury rounded-none'>
        <div className='flex items-center gap-2 mb-3'>
          <FileText className='h-4 w-4 text-luxury-gold' />
          <h3 className='font-montserrat text-base font-light text-luxury-black'>Historial de pagos ejecutados</h3>
        </div>
        {batches.length === 0 ? (
          <p className='text-xs text-gray-400 font-light'>Aún no se ha registrado ningún batch de pago.</p>
        ) : (
          <div className='space-y-2'>
            {batches.map(batch => (
              <div key={batch.id} className='flex flex-wrap justify-between items-center border border-luxury-silver p-3 text-xs'>
                <div>
                  <p className='font-medium text-luxury-black'>{batch.period.toUpperCase()} · {batch.date}</p>
                  <p className='text-[10px] text-gray-400'>Ref: {batch.reference} · {batch.orderIds?.length} órdenes</p>
                </div>
                <div className='flex gap-4 text-[10px] text-gray-600'>
                  <span>Proveedores: <strong className='text-luxury-black'>{formatCOP(batch.totalProvidersAmount)}</strong></span>
                  <span>Vendedores: <strong className='text-luxury-black'>{formatCOP(batch.totalDropshippersAmount)}</strong></span>
                  <span>Plataforma: <strong className='text-green-600'>{formatCOP(batch.totalPlatformNet)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagadas recientemente */}
      <div className='bg-white border border-luxury-silver p-6 shadow-luxury rounded-none'>
        <div className='flex items-center gap-2 mb-3'>
          <CheckCircle2 className='h-4 w-4 text-green-500' />
          <h3 className='font-montserrat text-base font-light text-luxury-black'>Últimas órdenes pagadas</h3>
        </div>
        {paidOrders.length === 0 ? (
          <p className='text-xs text-gray-400 font-light'>No hay pagos ejecutados recientemente.</p>
        ) : (
          <div className='space-y-2'>
            {paidOrders.slice(0, 20).map(order => (
              <div key={order.id} className='flex justify-between border border-luxury-silver p-3 text-xs'>
                <div>
                  <p className='font-mono text-[10px] text-gray-400'>#{order.id.slice(0, 6)}</p>
                  <p>Total entrega: {formatCOP(order.total)}</p>
                  <p className='text-[10px] text-purple-500'>{order.dropshipperName && `Vendedor: ${order.dropshipperName}`}</p>
                </div>
                <div className='text-right text-[10px] text-gray-500'>
                  <p>Ref: {order.payoutReference}</p>
                  <p>Pagado: {formatDate(order.providerPaidAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutsPanel;
