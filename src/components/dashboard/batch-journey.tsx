
"use client";

import { type Batch, type BatchStatus } from "@/contexts/batches-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardMap, type MapPosition } from "./map";
import { ScrollArea } from "../ui/scroll-area";
import { format, parseISO } from "date-fns";
import { CheckCircle, Truck, Package, Factory, ShieldCheck, XCircle, AlertTriangle } from "lucide-react";

// In a real app, you'd use a geocoding service to get these coordinates.
// For this prototype, we'll hardcode them.
const locationCoordinates: Record<string, { lat: number; lng: number }> = {
    "Gilead Sciences, CA": { lat: 37.56, lng: -122.27 },
    "Pfizer Inc., NY": { lat: 40.75, lng: -73.98 },
    "Roche, CA": { lat: 37.68, lng: -122.47 },
    "Central Warehouse, Chicago": { lat: 41.8781, lng: -87.6298 },
    "East Coast Hub, NYC": { lat: 40.7128, lng: -74.0060 },
    "Main Pharmacy, LA": { lat: 34.0522, lng: -118.2437 },
    "City Health Pharmacy": { lat: 41.8781, lng: -87.6298 },
};

const getCoords = (location: string) => {
    // Attempt to find a partial match
    const knownLocation = Object.keys(locationCoordinates).find(key => location.includes(key));
    return knownLocation ? locationCoordinates[knownLocation] : null;
}

const statusIcons: Record<string, React.ElementType> = {
    "Pending": Package,
    "Approved": ShieldCheck,
    "In-Transit": Truck,
    "Delivered": CheckCircle,
    "Rejected": XCircle,
    "Blocked": AlertTriangle,
    "Flagged": AlertTriangle,
}

export function BatchJourney({ batch }: { batch: Batch }) {
    const positions = batch.history
        .map(event => {
            const coords = getCoords(event.location);
            return coords ? { ...coords, ...event } : null;
        })
        .filter((p): p is { lat: number; lng: number; location: string; status: BatchStatus; timestamp: string } => p !== null);

    const uniquePositions = Array.from(new Map(positions.map(p => [p.location, p])).values()) as MapPosition[];

    const Icon = statusIcons[batch.status] || Package;
    const lastEvent = batch.history[batch.history.length - 1];

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Icon className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>Current Status: {batch.status}</CardTitle>
                            <CardDescription>
                                {lastEvent ? (
                                    <>Last update at {lastEvent.location} on {format(parseISO(lastEvent.timestamp), "MMM d, yyyy 'at' h:mm a")}</>
                                ) : (
                                    <>No history available for this batch.</>
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                        <DashboardMap positions={uniquePositions} />
                    </div>
                </CardContent>
            </Card>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Supply Chain Journey</CardTitle>
                        <CardDescription>Complete audit trail of the batch from origin to destination.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-80">
                            <ol className="relative border-s border-border ml-4">
                                {batch.history.map((event, index) => {
                                    const EventIcon = statusIcons[event.status] || Package;
                                    return (
                                        <li key={index} className="mb-6 ms-6">
                                            <span className="absolute flex items-center justify-center w-6 h-6 bg-secondary rounded-full -start-3 ring-4 ring-background">
                                                <EventIcon className="w-3 h-3 text-secondary-foreground" />
                                            </span>
                                            <h3 className="flex items-center mb-1 text-base font-semibold text-foreground">
                                                {event.status}
                                            </h3>
                                            <p className="text-sm font-normal text-muted-foreground">{event.location}</p>
                                            <time className="block text-xs font-normal leading-none text-muted-foreground/80">
                                                {format(parseISO(event.timestamp), "MMM d, yyyy, h:mm a")}
                                            </time>
                                        </li>
                                    )
                                })}
                            </ol>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
