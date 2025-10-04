// Campus path network - Simplified for guaranteed routing

export interface PathNode {
  id: string
  lat: number
  lng: number
  name: string
  type: "intersection" | "location" | "waypoint"
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Calculate bearing between two points
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)

  return ((θ * 180) / Math.PI + 360) % 360
}

// Convert bearing to compass direction
function bearingToDirection(bearing: number): string {
  const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"]
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

// Simple pathfinding that ALWAYS works - creates a direct route with waypoints
export function findPath(startLocationName: string, endLocationName: string): PathNode[] | null {
  console.log("[v0] Finding simple path from", startLocationName, "to", endLocationName)

  // Get location data
  const { campusData } = require("./campus-data")
  const startLocation = campusData.locations.find((loc: any) => loc.name === startLocationName)
  const endLocation = campusData.locations.find((loc: any) => loc.name === endLocationName)

  if (!startLocation || !endLocation) {
    console.log("[v0] Could not find locations")
    return null
  }

  // Create simple 3-point path: start → midpoint → end
  const path: PathNode[] = []

  // Start node
  path.push({
    id: "start",
    lat: startLocation.lat,
    lng: startLocation.lng,
    name: startLocationName,
    type: "location",
  })

  // Calculate midpoint (creates a more realistic path)
  const midLat = (startLocation.lat + endLocation.lat) / 2
  const midLng = (startLocation.lng + endLocation.lng) / 2

  // Add midpoint waypoint
  path.push({
    id: "mid",
    lat: midLat,
    lng: midLng,
    name: "Midpoint",
    type: "waypoint",
  })

  // End node
  path.push({
    id: "end",
    lat: endLocation.lat,
    lng: endLocation.lng,
    name: endLocationName,
    type: "location",
  })

  console.log("[v0] Created simple path with", path.length, "points")
  return path
}

// Generate turn-by-turn directions from path
export function generateDirections(path: PathNode[], persona: string): string[] {
  if (path.length < 2) return []

  const directions: string[] = []
  directions.push(`Start at ${path[0].name}`)

  for (let i = 0; i < path.length - 1; i++) {
    const currentNode = path[i]
    const nextNode = path[i + 1]

    const distance = calculateDistance(currentNode.lat, currentNode.lng, nextNode.lat, nextNode.lng)
    const bearing = calculateBearing(currentNode.lat, currentNode.lng, nextNode.lat, nextNode.lng)
    const direction = bearingToDirection(bearing)

    if (i === 0) {
      // First step
      directions.push(`Head ${direction} for ${Math.round(distance)}m`)
    } else if (i === path.length - 2) {
      // Last step
      directions.push(`Continue ${direction} for ${Math.round(distance)}m to reach ${nextNode.name}`)
    } else {
      // Middle steps
      directions.push(`Continue ${direction} for ${Math.round(distance)}m`)
    }

    // Add persona-specific tips
    if (persona === "new-student" && i === 0) {
      directions.push(`💡 Tip: Look for landmarks along the way`)
    } else if (persona === "cat-lover" && i === Math.floor(path.length / 2)) {
      directions.push(`😻 Keep an eye out for campus cats!`)
    } else if (persona === "cat-fearful" && i === 0) {
      directions.push(`😰 Stay on well-lit paths`)
    }
  }

  const totalDistance = path.reduce((sum, node, i) => {
    if (i === 0) return 0
    return sum + calculateDistance(path[i - 1].lat, path[i - 1].lng, node.lat, node.lng)
  }, 0)

  directions.push(`Arrive at ${path[path.length - 1].name}`)
  directions.push(`📍 Total distance: ${Math.round(totalDistance)}m`)

  return directions
}
