/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_AUTH_MODE?: string;
  readonly VITE_OBSERVABILITY_MODE?: string;
  readonly VITE_BOOKING_BASE_PATH?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
