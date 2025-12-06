import { createServer } from "http";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import loginHandler from "@/api/auth/login";
import signupHandler from "@/api/auth/signup";
import {
  type AuthenticatedNextApiRequest,
  withAuth,
} from "@/middleware/withAuth";

const signUpMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const getUserMock = vi.fn();
const mockLogSystemEvent = vi.fn();

vi.mock("@/db/supabase", () => ({
  getSupabase: vi.fn(() => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
      getUser: getUserMock,
    },
  })),
}));

vi.mock("@/repos/systemEvents", () => ({
  logSystemEvent: mockLogSystemEvent,
}));

const createApiServer = (handler: NextApiHandler) =>
  createServer((req, res) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) =>
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk),
    );

    req.on("end", async () => {
      const bodyString = Buffer.concat(chunks).toString();
      const reqWithBody = req as NextApiRequest & { body?: unknown };

      if (bodyString) {
        try {
          reqWithBody.body = JSON.parse(bodyString);
        } catch {
          reqWithBody.body = bodyString;
        }
      }

      const resWithJson = res as NextApiResponse;
      (resWithJson as NextApiResponse).status = (code: number) => {
        res.statusCode = code;
        return resWithJson;
      };
      (resWithJson as NextApiResponse).json = (payload: unknown) => {
        if (!res.headersSent) {
          res.setHeader("Content-Type", "application/json");
        }
        res.end(JSON.stringify(payload));
        return resWithJson;
      };

      try {
        await handler(reqWithBody, resWithJson);
      } catch (error) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    });
  });

const signupApiRoute: NextApiHandler = async (req, res) => {
  const result = await signupHandler(req.body);
  res.status(200).json(result);
};

const loginApiRoute: NextApiHandler = async (req, res) => {
  const result = await loginHandler(req.body);
  res.status(200).json(result);
};

const protectedRoute = withAuth((req, res) =>
  res.status(200).json({
    success: true,
    data: { user: (req as AuthenticatedNextApiRequest).user },
  }),
);

beforeEach(() => {
  vi.clearAllMocks();
  signUpMock.mockReset();
  signInWithPasswordMock.mockReset();
  getUserMock.mockReset();
  mockLogSystemEvent.mockReset();
});

describe("Signup endpoint", () => {
  it("returns success envelope and logs signup events", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1", email: "test@example.com" } },
      error: null,
    });

    const response = await request(createApiServer(signupApiRoute))
      .post("/api/auth/signup")
      .send({ email: "test@example.com", password: "password123" })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        user: { id: "u1", email: "test@example.com" },
        message: "Sign-up successful. Please verify your email.",
      },
    });

    expect(mockLogSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "auth.signup.start" }),
    );
    expect(mockLogSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "auth.signup.success" }),
    );
  });
});

describe("Login endpoint", () => {
  it("returns a token and user on success", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: { access_token: "jwt123" },
        user: { id: "u1", email: "test@example.com" },
      },
      error: null,
    });

    const response = await request(createApiServer(loginApiRoute))
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        token: "jwt123",
        user: { id: "u1", email: "test@example.com" },
      },
    });
  });

  it("returns success false when Supabase returns an error", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { session: null, user: null },
      error: new Error("Invalid credentials"),
    });

    const response = await request(createApiServer(loginApiRoute))
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrong-password" })
      .expect(200);

    expect(response.body).toEqual({
      success: false,
      error: "Invalid credentials",
    });
  });
});

describe("withAuth middleware", () => {
  it("returns 200 and attaches user for a valid token", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "test@example.com" } },
      error: null,
    });

    const response = await request(createApiServer(protectedRoute))
      .get("/api/protected")
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: { user: { id: "u1", email: "test@example.com" } },
    });
    expect(getUserMock).toHaveBeenCalledWith("valid-token");
  });

  it("returns 401 when the authorization header is missing", async () => {
    const response = await request(createApiServer(protectedRoute))
      .get("/api/protected")
      .expect(401);

    expect(response.body).toEqual({ success: false, error: "Unauthorized" });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is invalid", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid"),
    });

    const response = await request(createApiServer(protectedRoute))
      .get("/api/protected")
      .set("Authorization", "Bearer bad-token")
      .expect(401);

    expect(response.body).toEqual({ success: false, error: "Unauthorized" });
  });
});
