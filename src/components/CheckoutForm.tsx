import React, { useState, useMemo, useEffect } from 'react';
import { CartItem } from '../types';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircleIcon, GiftIcon } from './Icons';

declare const WidgetCheckout: any;

interface CheckoutFormProps {
  cart: CartItem[];
  cartTotal: number;
  onBackToCart: () => void;
  onOrderSuccess: () => void;
}

const SHIPPING_COSTS = {
  BOGOTA: 10000,
  OTHER: 15000,
};

const VALID_COUPONS = ['LILUFREE', 'ENVIOGRATIS'];

const CheckoutForm: React.FC<CheckoutFormProps> = ({ cart, cartTotal, onBackToCart, onOrderSuccess }) => {
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', city: '', email: '' });
  const [shippingOption, setShippingOption] = useState<'BOGOTA' | 'OTHER' | ''>('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Efecto para auto-seleccionar el envío basado en la ciudad
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
    if (couponApplied || !shippingOption) return 0;
    return SHIPPING_COSTS[shippingOption];
  }, [shippingOption, couponApplied]);

  const finalTotal = cartTotal + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer({ ...customer, [name]: value });
  };

  const handleApplyCoupon = () => {
    if (VALID_COUPONS.includes(coupon.toUpperCase())) {
      setCouponApplied(true);
      alert('¡Cupón aplicado! Envío gratis.');
    } else {
      alert('Cupón no válido.');
    }
  };

  const handlePayment = async () => {
    if (!customer.name || !customer.phone || !customer.address || !customer.city || !customer.email || !shippingOption) {
      alert('Por favor, completa todos los campos y selecciona una opción de envío.');
      return;
    }
    setIsProcessing(true);

    try {
      const orderData = {
        customer,
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
        subtotal: cartTotal,
        shippingCost: couponApplied ? 0 : shippingCost,
        couponApplied: couponApplied ? coupon : 'N/A',
        total: finalTotal,
        status: 'pending_payment',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      const orderId = docRef.id;

      const checkout = new WidgetCheckout({
        currency: 'COP',
        amountInCents: Math.round(finalTotal * 100),
        reference: orderId,
        publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY,
        redirectUrl: 'https://lilutecno.com/confirmacion-pago',
      });

      checkout.open(function (result: any) {
        onOrderSuccess();
      });

    } catch (error) {
      console.error('Error al crear el pedido o iniciar el pago: ', error);
      alert('Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de Envío</h3>
      <div className="space-y-4">
        <input type="text" name="name" placeholder="Nombre completo *" value={customer.name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition" />
        <input type="email" name="email" placeholder="Correo electrónico *" value={customer.email} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition" />
        <input type="tel" name="phone" placeholder="Teléfono de contacto *" value={customer.phone} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition" />
        <input type="text" name="address" placeholder="Dirección de entrega *" value={customer.address} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition" />
        <input type="text" name="city" placeholder="Ciudad *" value={customer.city} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition" />
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Opción de Envío</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => setShippingOption('BOGOTA')} className={`p-4 border rounded-lg text-left transition-all duration-200 ${shippingOption === 'BOGOTA' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'bg-white hover:bg-gray-100'}`}>
          <p className="font-bold">Bogotá</p>
          <p className="text-sm">$10.000 COP</p>
        </button>
        <button onClick={() => setShippingOption('OTHER')} className={`p-4 border rounded-lg text-left transition-all duration-200 ${shippingOption === 'OTHER' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'bg-white hover:bg-gray-100'}`}>
          <p className="font-bold">Otra ciudad</p>
          <p className="text-sm">$15.000 COP</p>
        </button>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Cupón de Descuento</h3>
      <div className="flex gap-2">
        <input type="text" placeholder="Ej: ENVIOGRATIS" value={coupon} onChange={(e) => setCoupon(e.target.value)} disabled={couponApplied} className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-100" />
        <button onClick={handleApplyCoupon} disabled={couponApplied || !coupon} className="bg-gray-700 text-white px-4 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
          {couponApplied ? <CheckCircleIcon className="w-5 h-5"/> : <GiftIcon className="w-5 h-5"/>}
          {couponApplied ? 'Aplicado' : 'Aplicar'}
        </button>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span className="font-medium">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(cartTotal)}</span>
        </div>
        <div className={`flex justify-between text-gray-600 ${couponApplied ? 'line-through text-red-500' : ''}`}>
          <span>Envío:</span>
          <span className="font-medium">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(shippingOption ? SHIPPING_COSTS[shippingOption] : 0)}</span>
        </div>
        {couponApplied && (
            <div className="flex justify-between text-green-600">
                <span>Envío con cupón:</span>
                <span className="font-medium">$0</span>
            </div>
        )}
        <div className="flex justify-between font-bold text-xl mt-2 text-gray-800">
          <span>Total:</span>
          <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(finalTotal)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button onClick={handlePayment} disabled={isProcessing || !shippingOption} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-400 transition-colors text-lg">
          {isProcessing ? 'Procesando...' : `Pagar ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(finalTotal)}`}
        </button>
        <button onClick={onBackToCart} className="w-full text-center text-gray-600 hover:text-gray-800 font-medium">
          ← Volver al carrito
        </button>
      </div>
    </div>
  );
};

export default CheckoutForm;
