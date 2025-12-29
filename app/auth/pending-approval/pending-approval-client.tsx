"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Clock, Mail, CheckCircle } from "lucide-react"

export function PendingApprovalClient() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navigation />

      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
              <CardDescription className="text-base mt-2">
                Your account is being verified by our admin team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>We&apos;ve received your registration request</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>Our admin team will review your account shortly</p>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>You&apos;ll receive an email notification once your account is approved</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  Thank you for your patience. We&apos;ll notify you as soon as your account is ready!
                </p>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}























