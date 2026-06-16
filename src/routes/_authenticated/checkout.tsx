import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Header } from "@/components/Header";
import { useCart, cart, cartTotal } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { placeCodOrder, placeUpiOrder } from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { computeBill, MIN_ORDER, MERCHANT_VPA, MERCHANT_NAME } from "@/lib/payment-config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Banknote, Copy, Download, Smartphone, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Payment — Aadhar Supermarket" }] }),
  component: Checkout,
});

type Method = "upi" | "cod" | null;

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
};

function Checkout() {
  const items = useCart();
  const itemTotal = cartTotal(items);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  const bill = computeBill(itemTotal, couponDiscount);
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>(null);
  const [confirmCod, setConfirmCod] = useState(false);
  const [loading, setLoading] = useState(false);

  // UPI proof state
  const [utr, setUtr] = useState("");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const codFn = useServerFn(placeCodOrder);
  const upiFn = useServerFn(placeUpiOrder);

  const upiUrl = useMemo(() => {
    const params = new URLSearchParams({
      pa: MERCHANT_VPA,
      pn: MERCHANT_NAME,
      am: bill.grandTotal.toFixed(2),
      cu: "INR",
      tn: `Order ${name || "customer"}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [bill.grandTotal, name]);

  useEffect(() => {
    QRCode.toDataURL(upiUrl, { width: 360, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [upiUrl]);

  useEffect(() => {
    setAmountPaid(bill.grandTotal.toFixed(2));
  }, [bill.grandTotal]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAddress(data.address ?? "");
          setPhone(data.phone ?? "");
          setName(data.full_name ?? "");
        }
      });
  }, [user]);

  useEffect(() => {
    supabase
      .from("coupons")
      .select("id,code,discount_type,discount_value,min_order_amount")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setAvailableCoupons(data as Coupon[]);
      });
  }, []);

  useEffect(() => {
    if (!appliedCoupon) return;
    if (itemTotal < appliedCoupon.min_order_amount) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      toast.info(`Coupon "${appliedCoupon.code}" removed because order total is below minimum requirement`);
      return;
    }

    let discount = 0;
    if (appliedCoupon.discount_type === "percent") {
      discount = Math.round(((itemTotal * appliedCoupon.discount_value) / 100) * 100) / 100;
    } else {
      discount = appliedCoupon.discount_value;
    }
    setCouponDiscount(discount);
  }, [itemTotal, appliedCoupon]);

  function applyCoupon(codeToApply: string) {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode) return;

    const coupon = availableCoupons.find((c) => c.code === cleanCode);
    if (!coupon) {
      toast.error("Invalid coupon code");
      return;
    }

    if (itemTotal < coupon.min_order_amount) {
      toast.error(`Minimum order amount of ₹${coupon.min_order_amount} required for this coupon`);
      return;
    }

    setAppliedCoupon(coupon);
    let discount = 0;
    if (coupon.discount_type === "percent") {
      discount = Math.round(((itemTotal * coupon.discount_value) / 100) * 100) / 100;
    } else {
      discount = coupon.discount_value;
    }
    setCouponDiscount(discount);
    toast.success(`Coupon "${coupon.code}" applied!`);
  }

  function validateBase() {
    if (items.length === 0) return (toast.error("Cart is empty"), false);
    if (itemTotal < MIN_ORDER) return (toast.error(`Minimum order ₹${MIN_ORDER}`), false);
    if (address.trim().length < 5) return (toast.error("Enter delivery address"), false);
    if (!/^\d{10}$/.test(phone.trim().replace(/\s|-/g, "")))
      return (toast.error("Enter a valid 10-digit mobile number"), false);
    return true;
  }

  async function saveProfile() {
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: name,
        phone,
        address,
      });
      window.dispatchEvent(new Event("profile-updated"));
    }
  }

  function copyVpa() {
    navigator.clipboard.writeText(MERCHANT_VPA);
    toast.success("UPI ID copied");
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `aadhar-payment-qr-${Date.now()}.png`;
    a.click();
  }

  async function submitUpiProof() {
    if (!validateBase()) return;
    if (!utr.trim() || utr.trim().length < 6) return toast.error("Enter the UTR / Transaction ID");
    if (!proofFile) return toast.error("Upload your payment screenshot");
    const amt = Number(amountPaid);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter amount paid");
    if (!user) return toast.error("Please sign in again");

    setLoading(true);
    try {
      await saveProfile();
      // Upload screenshot to private bucket under <userId>/<timestamp>.<ext>
      const ext = (proofFile.name.split(".").pop() || "png").toLowerCase().slice(0, 5);
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile, { contentType: proofFile.type, upsert: false });
      if (upErr) throw upErr;

      await upiFn({
        data: {
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          deliveryAddress: address,
          phone,
          total: bill.grandTotal,
          utr: utr.trim(),
          paymentProofPath: path,
          amountPaid: amt,
          customerNotes: notes.trim() || undefined,
          couponCode: appliedCoupon?.code || undefined,
        },
      });
      cart.clear();
      toast.success("Payment proof submitted. Order will be confirmed after verification.");
      navigate({ to: "/orders" });
    } catch (e) {
      const err = e as Error;
      toast.error(err?.message || "Failed to submit payment proof");
    } finally {
      setLoading(false);
    }
  }

  async function payCod() {
    if (!validateBase()) return;
    setLoading(true);
    try {
      await saveProfile();
      await codFn({
        data: {
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          deliveryAddress: address,
          phone,
          total: bill.grandTotal,
          couponCode: appliedCoupon?.code || undefined,
        },
      });
      cart.clear();
      toast.success("Order placed! Pay on delivery.");
      navigate({ to: "/orders" });
    } catch (e) {
      const err = e as Error;
      toast.error(err?.message || "Failed to place order");
    } finally {
      setLoading(false);
      setConfirmCod(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto grid max-w-4xl gap-6 px-4 py-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="address">Delivery Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter your full street address, landmark, and city..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">Apply Coupon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code (e.g. WELCOME10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  disabled={!!appliedCoupon}
                  className="font-mono font-bold uppercase"
                />
                {appliedCoupon ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponDiscount(0);
                      setCouponInput("");
                      toast.info("Coupon removed");
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button onClick={() => applyCoupon(couponInput)}>Apply</Button>
                )}
              </div>

              {availableCoupons.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Available Coupons
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableCoupons.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          if (appliedCoupon?.id === c.id) return;
                          setCouponInput(c.code);
                          applyCoupon(c.code);
                        }}
                        disabled={itemTotal < c.min_order_amount}
                        className={`group relative flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition ${
                          appliedCoupon?.id === c.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50 disabled:opacity-40 disabled:hover:bg-transparent"
                        }`}
                      >
                        <span className="font-mono font-bold text-xs text-foreground uppercase tracking-wider">
                          {c.code}
                        </span>
                        <span className="text-2xs text-muted-foreground">
                          {c.discount_type === "percent" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                          {c.min_order_amount > 0 && ` on orders above ₹${c.min_order_amount}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Choose payment method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MethodBtn
                active={method === "upi"}
                onClick={() => setMethod("upi")}
                icon={<Smartphone className="h-5 w-5" />}
                title="UPI"
                sub="Scan QR & submit payment proof"
              />
              <MethodBtn
                active={method === "cod"}
                onClick={() => setMethod("cod")}
                icon={<Banknote className="h-5 w-5" />}
                title="Cash on Delivery"
                sub="Pay when your order arrives"
              />

              {method === "upi" && (
                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  {/* QR code */}
                  <div className="flex flex-col items-center gap-3">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="UPI payment QR code"
                        className="h-64 w-64 rounded-lg border bg-white p-2 sm:h-72 sm:w-72"
                      />
                    ) : (
                      <div className="grid h-64 w-64 place-items-center rounded-lg border bg-white text-sm text-muted-foreground">
                        Generating QR…
                      </div>
                    )}
                    <div className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Pay to UPI ID</div>
                        <div className="truncate font-mono text-sm font-semibold">
                          {MERCHANT_VPA}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={copyVpa}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button variant="outline" onClick={downloadQr} disabled={!qrDataUrl}>
                        <Download className="mr-1 h-4 w-4" /> Download QR
                      </Button>
                      <Button variant="outline" onClick={downloadQr} disabled={!qrDataUrl}>
                        <Download className="mr-1 h-4 w-4" /> Save Image
                      </Button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <ol className="space-y-1.5 rounded-md border bg-card p-3 text-sm">
                    <li>
                      <span className="font-semibold">Step 1:</span> Scan QR or save the screenshot.
                    </li>
                    <li>
                      <span className="font-semibold">Step 2:</span> Pay ₹
                      {bill.grandTotal.toFixed(2)} using any UPI app.
                    </li>
                    <li>
                      <span className="font-semibold">Step 3:</span> Copy the UTR / Transaction ID
                      from your payment app.
                    </li>
                    <li>
                      <span className="font-semibold">Step 4:</span> Return here and submit the
                      payment proof below.
                    </li>
                  </ol>

                  {/* Proof form */}
                  <div className="space-y-3 rounded-md border bg-card p-3">
                    <h3 className="text-sm font-semibold">Submit payment proof</h3>
                    <div>
                      <Label>UTR / Transaction Reference *</Label>
                      <Input
                        placeholder="e.g. 412345678901"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Payment Screenshot *</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                        required
                      />
                      {proofFile && (
                        <p className="mt-1 text-xs text-muted-foreground">{proofFile.name}</p>
                      )}
                    </div>
                    <div>
                      <Label>Amount Paid (₹) *</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any note for our team"
                      />
                    </div>
                    <Button className="w-full" disabled={loading} onClick={submitUpiProof}>
                      {loading ? "Submitting…" : "Submit Payment Proof"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="mr-1 inline h-3 w-3 text-primary" />
                      Order will be confirmed after our team verifies your payment.
                    </p>
                  </div>
                </div>
              )}

              {method === "cod" && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">
                    You'll pay ₹{bill.grandTotal.toFixed(2)} in cash when the order is delivered.
                  </p>
                  <Button className="w-full" disabled={loading} onClick={() => setConfirmCod(true)}>
                    Place Cash on Delivery order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Bill details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.productId} className="flex justify-between text-sm">
                  <span className="line-clamp-1">
                    {i.name} × {i.quantity}
                  </span>
                  <span>₹{(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="my-2 border-t" />
              <Row label="Item total" value={`₹${bill.itemTotal.toFixed(2)}`} />
              {couponDiscount > 0 && (
                <Row
                  label={`Discount (${appliedCoupon?.code})`}
                  value={`-₹${couponDiscount.toFixed(2)}`}
                />
              )}
              <Row
                label="Delivery charge"
                value={bill.delivery === 0 ? "FREE" : `₹${bill.delivery.toFixed(2)}`}
              />
              <Row label="Handling charge" value={`₹${bill.handling.toFixed(2)}`} />
              <div className="my-2 border-t" />
              <div className="flex justify-between text-lg font-bold">
                <span>Grand total</span>
                <span>₹{bill.grandTotal.toFixed(2)}</span>
              </div>
              {bill.savings > 0 && (
                <div className="mt-2 rounded-md bg-primary/10 px-2 py-1.5 text-center text-xs font-semibold text-primary">
                  Total saving: ₹{bill.savings.toFixed(2)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmCod} onOpenChange={setConfirmCod}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cash on Delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              You will pay ₹{bill.grandTotal.toFixed(2)} in cash when your order arrives at:
              <br />
              <span className="mt-1 block font-medium text-foreground">{address}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={loading} onClick={payCod}>
              {loading ? "Placing..." : "Yes, place order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MethodBtn({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <div
        className={`h-4 w-4 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-muted-foreground"}`}
      />
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
