"use client"

import { Package, Truck, CheckCircle, Clock, XCircle, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DeliveryTrackingProps {
  deliveryStatus: string | null
  trackingNumber: string | null
  shippingAddress: string | null
  shippedAt: string | null
  deliveredAt: string | null
  carrierName: string | null
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200"
  },
  processing: {
    label: "Processing",
    icon: <Package className="w-4 h-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200"
  },
  shipped: {
    label: "Shipped",
    icon: <Truck className="w-4 h-4" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200"
  },
  in_transit: {
    label: "In Transit",
    icon: <Truck className="w-4 h-4" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200"
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200"
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200"
  }
}

export function DeliveryTracking({
  deliveryStatus,
  trackingNumber,
  shippingAddress,
  shippedAt,
  deliveredAt,
  carrierName
}: DeliveryTrackingProps) {
  const status = deliveryStatus || 'pending'
  const config = statusConfig[status] || statusConfig.pending

  return (
    <Card className={`${config.bgColor} border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className={config.color}>Delivery Status</CardTitle>
          </div>
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        </div>
        <CardDescription>
          Track your physical book delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {trackingNumber && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="w-4 h-4" />
              Tracking Number
            </div>
            <p className="text-sm font-mono bg-white dark:bg-gray-800 p-2 rounded border">
              {trackingNumber}
            </p>
            {carrierName && (
              <p className="text-xs text-muted-foreground">
                Carrier: {carrierName}
              </p>
            )}
          </div>
        )}

        {shippingAddress && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              Shipping Address
            </div>
            <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">
              {shippingAddress}
            </p>
          </div>
        )}

        {shippedAt && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Shipped On</div>
            <p className="text-sm text-muted-foreground">
              {new Date(shippedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {deliveredAt && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Delivered On</div>
            <p className="text-sm text-muted-foreground">
              {new Date(deliveredAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {!trackingNumber && status === 'pending' && (
          <p className="text-sm text-muted-foreground">
            Your order is being processed. You will receive a tracking number once your book is shipped.
          </p>
        )}
      </CardContent>
    </Card>
  )
}














