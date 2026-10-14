import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";


export async function UserMenu() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google avatar URL, no need for next/image config
        <img
          src={user.image}
          alt=""
          referrerPolicy="no-referrer"
          className="h-9 w-9 rounded-full ring-2 ring-white shadow-sm"
        />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 font-semibold text-teal-800">
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}

      <div className="hidden leading-tight sm:block">
        <p className="text-sm font-medium text-slate-900">{user.name}</p>
        <p className="text-xs text-slate-500">{user.email}</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          aria-label="Sign out"
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </div>
  );
}
