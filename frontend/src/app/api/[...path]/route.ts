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
        const rawCookies = req.cookies.getAll();
        const cookieMap: Record<string, string> = {};
        if (Array.isArray(rawCookies)) {
          rawCookies.forEach(c => { if (c && c.name) cookieMap[c.name] = c.value; });
        }

        const mockReq: any = {
          method,
          url,
          originalUrl: url,
          path: fullPath,
          query: Object.fromEntries(req.nextUrl.searchParams),
          headers,
          body: parsedBody || {},
          cookies: cookieMap,
          secret: undefined,
          signedCookies: {},
          get(name: string) {
            return headers[name.toLowerCase()] || headers[name];
          },
          header(name: string) {
            return this.get(name);
          },
          on: () => mockReq,
          once: () => mockReq,
          emit: () => false,
          removeListener: () => mockReq,
          removeAllListeners: () => mockReq,
          pipe: () => mockReq,
          unpipe: () => mockReq,
          resume: () => mockReq,
          pause: () => mockReq,
          socket: { encrypted: true, remoteAddress: "127.0.0.1" },
          connection: { encrypted: true, remoteAddress: "127.0.0.1" },
        };

        mockRes.req = mockReq;
        mockRes.get = (n: string) => resHeaders.get(n);
        mockRes.header = (n: string, v: any) => mockRes.setHeader(n, v);
        mockRes.removeHeader = (n: string) => { resHeaders.delete(n); return mockRes; };
        mockRes.hasHeader = (n: string) => resHeaders.has(n);
        mockRes._headers = {};
        mockRes._headerNames = {};
        mockRes._header = true;
        mockRes.writeHead = (code: number, headersObj?: any) => {
          statusCode = code;
          if (headersObj) {
            Object.keys(headersObj).forEach(k => resHeaders.set(k, headersObj[k]));
          }
          return mockRes;
        };
        mockRes.on = () => mockRes;
        mockRes.once = () => mockRes;
        mockRes.emit = () => false;
        mockRes.removeListener = () => mockRes;

        try {
          cachedApp(mockReq, mockRes, (err: any) => {
            if (err) {
              const status = err.status || 500;
              const msg = err.message || "Express Error";
              resolve(NextResponse.json({ error: { code: err.code || "EXPRESS_MIDDLEWARE_ERR", message: msg, stack: err.stack } }, { status }));
            } else {
              resolve(NextResponse.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, { status: 404 }));
            }
          });
        } catch (err: any) {
          console.error("Express App Handler Exception:", err);
          resolve(NextResponse.json({ error: { code: "EXPRESS_ERR", message: err.message, stack: err.stack } }, { status: 500 }));
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
    console.error("Route Handler Outer Exception:", outerErr);
    return NextResponse.json({ error: { code: "BRIDGE_ERR", message: outerErr.message, stack: outerErr.stack } }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
export async function PUT(req: NextRequest) { return handle(req); }
export async function PATCH(req: NextRequest) { return handle(req); }
export async function DELETE(req: NextRequest) { return handle(req); }
export async function OPTIONS(req: NextRequest) { return handle(req); }
