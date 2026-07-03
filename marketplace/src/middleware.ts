import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // N'intercepte pas les routes API, fichiers statiques, etc.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
