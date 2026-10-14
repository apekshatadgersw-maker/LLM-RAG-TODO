import { redirect } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  // Logged in → go straight to the app
  if (session?.user) redirect("/todo");

  // Not logged in → show the home page with a sign-in button
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
        Plan your day with AI
      </h1>
      <p className="mt-3 text-slate-500">
        Turn big tasks into small steps, and let your coach tell you where to start.
      </p>
      <div className="mt-8">
        <AuthButton />
      </div>
    </div>
  );
}
