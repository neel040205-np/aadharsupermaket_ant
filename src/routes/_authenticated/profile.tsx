import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — Aadhar Supermarket" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  // Load existing profile
  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load profile details");
        } else if (data) {
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
          setAddress(data.address ?? "");
          setLatitude(data.latitude ?? null);
          setLongitude(data.longitude ?? null);
          setGoogleMapsUrl(data.google_maps_url ?? "");
        }
        setLoading(false);
      });
  }, [user]);

  // Map location handler removed

  // Submit profile updates
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) return toast.error("Full name is required");
    if (!phone.trim() || phone.trim().length < 10) {
      return toast.error("Enter a valid 10-digit mobile number");
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        latitude: null,
        longitude: null,
        google_maps_url: null,
      });

      if (error) throw error;

      toast.success("Profile saved successfully");
      // Fire custom event so header name updates immediately
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to update profile";
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="-ml-2 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </div>

        <Card className="border border-border/80 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">My Profile</CardTitle>
            <CardDescription>
              Manage your personal details and default delivery address location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading profile details...</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                {/* Personal Information */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Neel Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Delivery Address Section */}
                <div className="space-y-1.5 border-t pt-4">
                  <Label htmlFor="address">Delivery Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your default delivery address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Save Changes Button */}
                <Button type="submit" className="w-full gap-2" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
