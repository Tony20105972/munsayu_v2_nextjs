import { z } from "zod";

export const idempotencyKeySchema = z.string().min(16).max(128);
export const courseApplicationSchema = z.object({ courseId: z.string().min(1), studentName: z.string().min(1).max(80), guardianPhone: z.string().min(9).max(20), schoolName: z.string().min(1).max(120), department: z.string().min(1), grade: z.string().min(1), privacyConsent: z.literal(true), idempotencyKey: idempotencyKeySchema });
export const eventReservationSchema = z.object({ eventId: z.string().min(1), name: z.string().min(1).max(80), phone: z.string().min(9).max(20), grade: z.string().min(1), attendeeCount: z.number().int().min(1).max(2), privacyConsent: z.literal(true), idempotencyKey: idempotencyKeySchema });
export const reservationLookupSchema = z.object({ name: z.string().min(1), guardianPhone: z.string().min(9).max(20) });
export type CourseApplicationInput = z.infer<typeof courseApplicationSchema>;
export type EventReservationInput = z.infer<typeof eventReservationSchema>;
export type ReservationLookupInput = z.infer<typeof reservationLookupSchema>;
