Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn(),
  },
  configurable: true,
  writable: true,
});
