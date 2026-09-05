import { NextRequest, NextResponse } from "next/server";
import { createApp } from "../../../../../backend/src/app.js";
import { ensureStoreReady } from "../../../../../backend/src/store.js";

// Cache app instance across hot invocations
let cachedApp: any = null;

async function handle(req: NextRequest) {
  try {
    if (!cachedApp) {
      cachedApp = createApp();
    }
    
    const ready = ensureStoreReady();
    if (ready && typeof ready.then === "function") {
      await ready;
    }

    return new Promise<NextResponse>((resolve) => {
      const method = req.method;
      // Strip /api prefix if present because express app mounts routes like /api/auth or /health
      const fullPath = req.nextUrl.pathname;
      const url = fullPath + req.nextUrl.search;
      
      const headers: Record<string, string | string[]> = {};
      req.headers.forEach((val, key) => {
        headers[key] = val;
      });

      let statusCode = 200;
      const resHeaders = new Headers();

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

      const dispatch = (parsedBody: any) => {
        const mockReq: any = {
          method,
          url,
          originalUrl: url,
          path: fullPath,
          query: Object.fromEntries(req.nextUrl.searchParams),
          headers,
          body: parsedBody || {},
          cookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value])),
          on: () => {},
          removeListener: () => {}
        };
        try {
          cachedApp(mockReq, mockRes);
        } catch (err: any) {
          resolve(NextResponse.json({ error: { code: "EXPRESS_ERR", message: err.message } }, { status: 500 }));
        }
      };

      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        dispatch({});
      } else {
        req.json().then(
          (b) => dispatch(b),
          () => dispatch({})
        );
      }
    });
  } catch (outerErr: any) {
    return NextResponse.json({ error: { code: "BRIDGE_ERR", message: outerErr.message } }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
export async function PUT(req: NextRequest) { return handle(req); }
export async function PATCH(req: NextRequest) { return handle(req); }
export async function DELETE(req: NextRequest) { return handle(req); }
export async function OPTIONS(req: NextRequest) { return handle(req); }
