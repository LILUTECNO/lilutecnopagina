import React from 'react';
import { WHATSAPP_NUMBER_LINK_BASE } from '../constants.ts';

const WhatsAppButton: React.FC = () => {
  return (
    <a
      href={WHATSAPP_NUMBER_LINK_BASE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 group"
    >
      {/* Anillo de pulso externo */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping" />

      {/* Botón principal */}
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/30 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[#25D366]/40 transition-all duration-300">
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.528 5.856L.057 23.286c-.083.34.235.643.57.55l5.584-1.467A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.87 0-3.618-.503-5.12-1.38l-.367-.216-3.813 1.003 1.018-3.71-.237-.38A9.799 9.799 0 012.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z" />
        </svg>
      </span>
    </a>
  );
};

export default WhatsAppButton;