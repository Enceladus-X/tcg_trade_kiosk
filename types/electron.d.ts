export {}

declare global {
  interface Window {
    electronAPI?: {
      verifyPin?: (pin: string) => Promise<boolean>
      openExternal?: (url: string) => Promise<boolean>
      getWindowMode?: () => Promise<'kiosk' | 'windowed'>
      setWindowMode?: (mode: 'kiosk' | 'windowed') => Promise<'kiosk' | 'windowed'>
    }
  }
}
