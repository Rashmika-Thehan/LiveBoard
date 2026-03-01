import { Router} from 'express';
import { db } from '../db/db.js';
import { matchIdParamSchema } from '../validation/matches.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';
import { commentary } from '../db/schema.js';
import {eq, desc} from 'drizzle-orm';

export const commentaryRouter = Router({ mergeParams: true }); // mergeParams allows us to access route params from parent routers
const MAX_LIMIT = 100;

commentaryRouter.get('/', async(req, res) => {
    try {
        // Validate route params
        const paramResult = matchIdParamSchema.safeParse(req.params);
        if (!paramResult.success) {
            return res.status(400).json({
                error: 'Invalid route parameter',
                details: paramResult.error.issues,
            });
        }

        // Validate query string
        const queryResult = listCommentaryQuerySchema.safeParse(req.query);
        if (!queryResult.success) {
            return res.status(400).json({
                error: 'Invalid query parameter',
                details: queryResult.error.issues,
            });
        }

        const { id: matchId } = paramResult.data;
        const limit = Math.min(queryResult.data.limit ?? MAX_LIMIT, MAX_LIMIT);

        // Fetch commentary rows for the given match
        const rows = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        return res.status(200).json({
        data: rows,
        meta: {
            matchId,
            limit,
            count: rows.length,
        },
    });
    } catch (err) {
        console.error('[GET /commentary] Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /matches/:id/commentary
commentaryRouter.post('/', async (req, res) => {
    try {
        // Validate route params
        const paramResult = matchIdParamSchema.safeParse(req.params);
        if (!paramResult.success) {
            return res.status(400).json({
                error: 'Invalid route parameter',
                details: paramResult.error.issues,
            });
        }

        // Validate request body
        const bodyResult = createCommentarySchema.safeParse(req.body);
        if (!bodyResult.success) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: bodyResult.error.issues,
            });
        }

    const { id: matchId } = paramResult.data;
    const {minute,sequence,period,eventType,actor,team,message,metadata,tags } = bodyResult.data;

    // Insert into commentary table
    const [created] = await db
      .insert(commentary)
      .values({matchId,minute,sequence,period,eventType,actor,team,message,metadata,tags,})
      .returning();

      if(res.app.locals.broadcastCommentary){
        res.app.locals.broadcastCommentary(created.matchId, created);
      }

    return res.status(201).json({ data: created });
  } catch (err) {
    console.error('[POST /commentary] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});