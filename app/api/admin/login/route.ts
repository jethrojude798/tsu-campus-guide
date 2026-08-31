import { NextResponse } from "next/server";
import { authenticateAdmin, cookieOptions, setAdminSessionCookie, setDemoAdminSessionCookie, SESSION_COOKIE } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid credentials." },
      { status: 400 }
    );
  }

  const user = await authenticateAdmin(parsed.data.username, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName
    }
  });

  const token = user.id === "demo-admin-local"
    ? setDemoAdminSessionCookie(user)
    : setAdminSessionCookie(user.id);
  response.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return response;
}
