import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { verifyPassword, signToken } from "@/lib/auth";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const admin = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);

    if (admin.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const match = await verifyPassword(password, admin[0].passwordHash);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!admin[0].isActive) {
      return NextResponse.json(
        { error: "Account deactivated" },
        { status: 403 }
      );
    }

    const token = signToken({ adminId: admin[0].id, email: admin[0].email });

    return NextResponse.json({
      token,
      admin: {
        id: admin[0].id,
        email: admin[0].email,
        name: admin[0].name,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
