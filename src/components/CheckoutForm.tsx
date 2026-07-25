import React, { useState, useMemo, useEffect } from 'react';
import { CartItem } from '../types';
import { auth, db, functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { CheckCircleIcon, GiftIcon } from './Icons';
import { MapPin, Truck, Tag, CreditCard, ChevronRight, ArrowLeft, CheckCircle2, User } from 'lucide-react';
import { useVendorRef } from '../context/VendorRefContext';

declare const WidgetCheckout: any;

interface CheckoutFormProps {
  cart: CartItem[];
  cartTotal: number;
  onBackToCart: () => void;
  onOrderSuccess: () => void;
}

const DEFAULT_SHIPPING_COSTS = {
  BOGOTA: 10000,
  OTHER: 15000,
};

interface Coupon { code: string; type: 'shipping' | 'percent'; value?: number; active?: boolean }

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const CheckoutForm: React.FC<CheckoutFormProps> = ({ cart, cartTotal, onBackToCart, onOrderSuccess }) => {
  const { vendorRef, vendorName } = useVendorRef();
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', city: '', email: '' });
  const [shippingOption, setShippingOption] = useState<'BOGOTA' | 'OTHER' | ''>('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingCosts, setShippingCosts] = useState(DEFAULT_SHIPPING_COSTS);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getDoc(doc(db, 'settings', 'shipping'));
        if (settings.exists()) setShippingCosts({ BOGOTA: Number(settings.data().bogota) || DEFAULT_SHIPPING_COSTS.BOGOTA, OTHER: Number(settings.data().other) || DEFAULT_SHIPPING_COSTS.OTHER });
        const coupons = await getDocs(collection(db, 'coupons'));
        setAvailableCoupons(coupons.docs.map(item => item.data() as Coupon).filter(item => item.active !== false));
      } catch { /* valores seguros por defecto */ }
    })();
  }, []);

  // Auto-seleccionar envío basado en la ciudad
  useEffect(() => {
    const cityNormalized = customer.city.trim().toLowerCase();
    if (cityNormalized === 'bogota' || cityNormalized === 'bogotá') {
      setShippingOption('BOGOTA');
    } else if (cityNormalized) {
      setShippingOption('OTHER');
    } else {
      setShippingOption('');
    }
  }, [customer.city]);

  const shippingCost = useMemo(() => {
    if (!shippingOption) return 0;
    return couponApplied && availableCoupons.find(item => item.code.toUpperCase() === coupon.toUpperCase())?.type === 'shipping' ? 0 : shippingCosts[shippingOption];
  }, [shippingOption, couponApplied, availableCoupons, coupon, shippingCosts]);

  const finalTotal = Math.max(0, cartTotal - discount + shippingCost);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer({ ...customer, [name]: value });
  };

  const handleApplyCoupon = () => {
    setCouponMsg('');
    setCouponError('');
    const found = availableCoupons.find(item => item.code.toUpperCase() === coupon.trim().toUpperCase());
    if (found) {
      setCouponApplied(true);
      setDiscount(found.type === 'percent' ? Math.round(cartTotal * (Number(found.value) / 100)) : 0);
      setCouponMsg(found.type === 'shipping' ? '¡Envío gratis aplicado!' : `¡Descuento del ${found.value}% aplicado!`);
    } else {
      setCouponError('Cupón no válido o expirado.');
    }
  };

  const handlePayment = async () => {
    if (!customer.name || !customer.phone || !customer.address || !customer.city || !customer.email || !shippingOption) {
      alert('Por favor, completa todos los campos y selecciona una opción de envío.');
      return;
    }
    setIsProcessing(true);
    const user = auth.currentUser;
    if (!user) {
      alert('Inicia sesión antes de confirmar tu pedido.');
      setIsProcessing(false);
      return;
    }
    try {
      const createOrder = httpsCallable(functions, 'createCheckoutOrder');
      const response = await createOrder({
        customer,
        items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
        shippingOption,
        coupon: couponApplied ? coupon : undefined,
        dropshipperRef: vendorRef || undefined,
      });
      const { orderId, amountInCents } = response.data as { orderId: string; amountInCents: number };

      const checkout = new WidgetCheckout({
        currency: 'COP',
        amountInCents,
        reference: orderId,
        publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY,
        redirectUrl: 'https://lilutecno.com/confirmacion-pago',
      });

      checkout.open(function () {
        onOrderSuccess();
      });
    } catch (error) {
      console.error('Error al crear el pedido o iniciar el pago: ', error);
      alert('Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#ff7a00]/60 focus:outline-none focus:bg-white/[.09] transition-all duration-200";

  return (
    <div className="checkout-form px-2 sm:px-4 py-6 space-y-8">
      {/* Banner: comprando con vendedor */}
      {vendorRef && vendorName && (
        <div className="rounded-2xl border border-purple-400/40 bg-purple-500/10 p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-[#ff7a00]">
            <User className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold">Comprando con {vendorName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tu pedido apoyará a este vendedor. ¡Gracias!</p>
          </div>
        </div>
      )}

      {/* Sección: Datos personales */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a00] to-[#7b2cbf]">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-montserrat text-base font-semibold text-white tracking-wide">Información de Envío</h3>
        </div>
        <div className="space-y-3">
          <input id="checkout-name" type="text" name="name" placeholder="Nombre completo *" value={customer.name} onChange={handleInputChange} className={inputClass} />
          <input id="checkout-email" type="email" name="email" placeholder="Correo electrónico *" value={customer.email} onChange={handleInputChange} className={inputClass} />
          <input id="checkout-phone" type="tel" name="phone" placeholder="Teléfono de contacto *" value={customer.phone} onChange={handleInputChange} className={inputClass} />
          <input id="checkout-address" type="text" name="address" placeholder="Dirección de entrega *" value={customer.address} onChange={handleInputChange} className={inputClass} />
          <input id="checkout-city" type="text" name="city" placeholder="Ciudad *" value={customer.city} onChange={handleInputChange} className={inputClass} />
        </div>
      </div>

      {/* Sección: Envío */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7b2cbf] to-[#ff7a00]">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-montserrat text-base font-semibold text-white tracking-wide">Opción de Envío</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            id="checkout-shipping-bogota"
            onClick={() => setShippingOption('BOGOTA')}
            className={`rounded-2xl border p-4 text-left transition-all duration-300 ${shippingOption === 'BOGOTA'
              ? 'border-[#ff7a00]/60 bg-gradient-to-br from-[#ff7a00]/30 to-[#7b2cbf]/20 shadow-[0_0_24px_rgba(255,122,0,.25)]'
              : 'border-white/10 bg-white/[.04] hover:border-[#ff7a00]/30 hover:bg-white/[.07]'}`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white text-sm">Bogotá</p>
              {shippingOption === 'BOGOTA' && <CheckCircle2 className="h-4 w-4 text-[#ff7a00]" />}
            </div>
            <p className={`mt-1.5 text-sm font-bold ${shippingOption === 'BOGOTA' ? 'text-[#ff7a00]' : 'text-slate-400'}`}>
              {fmt(shippingCosts.BOGOTA)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Entrega en 24-48 horas</p>
          </button>

          <button
            id="checkout-shipping-other"
            onClick={() => setShippingOption('OTHER')}
            className={`rounded-2xl border p-4 text-left transition-all duration-300 ${shippingOption === 'OTHER'
              ? 'border-[#7b2cbf]/60 bg-gradient-to-br from-[#7b2cbf]/30 to-[#ff7a00]/20 shadow-[0_0_24px_rgba(123,44,191,.25)]'
              : 'border-white/10 bg-white/[.04] hover:border-[#7b2cbf]/30 hover:bg-white/[.07]'}`}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white text-sm">Otras ciudades</p>
              {shippingOption === 'OTHER' && <CheckCircle2 className="h-4 w-4 text-[#7b2cbf]" />}
            </div>
            <p className={`mt-1.5 text-sm font-bold ${shippingOption === 'OTHER' ? 'text-[#c084fc]' : 'text-slate-400'}`}>
              {fmt(shippingCosts.OTHER)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Entrega en 3-5 días hábiles</p>
          </button>
        </div>
      </div>

      {/* Sección: Cupón */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <Tag className="h-4 w-4 text-slate-300" />
          </div>
          <h3 className="font-montserrat text-base font-semibold text-white tracking-wide">Cupón de Descuento</h3>
        </div>
        <div className="flex gap-2">
          <input
            id="checkout-coupon"
            type="text"
            placeholder="Ej: ENVIOGRATIS"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            disabled={couponApplied}
            className={`flex-grow rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#ff7a00]/60 focus:outline-none transition-all duration-200 disabled:opacity-50`}
          />
          <button
            id="checkout-coupon-btn"
            onClick={handleApplyCoupon}
            disabled={couponApplied || !coupon}
            className="flex items-center gap-2 rounded-xl border border-[#ff7a00]/40 bg-[#ff7a00]/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#ff7a00] hover:bg-[#ff7a00]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {couponApplied ? <CheckCircleIcon className="w-4 h-4" /> : <GiftIcon className="w-4 h-4" />}
            {couponApplied ? 'Aplicado' : 'Aplicar'}
          </button>
        </div>
        {couponMsg && <p className="mt-2 text-xs text-emerald-400 font-medium">{couponMsg}</p>}
        {couponError && <p className="mt-2 text-xs text-red-400 font-medium">{couponError}</p>}
      </div>

      {/* Resumen del pedido */}
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5 space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Resumen</h4>

        {cart.map(item => (
          <div key={item.id} className="flex justify-between text-xs text-slate-300">
            <span className="truncate max-w-[60%]">{item.name} <span className="text-slate-500">×{item.quantity}</span></span>
            <span>{fmt(item.price * item.quantity)}</span>
          </div>
        ))}

        <div className="my-2 border-t border-white/10" />

        <div className="flex justify-between text-sm text-slate-300">
          <span>Subtotal</span>
          <span>{fmt(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Envío {shippingOption === 'BOGOTA' ? '(Bogotá)' : shippingOption === 'OTHER' ? '(Otras ciudades)' : ''}</span>
          <span className={shippingCost === 0 && couponApplied ? 'line-through text-slate-500' : ''}>
            {shippingOption ? fmt(shippingCosts[shippingOption]) : '—'}
          </span>
        </div>
        {couponApplied && shippingCost === 0 && (
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Envío (cupón)</span>
            <span className="font-semibold">GRATIS</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Descuento</span>
            <span className="font-semibold">-{fmt(discount)}</span>
          </div>
        )}

        <div className="border-t border-white/10 pt-3 flex justify-between font-montserrat text-xl text-white font-light">
          <span>Total</span>
          <span className="text-[#ff7a00] font-bold">{fmt(finalTotal)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="space-y-3 pt-2">
        <button
          id="checkout-pay-btn"
          onClick={handlePayment}
          disabled={isProcessing || !shippingOption}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff7a00] to-[#7b2cbf] py-4 text-sm font-bold text-white uppercase tracking-widest shadow-[0_8px_28px_rgba(255,122,0,.35)] hover:shadow-[0_12px_36px_rgba(255,122,0,.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CreditCard className="h-5 w-5" />
          {isProcessing ? 'Procesando...' : `Pagar ${fmt(finalTotal)}`}
          {!isProcessing && <ChevronRight className="h-4 w-4" />}
        </button>
        <button
          id="checkout-back-btn"
          onClick={onBackToCart}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] py-3.5 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al carrito
        </button>
      </div>
    </div>
  );
};

export default CheckoutForm;
