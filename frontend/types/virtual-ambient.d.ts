// Ambient module to satisfy TypeScript before @tanstack/react-virtual is installed.
// Replace with actual types once dependency is added.
declare module '@tanstack/react-virtual' {
  export const useVirtualizer: any;
}

