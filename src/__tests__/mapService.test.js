import { describe, it, expect, vi, beforeEach } from 'vitest';

// Captured at module-import time, so it survives the vi.clearAllMocks() below.
const iconState = vi.hoisted(() => ({ merged: null }));

vi.mock('leaflet', () => {
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    removeLayer: vi.fn(),
    fitBounds: vi.fn(),
  };
  // A fresh object per L.marker() call, so the registry holds distinct markers.
  const newMarker = () => {
    const marker = {
      addTo: vi.fn(() => marker),
      bindPopup: vi.fn(() => marker),
      setPopupContent: vi.fn(() => marker),
      openPopup: vi.fn(() => marker),
    };
    return marker;
  };
  return {
    default: {
      map: vi.fn(() => mapInstance),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      marker: vi.fn(() => newMarker()),
      featureGroup: vi.fn((layers) => ({
        getBounds: vi.fn(() => ({ layers })),
      })),
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

  it('renderStoredMarkers calls renderMarker for each workout', () => {
    const r1 = new Running([51.5, -0.09], 5, 30, 160);
    const r2 = new Running([51.6, -0.1], 8, 45, 180);
    service.renderStoredMarkers([r1, r2]);
    expect(L.marker).toHaveBeenCalledTimes(2);
  });

  it('removeMarker removes only that workout layer', () => {
    const r1 = new Running([51.5, -0.09], 5, 30, 160);
    const r2 = new Running([51.6, -0.1], 8, 45, 180);
    service.renderMarker(r1);
    service.renderMarker(r2);

    const firstMarker = L.marker.mock.results[0].value;
    service.removeMarker(r1.id);

    const mapInstance = L.map.mock.results[0].value;
    expect(mapInstance.removeLayer).toHaveBeenCalledTimes(1);
    expect(mapInstance.removeLayer).toHaveBeenCalledWith(firstMarker);
  });

  it('removeMarker ignores an unknown id', () => {
    service.renderMarker(new Running([51.5, -0.09], 5, 30, 160));
    service.removeMarker('not-a-real-id');
    expect(L.map.mock.results[0].value.removeLayer).not.toHaveBeenCalled();
  });

  it('removeAllMarkers clears every layer', () => {
    service.renderMarker(new Running([51.5, -0.09], 5, 30, 160));
    service.renderMarker(new Running([51.6, -0.1], 8, 45, 180));

    service.removeAllMarkers();

    const mapInstance = L.map.mock.results[0].value;
    expect(mapInstance.removeLayer).toHaveBeenCalledTimes(2);

    // Registry is empty, so a second sweep is a no-op.
    service.removeAllMarkers();
    expect(mapInstance.removeLayer).toHaveBeenCalledTimes(2);
  });

  it('moveToWorkout opens that workout popup', () => {
    const r = new Running([51.5, -0.09], 5, 30, 160);
    service.renderMarker(r);
    const marker = L.marker.mock.results[0].value;
    marker.openPopup.mockClear();

    service.moveToWorkout(r);

    expect(marker.openPopup).toHaveBeenCalledTimes(1);
  });

  it('fitToWorkouts fits the bounds of every marker', () => {
    service.renderMarker(new Running([51.5, -0.09], 5, 30, 160));
    service.renderMarker(new Running([51.6, -0.1], 8, 45, 180));

    service.fitToWorkouts();

    expect(L.featureGroup).toHaveBeenCalledWith([
      L.marker.mock.results[0].value,
      L.marker.mock.results[1].value,
    ]);
    expect(L.map.mock.results[0].value.fitBounds).toHaveBeenCalled();
  });

  it('fitToWorkouts is a no-op with no markers', () => {
    service.fitToWorkouts();
    expect(L.map.mock.results[0].value.fitBounds).not.toHaveBeenCalled();
  });

  describe('cached position', () => {
    const cacheKey = 'lastPosition';

    it('reuses a fresh cached position without prompting', async () => {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ coords: [51.5, -0.09], savedAt: Date.now() })
      );
      const geo = navigator.geolocation.getCurrentPosition;
      geo.mockClear();

      const svc = new MapService({ onMapClick: vi.fn() });
      await svc.init();

      expect(L.map).toHaveBeenCalled();
      // Only the background refresh, not a blocking prompt.
      expect(geo).toHaveBeenCalledTimes(1);
    });

    it('ignores a cached position older than the TTL', async () => {
      const stale = Date.now() - MapService.CACHE_TTL_MS - 1;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ coords: [1, 2], savedAt: stale })
      );

      const svc = new MapService({ onMapClick: vi.fn() });
      await svc.init();

      // Fell through to a fresh lookup, which the setup resolves at 51.5/-0.09.
      expect(L.map.mock.results.at(-1).value.setView).toHaveBeenCalledWith(
        [51.5, -0.09],
        expect.any(Number)
      );
    });

    it('accepts a legacy array entry that predates the timestamp', async () => {
      localStorage.setItem(cacheKey, JSON.stringify([10, 20]));

      const svc = new MapService({ onMapClick: vi.fn() });
      await svc.init();

      expect(L.map.mock.results.at(-1).value.setView).toHaveBeenCalledWith(
        [10, 20],
        expect.any(Number)
      );
    });

    it('rewrites the cache in the timestamped shape', async () => {
      localStorage.setItem(cacheKey, JSON.stringify([10, 20]));

      const svc = new MapService({ onMapClick: vi.fn() });
      await svc.init();

      const stored = JSON.parse(localStorage.getItem(cacheKey));
      expect(stored.coords).toEqual([51.5, -0.09]);
      expect(typeof stored.savedAt).toBe('number');
    });

    it('stores the cached position coarsened to ~1km', async () => {
      localStorage.clear();
      navigator.geolocation.getCurrentPosition.mockImplementation((success) =>
        success({ coords: { latitude: 51.5074321, longitude: -0.1277653 } })
      );

      const svc = new MapService({ onMapClick: vi.fn() });
      await svc.init();

      const stored = JSON.parse(localStorage.getItem(cacheKey));
      expect(stored.coords).toEqual([51.51, -0.13]);
    });

    it('still centres the map on the precise position for this visit', async () => {
      localStorage.clear();
      navigator.geolocation.getCurrentPosition.mockImplementation((success) =>
        success({ coords: { latitude: 51.5074321, longitude: -0.1277653 } })
      );

      const svc = new MapService({ onMapClick: vi.fn() });
      await svc.init();

      expect(L.map.mock.results.at(-1).value.setView).toHaveBeenCalledWith(
        [51.5074321, -0.1277653],
        expect.any(Number)
      );
    });

    it('ignores a malformed cache entry', async () => {
      localStorage.setItem(cacheKey, '{"coords":"nope"}');

      const svc = new MapService({ onMapClick: vi.fn() });
      await expect(svc.init()).resolves.toBeUndefined();
      expect(L.map.mock.results.at(-1).value.setView).toHaveBeenCalledWith(
        [51.5, -0.09],
        expect.any(Number)
      );
    });
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

  it('pans without animation when the user prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );
    const r = new Running([51.5, -0.09], 5, 30, 160);
    service.moveToWorkout(r);

    const mapInstance = L.map.mock.results[0].value;
    expect(mapInstance.setView).toHaveBeenCalledWith(
      r.coords,
      expect.any(Number),
      expect.objectContaining({ animate: false })
    );
    vi.unstubAllGlobals();
  });

  it('treats a missing matchMedia as no reduced-motion preference', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(MapService.prefersReducedMotion()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('isReady is false before init and true after', async () => {
    localStorage.setItem('lastPosition', JSON.stringify([51.5, -0.09]));
    const pending = new MapService({ onMapClick: vi.fn() });
    expect(pending.isReady).toBe(false);
    await pending.init();
    expect(pending.isReady).toBe(true);
  });

  it('moveToWorkout before init does not throw and replays once ready', async () => {
    localStorage.setItem('lastPosition', JSON.stringify([51.5, -0.09]));
    const pending = new MapService({ onMapClick: vi.fn() });
    const r = new Running([51.5, -0.09], 5, 30, 160);

    expect(() => pending.moveToWorkout(r)).not.toThrow();

    await pending.init();
    const mapInstance = L.map.mock.results.at(-1).value;
    expect(mapInstance.setView).toHaveBeenCalledWith(
      r.coords,
      expect.any(Number),
      expect.any(Object)
    );
  });

  it('renderMarker before init is queued until the map exists', async () => {
    localStorage.setItem('lastPosition', JSON.stringify([51.5, -0.09]));
    const pending = new MapService({ onMapClick: vi.fn() });
    const r = new Running([51.5, -0.09], 5, 30, 160);

    pending.renderMarker(r);
    expect(L.marker).not.toHaveBeenCalled();

    await pending.init();
    expect(L.marker).toHaveBeenCalledWith(r.coords);
  });
});
