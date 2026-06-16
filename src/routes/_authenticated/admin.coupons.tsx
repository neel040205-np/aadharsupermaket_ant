import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: CouponsAdmin,
});

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  is_active: boolean;
  created_at: string;
};

function CouponsAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load coupons: ${error.message}`);
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return toast.error("Code is required");
    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) return toast.error("Discount value must be a positive number");
    if (discountType === "percent" && val > 100) return toast.error("Percentage discount cannot exceed 100%");

    const minAmt = minOrderAmount ? Number(minOrderAmount) : 0;
    if (isNaN(minAmt) || minAmt < 0) return toast.error("Minimum order amount must be a positive number");

    setSubmitting(true);
    try {
      const { error } = await supabase.from("coupons").insert({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: val,
        min_order_amount: minAmt,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Coupon created successfully!");
      setCode("");
      setDiscountValue("");
      setMinOrderAmount("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: !coupon.is_active })
      .eq("id", coupon.id);

    if (error) {
      toast.error(`Failed to update coupon: ${error.message}`);
    } else {
      toast.success(`Coupon ${coupon.is_active ? "deactivated" : "activated"}`);
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) {
      toast.error(`Failed to delete coupon: ${error.message}`);
    } else {
      toast.success("Coupon deleted");
      load();
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      {/* Create Coupon Form */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">
            <Plus className="h-4.5 w-4.5" /> Create Coupon
          </CardTitle>
          <CardDescription>Add a new discount code for customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                placeholder="e.g. WELCOME10"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(val: "percent" | "flat") => setDiscountType(val)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value">
                {discountType === "percent" ? "Percentage Value (%)" : "Flat Discount (₹)"}
              </Label>
              <Input
                id="value"
                type="number"
                placeholder={discountType === "percent" ? "10" : "50"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minAmount">Min Order Amount (₹)</Label>
              <Input
                id="minAmount"
                type="number"
                placeholder="e.g. 299 (optional)"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Coupon"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Coupons List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">
            <Tag className="h-4.5 w-4.5" /> Coupon Codes
          </CardTitle>
          <CardDescription>View and manage your current promotional discount codes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No coupons created yet. Fill out the form to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b text-xs font-semibold text-muted-foreground uppercase">
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Discount</th>
                    <th className="py-2 px-3">Min Order</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{c.code}</td>
                      <td className="py-3 px-3">
                        {c.discount_type === "percent" ? `${c.discount_value}% Off` : `₹${c.discount_value} Off`}
                      </td>
                      <td className="py-3 px-3">
                        {c.min_order_amount > 0 ? `₹${c.min_order_amount}` : "None"}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase ${
                            c.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
