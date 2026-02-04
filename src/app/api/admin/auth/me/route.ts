import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/auth-middleware";

export const GET = withAuth(async (_request: NextRequest, admin) => {
  return NextResponse.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
  });
});
