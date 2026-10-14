import Image from "next/image";
import { signIn } from "@/auth";

// Shown on the home page to logged-out visitors.
// (Sign out lives in the header's UserMenu.)
export function AuthButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/todo" });
      }}
    >
      <button
        type="submit"
        className="flex cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        <Image src="/google.svg" alt="" width={20} height={20} />
        Sign in with Google
      </button>
    </form>
  );
}
