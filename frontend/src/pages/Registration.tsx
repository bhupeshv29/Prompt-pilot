import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { api, setToken } from "@/api/client";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { email, password });
      setToken(res.data.token);
      navigate("/studio");
    } catch {
      setError("Couldn’t create that account. Try a different email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
          Open your studio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A light little workspace for sites that bloom.
        </p>
      </div>
      <Card>
        <CardHeader className="items-center text-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-accent text-lg text-primary">promptpilot</span>
          </Link>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Create account
          </CardTitle>
          <CardDescription>Takes a moment. No fuss.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              placeholder="you@studio.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {error && (
              <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} size="lg">
              {loading ? "Creating…" : "Start building"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have a key?{" "}
            <Link
              className="font-semibold text-primary hover:underline"
              to="/login"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
