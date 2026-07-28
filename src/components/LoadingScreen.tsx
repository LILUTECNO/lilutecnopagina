import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-luxury-off-white">
      <div className="flex flex-col items-center space-y-6">
        <span className="wordmark font-montserrat text-4xl font-black tracking-[0.2em] text-luxury-black animate-pulse">
          LILUTECNO
        </span>
        <div className="h-5 w-5 animate-spin rounded-full border border-luxury-gold border-t-transparent"></div>
        <p className="text-xs uppercase tracking-widest text-gray-400 font-light">
          Cargando Experiencia...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
