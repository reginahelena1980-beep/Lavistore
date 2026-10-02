/// <reference types="vite/client" />

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

interface Window {
  MercadoPago?: any;
  paymentBrickController?: any;
  __mercadoPagoInstance?: any;
  MP_DEVICE_SESSION_ID?: string;
  cleanCustomerCpf?: (value?: string | number | null) => string;
  cleanCpf?: (value?: string | number | null) => string;
}

