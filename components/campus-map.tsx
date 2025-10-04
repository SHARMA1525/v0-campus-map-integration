"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { campusData, type Persona, type Location } from "@/lib/campus-data"
import { findPath, generateDirections } from "@/lib/path-network"
import { MapPin, Navigation, Info } from "lucide-react"

const markerColors: Record<string, string> = {
  warning: "#ef4444",
  romantic: "#ec4899",
  food: "#f59e0b",
  study: "#3b82f6",
  sports: "#10b981",
  medical: "#8b5cf6",
  hostel: "#f97316",
  inclusive: "#ec4899",
  default: "#6366f1",
}

const personaColors: Record<Persona, string> = {
  faculty: "#3b82f6",
  "new-student": "#f59e0b",
  "cat-lover": "#ec4899",
  "cat-fearful": "#10b981",
}

interface CampusMapProps {
  highlightLocation?: Location | null
  routeInfo?: { from: string; to: string } | null
}

export default function CampusMap({ highlightLocation, routeInfo }: CampusMapProps) {
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const routeLayerRef = useRef<any>(null)
  const directionMarkersRef = useRef<any[]>([])
  const highlightedMarkerRef = useRef<any>(null)

  const [fromLocation, setFromLocation] = useState<string>("")
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [selectedPersona, setSelectedPersona] = useState<Persona>("new-student")
  const [showLegend, setShowLegend] = useState(true)
  const [currentDirections, setCurrentDirections] = useState<string[]>([])
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [L, setL] = useState<any>(null)

  // Load Leaflet dynamically
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    link.crossOrigin = ""
    document.head.appendChild(link)

    const script = document.createElement("script")
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    script.crossOrigin = ""
    script.async = true
    script.onload = () => {
      setL((window as any).L)
      setLeafletLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !leafletLoaded || !L) return

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return

      const map = L.map(mapContainerRef.current, {
        center: [18.621130576268346, 73.91139588382592],
        zoom: 17,
        minZoom: 15,
        maxZoom: 19,
        zoomControl: true,
      })

      const tileLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          maxZoom: 19,
        },
      )

      tileLayer.addTo(map)

      setTimeout(() => {
        map.invalidateSize()
      }, 100)

      mapRef.current = map

      campusData.locations.forEach((location) => {
        const markerColor = markerColors[location.type] || markerColors.default

        const customIcon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="
              background-color: ${markerColor};
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="
                transform: rotate(45deg);
                color: white;
                font-size: 16px;
                font-weight: bold;
              ">${location.icon}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        })

        const marker = L.marker([location.lat, location.lng], {
          icon: customIcon,
          title: location.name,
          alt: `${location.name} - ${location.description}`,
        })
          .addTo(map)
          .bindPopup(
            `
            <div style="min-width: 200px;">
              <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${markerColor};">
                ${location.icon} ${location.name}
              </h3>
              <p style="margin-bottom: 8px; color: #666;">${location.description}</p>
              ${location.landmarks ? `<p style="font-size: 12px; color: #888;"><strong>Landmarks:</strong> ${location.landmarks}</p>` : ""}
            </div>
          `,
            {
              maxWidth: 300,
              className: "custom-popup",
            },
          )

        marker.on("mouseover", function () {
          this.openPopup()
        })

        markersRef.current.push(marker)
      })
    }, 250)

    return () => {
      clearTimeout(timer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [leafletLoaded, L])

  useEffect(() => {
    if (!mapRef.current || !fromLocation || !selectedLocation || !L) {
      if (routeLayerRef.current) {
        routeLayerRef.current.remove()
        routeLayerRef.current = null
      }
      directionMarkersRef.current.forEach((marker) => marker.remove())
      directionMarkersRef.current = []
      setCurrentDirections([])
      return
    }

    const path = findPath(fromLocation, selectedLocation)

    if (!path || path.length === 0) {
      setCurrentDirections(["No route found between these locations"])
      return
    }

    const directions = generateDirections(path, selectedPersona)
    setCurrentDirections(directions)

    // Remove existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
    }
    directionMarkersRef.current.forEach((marker) => marker.remove())
    directionMarkersRef.current = []

    const routeCoordinates: [number, number][] = path.map((node) => [node.lat, node.lng])

    const polyline = L.polyline(routeCoordinates, {
      color: personaColors[selectedPersona],
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1,
    }).addTo(mapRef.current)

    routeLayerRef.current = polyline

    // Fit map to route bounds
    mapRef.current.fitBounds(polyline.getBounds(), {
      padding: [50, 50],
    })

    path.forEach((node, index) => {
      if (index === 0 || index === path.length - 1 || node.type === "intersection") {
        const stepMarker = L.marker([node.lat, node.lng], {
          icon: L.divIcon({
            className: "direction-marker",
            html: `
              <div style="
                background-color: white;
                padding: 4px 8px;
                border-radius: 50%;
                border: 2px solid ${personaColors[selectedPersona]};
                font-size: 12px;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                min-width: 24px;
                text-align: center;
              ">
                ${index + 1}
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [12, 12],
          }),
        }).addTo(mapRef.current)
        directionMarkersRef.current.push(stepMarker)
      }
    })
  }, [fromLocation, selectedLocation, selectedPersona, L])

  useEffect(() => {
    if (!mapRef.current || !highlightLocation || !L) return

    // Find the marker for this location
    const locationIndex = campusData.locations.findIndex((loc) => loc.name === highlightLocation.name)
    if (locationIndex === -1) return

    const marker = markersRef.current[locationIndex]
    if (!marker) return

    // Zoom to location
    mapRef.current.flyTo([highlightLocation.lat, highlightLocation.lng], 18, {
      duration: 1.5,
    })

    // Open popup
    setTimeout(() => {
      marker.openPopup()
    }, 1500)

    // Add bounce animation
    if (highlightedMarkerRef.current) {
      highlightedMarkerRef.current.setIcon(
        L.divIcon({
          className: "custom-marker",
          html: `
            <div style="
              background-color: ${markerColors[highlightLocation.type] || markerColors.default};
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="
                transform: rotate(45deg);
                color: white;
                font-size: 16px;
                font-weight: bold;
              ">${highlightLocation.icon}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        }),
      )
    }

    // Create pulsing highlight effect
    const pulseIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          background-color: ${markerColors[highlightLocation.type] || markerColors.default};
          width: 48px;
          height: 48px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 4px solid white;
          box-shadow: 0 0 20px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.5s ease-in-out 3;
        ">
          <span style="
            transform: rotate(45deg);
            color: white;
            font-size: 24px;
            font-weight: bold;
          ">${highlightLocation.icon}</span>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: rotate(-45deg) scale(1); }
            50% { transform: rotate(-45deg) scale(1.2); }
          }
        </style>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48],
    })

    marker.setIcon(pulseIcon)
    highlightedMarkerRef.current = marker

    // Reset icon after animation
    setTimeout(() => {
      const normalIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background-color: ${markerColors[highlightLocation.type] || markerColors.default};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-size: 16px;
              font-weight: bold;
            ">${highlightLocation.icon}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })
      marker.setIcon(normalIcon)
    }, 4500)

    // Set as destination for routing
    setSelectedLocation(highlightLocation.name)
  }, [highlightLocation, L])

  useEffect(() => {
    if (routeInfo) {
      console.log("[v0] Route requested:", routeInfo.from, "→", routeInfo.to)
      setFromLocation(routeInfo.from)
      setSelectedLocation(routeInfo.to)
    }
  }, [routeInfo])

  if (!leafletLoaded) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading interactive map...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="from" className="text-sm font-medium mb-2 block">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                From
              </label>
              <Select value={fromLocation} onValueChange={setFromLocation}>
                <SelectTrigger id="from" aria-label="Select starting location">
                  <SelectValue placeholder="Choose starting point..." />
                </SelectTrigger>
                <SelectContent>
                  {campusData.locations.map((location) => (
                    <SelectItem key={location.name} value={location.name}>
                      {location.icon} {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label htmlFor="destination" className="text-sm font-medium mb-2 block">
                <Navigation className="inline-block w-4 h-4 mr-1" />
                To
              </label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="destination" aria-label="Select destination">
                  <SelectValue placeholder="Choose destination..." />
                </SelectTrigger>
                <SelectContent>
                  {campusData.locations.map((location) => (
                    <SelectItem key={location.name} value={location.name}>
                      {location.icon} {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label htmlFor="persona" className="text-sm font-medium mb-2 block">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                Navigation Style
              </label>
              <Select value={selectedPersona} onValueChange={(v) => setSelectedPersona(v as Persona)}>
                <SelectTrigger id="persona" aria-label="Select navigation style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faculty">🎓 Faculty (Shortest Path)</SelectItem>
                  <SelectItem value="new-student">🆕 New Student (Landmarks)</SelectItem>
                  <SelectItem value="cat-lover">😻 Cat Lover (Cat Spots)</SelectItem>
                  <SelectItem value="cat-fearful">😰 Cat Fearful (Avoid Cats)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLegend(!showLegend)}
              className="whitespace-nowrap"
              aria-label={showLegend ? "Hide legend" : "Show legend"}
            >
              <Info className="w-4 h-4 mr-2" />
              {showLegend ? "Hide" : "Show"} Legend
            </Button>
          </div>

          {currentDirections.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Turn-by-Turn Directions: {fromLocation} → {selectedLocation}
              </h3>
              <ol className="space-y-1 text-sm">
                {currentDirections.map((direction, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-semibold text-muted-foreground min-w-[20px]">{index + 1}.</span>
                    <span>{direction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Card>

      {/* Legend */}
      {showLegend && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Map Legend
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Location Types</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.warning }} />
                  Warning
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.romantic }} />
                  Romantic
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.food }} />
                  Food
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.study }} />
                  Study
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.sports }} />
                  Sports
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Navigation Styles</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: personaColors.faculty }} />
                  Faculty
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: personaColors["new-student"] }} />
                  New Student
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: personaColors["cat-lover"] }} />
                  Cat Lover
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: personaColors["cat-fearful"] }} />
                  Cat Fearful
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div
          ref={mapContainerRef}
          className="w-full h-[500px] md:h-[600px] lg:h-[700px]"
          role="application"
          aria-label="Interactive campus map"
        />
      </Card>

      {/* Accessibility Info */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {fromLocation && selectedLocation && currentDirections.length > 0 && (
          <p>
            Route selected from {fromLocation} to {selectedLocation} using {selectedPersona} navigation style.
            {currentDirections.length} steps in directions.
          </p>
        )}
      </div>
    </div>
  )
}
