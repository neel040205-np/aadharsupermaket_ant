import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Aadhar Supermarket" },
      { name: "description", content: "Extra services from Aadhar Supermarket." },
    ],
  }),
  component: Services,
});

function Services() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="mt-3 text-muted-foreground">
          Special services will appear here. Admins can add new services soon.
        </p>
      </div>
    </div>
  );
}
