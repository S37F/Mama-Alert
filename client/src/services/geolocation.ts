export interface GeoPosition {
  lat: number
  lng: number
  accuracyM: number | null
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        })
      },
      (err) => {
        reject(err)
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  })
}
