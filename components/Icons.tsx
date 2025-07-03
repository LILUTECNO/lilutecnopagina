import React from 'react';

// Props for icons
interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const SearchIcon: React.FC<IconProps> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
  </svg>
);

export const FilterIcon: React.FC<IconProps> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"></path>
  </svg>
);

export const ShoppingCartIcon: React.FC<IconProps> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0H17M9 18h8"></path>
  </svg>
);

export const WhatsAppIcon: React.FC<IconProps> = (props) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"></path>
  </svg>
);

export const WhatsAppIconSmall: React.FC<IconProps> = (props) => ( // Slightly different path for floating button
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.98 2.7 15.95 3.71 17.61L2.05 22L6.59 20.33C8.16 21.23 10.05 21.78 12.04 21.78H12.05C17.5 21.78 21.95 17.33 21.95 11.87C21.95 6.41 17.5 2 12.04 2M17 14.28C16.73 14.15 15.42 13.5 15.18 13.41C14.94 13.32 14.76 13.28 14.58 13.55C14.4 13.82 13.91 14.41 13.77 14.59C13.63 14.77 13.49 14.79 13.22 14.66C12.95 14.53 11.81 14.12 10.42 12.89C9.32 11.91 8.65 10.74 8.47 10.47C8.29 10.2 8.41 10.08 8.54 9.95C8.66 9.84 8.81 9.66 8.95 9.5C9.09 9.34 9.14 9.22 9.23 9.04C9.32 8.86 9.28 8.7 9.21 8.57C9.14 8.44 8.55 6.95 8.31 6.39C8.07 5.83 7.84 5.7 7.62 5.7C7.42 5.7 7.21 5.7 7.01 5.7C6.81 5.7 6.5 5.8 6.27 6.07C6.04 6.34 5.38 6.94 5.38 8.24C5.38 9.54 6.29 10.74 6.43 10.92C6.57 11.1 7.92 13.23 10.05 14.17C11.39 14.81 11.98 15.04 12.42 15.18C12.93 15.34 13.62 15.29 14.05 15.03C14.53 14.73 15.3 14.07 15.52 13.56C15.74 13.05 15.74 12.61 15.65 12.48C15.56 12.35 15.34 12.26 15.07 12.13C14.8 12 17.25 14.41 17 14.28Z"></path>
    </svg>
);


export const CloseIcon: React.FC<IconProps> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
);

export const TrashIcon: React.FC<IconProps> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
  </svg>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
  </svg>
);

export const MinusIcon: React.FC<IconProps> = (props) => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6"></path>
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = (props) => (
  <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
  </svg>
);

export const XCircleIcon: React.FC<IconProps> = (props) => (
  <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
  </svg>
);

export const InformationCircleIcon: React.FC<IconProps> = (props) => (
  <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
  </svg>
);

export const ShoppingBagIcon: React.FC<IconProps> = (props) => (
    <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

export const SparklesIcon: React.FC<IconProps> = (props) => (
    <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 9a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM9 2a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6H6a1 1 0 010-2h1V3a1 1 0 011-1zm0 9a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H6a1 1 0 110-2h1v-1a1 1 0 011-1zm6-9a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h1V3a1 1 0 011-1zm0 9a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

export const TagIcon: React.FC<IconProps> = (props) => (
    <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
);

export const ClockIcon: React.FC<IconProps> = (props) => (
    <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
    <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
);

export const FireIcon: React.FC<IconProps> = (props) => (
    <svg fill="currentColor" stroke="currentColor" strokeWidth="0.5" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
    </svg>
);

export const HdmiIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 7V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v3" />
    <path d="M15 17v2a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-2" />
    <path d="M6 7h12v10H6z" />
  </svg>
);

export const BluetoothIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m7 7 10 10-5 5V2l5 5L7 17"></path>
  </svg>
);

export const LiluTecnoLogoIcon: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...rest }) => (
    <span className={`font-black text-3xl ${className || ''}`} {...rest}>
      L
    </span>
);