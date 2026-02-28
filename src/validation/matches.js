 import { z } from 'zod';
  
  // Constants
  // Key-value pairs with lowercase values as requested
export const MATCH_STATUS = {
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    FINISHED: 'finished',
};
  
// Schemas
  
// Validates an optional limit as a coerced positive integer with a maximum of 100.
export const listMatchesQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
});

// Validates a required id as a coerced positive integer.
export const matchIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

// Helper to validate ISO date strings using Date parsing
const isoDateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), { 
    message: 'Invalid ISO date string' 
});

// Create match schema:
// - sport, homeTeam, awayTeam: non-empty strings
// - startTime, endTime: strings validated as ISO date strings
// - superRefine: endTime must be after startTime
// - optional homeScore, awayScore: coerced non-negative integers
export const createMatchSchema = z.object({
    sport: z.string().min(1, { message: 'sport is required' }),
    homeTeam: z.string().min(1, { message: 'homeTeam is required' }),
    awayTeam: z.string().min(1, { message: 'awayTeam is required' }),
    startTime: isoDateStringSchema,
    endTime: isoDateStringSchema,
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
})
.superRefine((data, ctx) => {
    const start = Date.parse(data.startTime);
    const end = Date.parse(data.endTime);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
    if (end <= start) {
        ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endTime must be after startTime',
        path: ['endTime'],
        });
    }
    }
});

// Update score schema:
// - requires homeScore and awayScore as coerced non-negative integers
export const updateScoreSchema = z.object({
    homeScore: z.coerce.number().int().min(0),
    awayScore: z.coerce.number().int().min(0),
});