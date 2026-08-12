let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(value: string): void {
  accessToken = value;
}

export function clearAccessToken(): void {
  accessToken = null;
}
