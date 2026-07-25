import React, { createContext, useContext, useState, useCallback } from 'react';

interface VendorRefContextType {
  /** slug del vendedor (su storeName) cuando un cliente entra desde /v/:slug */
  vendorRef: string | null;
  /** nombre legible del vendedor (opcional) */
  vendorName: string | null;
  setVendorRef: (ref: string | null, name?: string | null) => void;
  clearVendorRef: () => void;
}

const VendorRefContext = createContext<VendorRefContextType | undefined>(undefined);

export const VendorRefProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vendorRef, setVendorRefState] = useState<string | null>(localStorage.getItem('vendorRef') || null);
  const [vendorName, setVendorName] = useState<string | null>(localStorage.getItem('vendorName') || null);

  const setVendorRef = useCallback((ref: string | null, name: string | null = null) => {
    setVendorRefState(ref);
    setVendorName(name);
    if (ref) {
      localStorage.setItem('vendorRef', ref);
    } else {
      localStorage.removeItem('vendorRef');
    }
    if (name) {
      localStorage.setItem('vendorName', name);
    } else {
      localStorage.removeItem('vendorName');
    }
  }, []);

  const clearVendorRef = useCallback(() => setVendorRef(null, null), [setVendorRef]);

  return (
    <VendorRefContext.Provider value={{ vendorRef, vendorName, setVendorRef, clearVendorRef }}>
      {children}
    </VendorRefContext.Provider>
  );
};

export const useVendorRef = () => {
  const ctx = useContext(VendorRefContext);
  if (!ctx) throw new Error('useVendorRef must be used within VendorRefProvider');
  return ctx;
};
