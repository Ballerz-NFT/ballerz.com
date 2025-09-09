import Link from "next/link";
import { LoginForm } from "./components/login-form";
import Image from "next/image";

export default async function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <Image
            src="/images/logo.png"
            alt="Ballerz Logo"
            width={321}
            height={60}
            unoptimized
            className="w-full max-w-64"
          />
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}
