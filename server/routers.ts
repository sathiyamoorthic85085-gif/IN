import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSecureRegistrationsByBuildType, RegistrationServiceError, registrationInputSchema, requestClientKey, submitSecureRegistration } from "./registrationService";
import { getSessionCookieOptions } from "./_core/cookies";
import { answerParticipantQuestion } from "./participantHelpService";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

export { registrationInputSchema } from "./registrationService";

const participantHelpWindows = new Map<string, { startedAt: number; count: number }>();

function assertParticipantHelpRateLimit(key: string) {
  const now = Date.now();
  const existing = participantHelpWindows.get(key);
  if (!existing || now - existing.startedAt > 10 * 60_000) {
    participantHelpWindows.set(key, { startedAt: now, count: 1 });
    return;
  }
  if (existing.count >= 12) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait a few minutes before sending another help question." });
  }
  existing.count += 1;
}

const participantHelpInputSchema = z.object({ message: z.string().trim().min(2).max(600) });

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  registration: router({
    submit: publicProcedure.input(registrationInputSchema).mutation(async ({ ctx, input }) => {
      try {
        return await submitSecureRegistration(input, requestClientKey(ctx.req.headers));
      } catch (error) {
        if (error instanceof RegistrationServiceError) {
          const code = error.status === 429 ? "TOO_MANY_REQUESTS" : error.status === 409 ? "CONFLICT" : error.status === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR";
          throw new TRPCError({ code, message: error.message });
        }
        throw error;
      }
    }),
    exportRows: adminProcedure.query(async () => ({
      software: await getSecureRegistrationsByBuildType("software"),
      hardware: await getSecureRegistrationsByBuildType("hardware"),
    })),
  }),
  participantHelp: router({
    ask: publicProcedure.input(participantHelpInputSchema).mutation(async ({ ctx, input }) => {
      assertParticipantHelpRateLimit(requestClientKey(ctx.req.headers));
      try {
        const result = await answerParticipantQuestion(input.message);
        return { answer: result.answer };
      } catch (error) {
        console.error("[ParticipantHelp] Unable to answer participant question", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The help assistant is temporarily unavailable. Please use the verified coordinator call action or email innohack26@gmail.com." });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
