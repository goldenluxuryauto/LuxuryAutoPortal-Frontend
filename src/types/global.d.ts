declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        LatLng: any;
        Marker: any;
        InfoWindow: any;
        SymbolPath: any;
        event: any;
        geometry: any;
        places: any;
      };
    };
    initGoogleMaps: () => void;
  }
}

export {};