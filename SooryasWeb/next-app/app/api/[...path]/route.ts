import { NextRequest } from 'next/server';

import { handleApiRequest } from '@/src/server/api';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function dispatch(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return handleApiRequest(request, path);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return dispatch(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return dispatch(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return dispatch(request, context);
}
