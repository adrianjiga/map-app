import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet guesses its icon path by reading the background-image of the
// .leaflet-default-icon-path rule. Vite inlines that PNG as a data URI, which
// defeats the guess and yields 404s in the production build, so point Leaflet
// at the bundler-resolved URLs instead.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export class MapService {
  #map;
  #mapZoomLevel = 13;
  #onMapClick;

  constructor({ onMapClick }) {
    this.#onMapClick = onMapClick;
  }

  #CACHED_COORDS_KEY = 'lastPosition';

  init() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const cached = localStorage.getItem(this.#CACHED_COORDS_KEY);
      if (cached) {
        this.#initMap(JSON.parse(cached));
        resolve();
        // Refresh coords in background for next visit
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          localStorage.setItem(
            this.#CACHED_COORDS_KEY,
            JSON.stringify([latitude, longitude])
          );
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          localStorage.setItem(
            this.#CACHED_COORDS_KEY,
            JSON.stringify([latitude, longitude])
          );
          this.#initMap([latitude, longitude]);
          resolve();
        },
        () => reject(new Error('Could not get your position'))
      );
    });
  }

  #initMap(coords) {
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', (mapEvent) => this.#onMapClick(mapEvent));
  }

  renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 280,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: workout.constructor.popupClass,
        })
      )
      .setPopupContent(`${workout.emoji} ${workout.description}`)
      .openPopup();
  }

  moveToWorkout(workout) {
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  renderStoredMarkers(workouts) {
    workouts.forEach((workout) => this.renderMarker(workout));
  }
}
