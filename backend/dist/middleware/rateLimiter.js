const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 5; // no máximo 5 submissões por minuto
export function getClientIp(c) {
    const req = c.req;
    const xForwardedFor = req.header("x-forwarded-for");
    if (xForwardedFor) {
        return xForwardedFor.split(",")[0].trim();
    }
    const realIp = req.header("x-real-ip");
    if (realIp) {
        return realIp;
    }
    return "local-ip";
}
export async function rateLimiter(c, next) {
    const ip = getClientIp(c);
    const now = Date.now();
    let info = rateLimitMap.get(ip);
    if (!info || now > info.resetTime) {
        info = {
            count: 1,
            resetTime: now + WINDOW_MS,
        };
        rateLimitMap.set(ip, info);
    }
    else {
        info.count++;
    }
    if (info.count > MAX_REQUESTS) {
        return c.json({
            error: "Too Many Requests",
            message: "Você excedeu o limite de submissões. Por favor, aguarde um minuto e tente novamente.",
        }, 429);
    }
    await next();
}
