export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/voices/:path*", "/history/:path*", "/settings/:path*", "/usage/:path*", "/billing/:path*"],
};
