import arcjet, {shield, detectBot, slidingWindow} from '@arcjet/node';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if(!arcjetKey){
    throw new Error("Missing ARCJET_KEY environment variable");
}

//creates and exports a new instance of arcjet to protect http server
export const httpArcjet = arcjetKey ? 
    arcjet({
        key: arcjetKey,
        rules: [
            shield({mode: arcjetMode}), //protects against common web attacks like SQLi, XSS
            detectBot({mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}), //blocks or flags bot traffic based on behavioral analysis
            slidingWindow({mode: arcjetMode, interval: '10s', max: 50}) // allows a maximum of 50 requests per 10 seconds from the same IP, with a sliding window algorithm
        ]
    }) : null;

    //creates and exports a new instance of arcjet to protect the websocket
export const wsArcjet = arcjetKey ? 
    arcjet({
        key: arcjetKey,
        rules: [
            shield({mode: arcjetMode}), //protects against common web attacks like SQLi, XSS
            detectBot({mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}), //blocks or flags bot traffic based on behavioral analysis
            slidingWindow({mode: arcjetMode, interval: '2s', max: 5}) // allows a maximum of 5 requests per 2 seconds from the same IP, with a sliding window algorithm
        ]
    }) : null;

export function securityMiddleware() {
    return async(req, res, next) => {
        if(!httpArcjet){
            return next();
        }

        try{
            const decision = await httpArcjet.protect(req); //analysis the req locally or calls arcjet cloud to get a decide whether we are letting this req through or not

            if(decision.isDenied()){
                if(decision.reason.isRateLimit()){
                    return res.status(429).json({error: 'Too many requests'});
                }
                return res.status(403).json({error: 'Forbidden'});
            }

        } catch (e){
            console.error("Arcjet middleware error", e);
            return res.status(503).json({error:'Service unavailable'});
        }
        next();
    }
}