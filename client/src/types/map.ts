export interface MapPoint {
  id: string
  name: string
  lat: number
  lng: number
  /** Present for hospitals from admin map RPC when migration has been applied. */
  receive_alerts?: boolean
}
