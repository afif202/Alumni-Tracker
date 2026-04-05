// Frontend configuration and constants

const CONFIG = {
  API_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api',
  ITEMS_PER_PAGE: 50,
  
  // Status mappings
  STATUS_CONFIG: {
    'Teridentifikasi': { class: 'status-teridentifikasi', icon: 'fa-circle-check' },
    'Perlu Verifikasi Manual': { class: 'status-perlu-verifikasi', icon: 'fa-circle-exclamation' },
    'Belum Ditemukan': { class: 'status-belum-ditemukan', icon: 'fa-circle-xmark' },
    'Belum Dilacak': { class: 'status-belum-dilacak', icon: 'fa-circle-minus' }
  },
  
  // Kategori mappings
  KATEGORI_CONFIG: {
    'PNS': { class: 'kategori-pns' },
    'Swasta': { class: 'kategori-swasta' },
    'Wirausaha': { class: 'kategori-wirausaha' },
    'Belum Diketahui': { class: 'kategori-belum' }
  },
  
  // Confidence score classes
  CONFIDENCE_CLASSES: {
    high: { min: 0.8, class: 'high' },
    medium: { min: 0.5, class: 'med' },
    low: { min: 0, class: 'low' }
  }
};

// Export to global
window.CONFIG = CONFIG;