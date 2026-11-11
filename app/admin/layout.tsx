import { requireAdmin } from "@/server/auth";
import { redirect } from "next/navigation";
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) { try { await requireAdmin(); } catch { redirect("/login"); } return <section>{children}</section>; }
