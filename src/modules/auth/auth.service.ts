// Auth service placeholder during admin implementation
export async function googleLogin(_idToken: string, _deviceId?: string) {
  throw new Error("NOT_IMPLEMENTED");
}

export async function refreshSession(_refreshToken: string) {
  throw new Error("NOT_IMPLEMENTED");
}

export async function logoutSession(_refreshToken: string) {
  return;
}
