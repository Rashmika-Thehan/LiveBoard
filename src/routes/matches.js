import express from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { getMatchStatus } from '../utils/match-status.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { desc } from 'drizzle-orm';

export const matchRouter = express.Router();

const MAX_LIMIT = 100;
matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    if(!parsed.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues});
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try{
        const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
        res.json({data});

    } catch (e){
        const message = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error && e.stack ? e.stack : undefined;
        res.status(500).json({ error: 'Failed to fetch matches', details: message, stack });
    }
})

matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid Match data", details: parsed.error.issues });
    }
    const { startTime, endTime, homeScore, awayScore } = parsed.data;
    try{
        const [event] = await db.insert(matches).values({
                ...parsed.data,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                homeScore: homeScore ?? 0,
                awayScore: awayScore ?? 0,
                status: getMatchStatus(startTime, endTime),
             }).returning();

             if(res.app.locals.broadcastMatchCreated) {
                res.app.locals.broadcastMatchCreated(event);
             }
             
        res.status(201).json({ data: event });

    } catch (e){
        const message = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error && e.stack ? e.stack : undefined;
        res.status(500).json({ error: 'Failed to create match', details: message, stack });
    }
});