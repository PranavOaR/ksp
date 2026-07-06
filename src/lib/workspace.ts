export const WORKSPACE_COOKIE = 'drishti_ws';

export type Workspace = 'demo' | 'live';

export function isWorkspace(value: unknown): value is Workspace {
  return value === 'demo' || value === 'live';
}

/** Active workspace for a request; demo (synthetic data) is the default. */
export function workspaceFromRequest(request: Request): Workspace {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${WORKSPACE_COOKIE}=`));
  const value = match?.slice(WORKSPACE_COOKIE.length + 1);
  return isWorkspace(value) ? value : 'demo';
}
