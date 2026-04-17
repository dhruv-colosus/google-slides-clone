import { redirect } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SignInPage() {
  redirect(`${API_URL}/auth/login`);
}
