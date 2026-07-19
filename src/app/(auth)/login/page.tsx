import { Suspense } from "react";
import { LoginForm } from "./_components/login-form";

export const metadata = {
  title: "Login | Restaurant Operations",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[60%] right-[10%] h-[30%] w-[30%] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <span className="text-xl font-bold tracking-tighter">RO</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Welcome Back
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to access your operations dashboard
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-card/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl dark:bg-card/30">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
