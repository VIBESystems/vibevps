export async function authGuard(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.status(401).send({ error: 'Non autorizzato' });
    }
}
//# sourceMappingURL=auth.guard.js.map