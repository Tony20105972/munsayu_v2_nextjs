import { NextRequest, NextResponse } from "next/server";
export function GET(request: NextRequest) { const id=request.nextUrl.searchParams.get("wr_id"); const target=id ? new URL(`/notice/${encodeURIComponent(id)}`, request.url) : new URL("/notice", request.url); return NextResponse.redirect(target, 308); }
