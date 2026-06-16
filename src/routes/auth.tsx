import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Aadhar Supermarket" }] }),
  component: AuthPage,
});

function normalizePhone(input: string) {
  const trimmed = input.trim().replace(/\s|-/g, "");
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  return "";
}

function phoneToEmail(phone: string) {
  // Strip leading + so it's a valid local-part
  return `${phone.replace(/^\+/, "")}@aadhar.local`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const ph = normalizePhone(phone);
      if (!ph) throw new Error("Enter a valid 10-digit mobile number");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(ph),
        password,
      });
      if (error) throw error;
      toast.success("Signed in!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const ph = normalizePhone(phone);
      if (!ph) throw new Error("Enter a valid 10-digit mobile number");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.signUp({
        email: phoneToEmail(ph),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { phone: ph, ...(fullName ? { full_name: fullName } : {}) },
        },
      });
      if (error) throw error;
      toast.success("Account created! Signing in...");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto grid place-items-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Aadhar Supermarket</CardTitle>
            <CardDescription>Sign in with your mobile number and password</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-3">
                  <div>
                    <Label>Mobile number</Label>
                    <Input
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3">
                  <div>
                    <Label>Full name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Mobile number</Label>
                    <Input
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Password (min 6 characters)</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating..." : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/" className="underline">
                Continue browsing
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
