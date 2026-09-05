import { NextRequest, NextResponse } from "next/server";
import { createApp } from "../../../../../backend/src/app.js";
import { ensureStoreReady } from "../../../../../backend/src/store.js";

// Cache app instance across hot invocations
let cachedApp: any = null;

async function handle(req: NextRequest) {
  if (!cachedApp) {
    cachedApp = createApp();
  }
  
  const ready = ensureStoreReady();
  if (ready && typeof ready.then === "function") {
    await ready;
  }

  // Convert NextRequest to node-compatible request/response stream via custom handler wrapper
  return new Promise<NextResponse>((resolve) => {
    // Collect body if present
    const method = req.method;
    const url = req.nextUrl.pathname + req.nextUrl.search;
    
    // We construct a response object that intercepts express responses
    const headers: Record<string, string | string[]> = {};
    req.headers.forEach((val, key) => {
      headers[key] = val;
    });

    // Simple emulation of Express request & response for Next.js App Router route
    let statusCode = 200;
    const resHeaders = new Headers();
    let bodyChunks: Uint8Array[] = [];

    const mockRes: any = {
      statusCode: 200,
      status(code: number) {
        statusCode = code;
        return mockRes;
      },
      setHeader(name: string, value: any) {
        resHeaders.set(name, Array.isArray(value) ? value.join(", ") : String(value));
        return mockRes;
      },
      getHeader(name: string) {
        return resHeaders.get(name);
      },
      json(data: any) {
        resHeaders.set("Content-Type", "application/json");
        const jsonStr = JSON.stringify(data);
        resolve(new NextResponse(jsonStr, { status: statusCode, headers: resHeaders }));
      },
      send(data: any) {
        if (typeof data === "string") {
          resolve(new NextResponse(data, { status: statusCode, headers: resHeaders }));
        } else if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
          resolve(new NextResponse(data as any, { status: statusCode, headers: resHeaders }));
        } else {
          mockRes.json(data);
        }
      },
      end(data?: any) {
        if (data) {
          mockRes.send(data);
        } else {
          resolve(new NextResponse(null, { status: statusCode, headers: resHeaders }));
        }
      }
    };

    // Forward to express app
    req.json().then(
      (parsedBody) => {
        const mockReq: any = {
          method,
          url,
          path: req.nextUrl.pathname,
          query: Object.fromEntries(req.nextUrl.searchParams),
          headers,
          body: parsedBody,
          cookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]))
        };
        cachedApp(mockReq, mockRes);
      },
      () => {
        // No JSON body
        const mockReq: any = {
          method,
          url,
          path: req.nextUrl.pathname,
          query: Object.fromEntries(req.nextUrl.searchParams),
          headers,
          body: {},
          cookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]))
        };
        cachedApp(mockReq, mockRes);
      }
    );
  });
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req);
}

export async function POST(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req);
}

export async function PUT(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req);
}

export async function PATCH(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req);
}

export async function DELETE(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req);
}

export async function OPTIONS(req: NextRequest, { params }: { params: { path?: string[] } }) {
  return handle(req);
}
