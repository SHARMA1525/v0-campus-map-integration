"use client"

import { useState } from "react"
import CampusMap from "@/components/campus-map"
import AINavigator from "@/components/ai-navigator"
import type { Location } from "@/lib/campus-data"

interface RouteInfo {
  from: string
  to: string
}

export default function Home() {
  const [highlightedLocation, setHighlightedLocation] = useState<Location | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Adaptive Campus Navigator</h1>
          <p className="text-muted-foreground text-balance">
            Explore Ajeenkya DY Patil Lohegaon Campus - Discover quirky spots, navigate with ease
          </p>
        </div>

        <div className="mb-6">
          <AINavigator onLocationFound={setHighlightedLocation} onRouteRequest={setRouteInfo} />
        </div>

        <CampusMap highlightLocation={highlightedLocation} routeInfo={routeInfo} />
      </div>
    </main>
  )
}
