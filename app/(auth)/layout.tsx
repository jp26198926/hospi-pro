import { Toaster } from "sonner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full font-sans">
      {children}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
