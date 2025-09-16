// Use require to avoid TS overload friction on sign/verify typing
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt: any = require("jsonwebtoken");
type Secret = string;

const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TTL || "15m") as string | number;
const REFRESH_TOKEN_TTL = (process.env.JWT_REFRESH_TTL || "30d") as string | number;
const ACCESS_TOKEN_SECRET: Secret = (process.env.JWT_ACCESS_SECRET || "dev_access_secret") as Secret;
const REFRESH_TOKEN_SECRET: Secret = (process.env.JWT_REFRESH_SECRET || "dev_refresh_secret") as Secret;

export type JwtPayload = {
  sub: string;
  role: string;
  email: string;
};

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
}
