import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { uploadProductImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsAdmin,
});

type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  stock: number;
  image_url: string | null;
  is_active: boolean;
};
type Category = { id: string; name: string };

function ProductsAdmin() {
  const [list, setList] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    unit: "",
    stock: "",
    category_id: "",
    image_url: "",
    is_active: true,
  });
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [p, c] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    setList((p.data ?? []) as Product[]);
    setCats(c.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      unit: "",
      stock: "",
      category_id: "",
      image_url: "",
      is_active: true,
    });
    setOpen(true);
  }
  function startEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      unit: p.unit ?? "",
      stock: String(p.stock),
      category_id: p.category_id ?? "",
      image_url: p.image_url ?? "",
      is_active: p.is_active,
    });
    setOpen(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name required");
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price) || 0,
      unit: form.unit || null,
      stock: parseInt(form.stock) || 0,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Products</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}>
              <Plus className="mr-1 h-4 w-4" />
              New product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    placeholder="kg, pc"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Image</Label>
                <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt=""
                    className="mt-2 h-24 w-24 rounded object-cover"
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={uploading}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-2">
        {list.map((p) => (
          <Card key={p.id} className="flex items-center gap-3 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                ₹{Number(p.price).toFixed(2)} · stock {p.stock} {!p.is_active && "· inactive"}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </Card>
        ))}
        {list.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">No products yet</p>
        )}
      </div>
    </div>
  );
}
