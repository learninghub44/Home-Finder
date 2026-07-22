import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const viewingRequestSchema = z
  .object({
    requested_date: z
      .string()
      .regex(DATE_RE, "Use YYYY-MM-DD, e.g. 2026-08-14"),
    requested_time: z
      .string()
      .regex(TIME_RE, "Use 24-hour HH:mm, e.g. 14:30"),
    notes: z.string().max(300, "Keep notes under 300 characters").optional(),
  })
  .refine(
    (data) => {
      const candidate = new Date(`${data.requested_date}T${data.requested_time}:00`);
      return candidate.getTime() > Date.now();
    },
    { message: "Pick a date and time in the future", path: ["requested_date"] },
  );

export type ViewingRequestFormValues = z.infer<typeof viewingRequestSchema>;
