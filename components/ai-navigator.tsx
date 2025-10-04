"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { campusData, type Location } from "@/lib/campus-data"
import { Send, Sparkles, MapPin, Navigation2 } from "lucide-react"

interface AINavigatorProps {
  onLocationFound: (location: Location) => void
  onRouteRequest: (route: { from: string; to: string }) => void
}

interface Message {
  type: "user" | "ai"
  text: string
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export default function AINavigator({ onLocationFound, onRouteRequest }: AINavigatorProps) {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      text: "Hi! I'm your AI Campus Navigator. Ask me anything like 'Where can I grab a snack?' or 'Show me a quiet place to study!' and I'll show you the route from your current location!",
    },
  ])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt">("prompt")

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setLocationPermission("granted")
          console.log("[v0] User location obtained:", position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.log("[v0] Geolocation error:", error.message)
          setLocationPermission("denied")
        },
      )
    }
  }, [])

  const findNearestLocation = (userLat: number, userLng: number): Location | null => {
    let nearestLocation: Location | null = null
    let minDistance = Number.POSITIVE_INFINITY

    campusData.locations.forEach((location) => {
      const distance = calculateDistance(userLat, userLng, location.lat, location.lng)
      if (distance < minDistance) {
        minDistance = distance
        nearestLocation = location
      }
    })

    console.log("[v0] Nearest location:", nearestLocation?.name, "Distance:", minDistance.toFixed(0), "meters")
    return nearestLocation
  }

  const processQuery = (userQuery: string) => {
    const lowerQuery = userQuery.toLowerCase().trim()

    // Extract keywords from query
    const keywords = lowerQuery.split(/\s+/).filter((word) => word.length > 2)

    // Score each location based on keyword matches
    const scoredLocations = campusData.locations.map((location) => {
      let score = 0

      // Check tags
      keywords.forEach((keyword) => {
        location.tags.forEach((tag) => {
          if (tag.includes(keyword) || keyword.includes(tag)) {
            score += 3
          }
        })
      })

      // Check name
      keywords.forEach((keyword) => {
        if (location.name.toLowerCase().includes(keyword)) {
          score += 2
        }
      })

      // Check description
      keywords.forEach((keyword) => {
        if (location.description.toLowerCase().includes(keyword)) {
          score += 1
        }
      })

      return { location, score }
    })

    // Sort by score
    scoredLocations.sort((a, b) => b.score - a.score)

    const bestMatch = scoredLocations[0]

    if (bestMatch.score > 0) {
      let response = ""

      if (userLocation && locationPermission === "granted") {
        const nearestLocation = findNearestLocation(userLocation.lat, userLocation.lng)

        if (nearestLocation) {
          response = `Perfect! I found ${bestMatch.location.name} for you. ${bestMatch.location.description} I'm showing you the route from ${nearestLocation.name} (nearest to your current location).`

          onRouteRequest({
            from: nearestLocation.name,
            to: bestMatch.location.name,
          })
        } else {
          response = `You can try the ${bestMatch.location.name}! ${bestMatch.location.description}`
        }
      } else {
        response = `I'd recommend ${bestMatch.location.name}. ${bestMatch.location.description} (Enable location access to get directions from your current position!)`
      }

      setMessages((prev) => [...prev, { type: "user", text: userQuery }, { type: "ai", text: response }])

      // Highlight location on map
      onLocationFound(bestMatch.location)
    } else {
      setMessages((prev) => [
        ...prev,
        { type: "user", text: userQuery },
        {
          type: "ai",
          text: "Hmm, I'm not sure where that is, but you can explore the map! Try asking about food, study spots, romantic places, or sports facilities.",
        },
      ])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    processQuery(query)
    setQuery("")
  }

  const quickQuestions = [
    "Where can I grab a snack?",
    "Show me a quiet place to study",
    "Where can couples hang out?",
    "Find me a place to play sports",
  ]

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">AI Campus Navigator</h2>
        {locationPermission === "granted" && (
          <div className="ml-auto flex items-center gap-1 text-xs text-green-600">
            <Navigation2 className="w-3 h-3" />
            <span>Location Active</span>
          </div>
        )}
        {locationPermission === "denied" && (
          <div className="ml-auto flex items-center gap-1 text-xs text-amber-600">
            <MapPin className="w-3 h-3" />
            <span>Enable location for routes</span>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery(question)
                  processQuery(question)
                }}
                className="text-xs"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask me anything about campus..."
          className="flex-1"
          aria-label="Ask AI Navigator"
        />
        <Button type="submit" size="icon" disabled={!query.trim()} aria-label="Send query">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  )
}
