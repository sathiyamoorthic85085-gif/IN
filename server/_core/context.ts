import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  user?: User | null;
  req: {
    protocol?: string;
    headers: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string>;
  };
  res: {
    cookie?: (name: string, val: string, options: Record<string, unknown>) => void;
    clearCookie: (name: string, options: Record<string, unknown>) => void;
  };
};
