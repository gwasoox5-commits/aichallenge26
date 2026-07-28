import { AdminSessionProvider } from "@/lib/bsp/admin-session-context";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
