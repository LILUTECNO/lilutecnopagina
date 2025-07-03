import React from 'react';
import { WHATSAPP_NUMBER_LINK_BASE } from '../constants.ts';
import { WhatsAppIcon } from './Icons.tsx';

const WhatsAppButton: React.FC = () => {
  return (
    <a
      href={WHATSAPP_NUMBER_LINK_BASE}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-green-500 to-teal-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:shadow-green-500/50 transition-all duration-300 ease-in-out animate-pulse-whatsapp"
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
    >
      <style>{`
        @keyframes pulseWhatsapp {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(37, 211, 102, 0); }
        }
        .animate-pulse-whatsapp {
          animation: pulseWhatsapp 2s infinite;
        }
      `}</style>
      <WhatsAppIcon className="h-8 w-8" />
    </a>
  );
};

export default WhatsAppButton;