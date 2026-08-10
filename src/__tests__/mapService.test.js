import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captured at module-import time, so it survives the vi.clearAllMocks() below.
const iconState = vi.hoisted(() => ({ merged: null }));

vi.mock('leaflet', () => {
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
  };
  const markerChain = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    setPopupContent: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
  };
  return {
    default: {
      map: vi.fn(() => mapInstance),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      marker: vi.fn(() => markerChain),
      popup: vi.fn((opts) => opts),
      Icon: {
        Default: {
          mergeOptions: vi.fn((options) => {
            iconState.merged = options;
          }),
        },
      },
    },
  };
});

import L from 'leaflet';
import { MapService } from '../map/MapService.js';
import { Running } from '../workouts/Running.js';

describe('MapService', () => {
  let service;
  let onMapClick;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mapDiv = document.createElement('div');
    mapDiv.id = 'map';
    document.body.appendChild(mapDiv);

    navigator.geolocation.getCurrentPosition.mockImplementation((success) =>
      success({ coords: { latitude: 51.5, longitude: -0.09 } })
    );

    onMapClick = vi.fn();
    service = new MapService({ onMapClick });
    await service.init();
  });

  it('init calls L.map with the map element id', () => {
    expect(L.map).toHaveBeenCalledWith('map');
  });

  it('init sets up a click handler that fires onMapClick', () => {
    const mapInstance = L.map.mock.results[0].value;
    expect(mapInstance.on).toHaveBeenCalledWith('click', expect.any(Function));

    const clickHandler = mapInstance.on.mock.calls[0][1];
    const fakeMapEvent = { latlng: { lat: 1, lng: 2 } };
    clickHandler(fakeMapEvent);
    expect(onMapClick).toHaveBeenCalledWith(fakeMapEvent);
  });

  it('renderMarker calls L.marker with workout coords', () => {
    const r = new Running([51.5, -0.09], 5, 30, 160);
    service.renderMarker(r);
    expect(L.marker).toHaveBeenCalledWith(r.coords);
  });

  it('renderMarker uses workout.constructor.popupClass', () => {
    const r = new Running([51.5, -0.09], 5, 30, 160);
    service.renderMarker(r);
    expect(L.popup).toHaveBeenCalledWith(
      expect.objectContaining({ className: 'running-popup' })
    );
  });

  it('moveToWorkout calls setView on the map instance', () => {
    const r = new Running([51.5, -0.09], 5, 30, 160);
    service.moveToWorkout(r);
    const mapInstance = L.map.mock.results[0].value;
    expect(mapInstance.setView).toHaveBeenCalledWith(
      r.coords,
      expect.any(Number),
      expect.any(Object)
    );
  });

  it('init rejects when geolocation is denied and no cached coords', async () => {
    localStorage.clear();
    navigator.geolocation.getCurrentPosition.mockImplementation((_, error) =>
      error(new Error('Denied'))
    );
    const failService = new MapService({ onMapClick: vi.fn() });
    await expect(failService.init()).rejects.toThrow();
  });

  it('init resolves immediately from cached coords on refresh', async () => {
    localStorage.setItem('lastPosition', JSON.stringify([51.5, -0.09]));
    navigator.geolocation.getCurrentPosition.mockImplementation(() => {});
    const cachedService = new MapService({ onMapClick: vi.fn() });
    await expect(cachedService.init()).resolves.toBeUndefined();
    expect(L.map).toHaveBeenCalled();
  });

  it('points Leaflet at bundler-resolved marker icons', () => {
    expect(iconState.merged).toEqual(
      expect.objectContaining({
        iconUrl: expect.any(String),
        iconRetinaUrl: expect.any(String),
        shadowUrl: expect.any(String),
      })
    );
  });

  it('renderStoredMarkers calls renderMarker for each workout', () => {
    const r1 = new Running([51.5, -0.09], 5, 30, 160);
    const r2 = new Running([51.6, -0.1], 8, 45, 180);
    service.renderStoredMarkers([r1, r2]);
    expect(L.marker).toHaveBeenCalledTimes(2);
  });
});
