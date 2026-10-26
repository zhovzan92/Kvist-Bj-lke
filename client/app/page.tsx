import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12 md:px-8">
      <p className="text-lg leading-7 font-semibold tracking-tight">
        Kvist Bjælke
      </p>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle
            role="heading"
            aria-level={1}
            className="text-2xl leading-8 tracking-tight"
          >
            Sign in
          </CardTitle>
          <CardDescription>
            Enter your username and password to continue.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LoginForm />
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-center text-sm text-muted-foreground">
            Accounts are created by an administrator.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
