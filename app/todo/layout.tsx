import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Protects /todo: logged-out visitors are sent back to the home page.
export default async function TodoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  return children;
}
