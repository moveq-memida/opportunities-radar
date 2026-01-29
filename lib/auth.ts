import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";

const client = createClient();

export interface AuthResult {
  fid: string;
}

/**
 * Verifies the authorization header and returns the user's FID
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header", 401);
  }

  const token = authorization.split(" ")[1];
  const domain = getRequestDomain(request);

  try {
    const payload = await client.verifyJwt({ token, domain });
    return { fid: String(payload.sub) };
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
      throw new AuthError("Invalid token", 401);
    }
    throw error;
  }
}

/**
 * Wraps an API handler with authentication
 */
export function withAuth<T>(
  handler: (request: NextRequest, auth: AuthResult) => Promise<T>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const auth = await verifyAuth(request);
      const result = await handler(request, auth);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      console.error("Auth handler error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Gets the request domain for JWT verification
 */
function getRequestDomain(request: NextRequest): string {
  // Try Origin header first
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host;
    } catch {
      // Invalid origin
    }
  }

  // Try Host header
  const host = request.headers.get("host");
  if (host) {
    return host;
  }

  // Fallback to environment
  if (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(process.env.NEXT_PUBLIC_APP_URL).host;
  }

  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }

  return "localhost:3000";
}

/**
 * Checks if the user is an admin
 */
export function isAdmin(fid: string): boolean {
  const adminFid = process.env.ADMIN_FID;
  return adminFid === fid;
}

/**
 * Custom auth error class
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
