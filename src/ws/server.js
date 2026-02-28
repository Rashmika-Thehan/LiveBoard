import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

function sendJson(socket, payload) {
    if(socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 }); // 1MB max payload

    wss.on('connection', async(socket, req) => {
        if(wsArcjet){
            try{
                const decision = await wsArcjet.protect(socket); // analysis the req locally or calls arcjet cloud to get a decide whether we are letting this req through or not
                if(decision.isDenied()){
                    const code = decision.reason.isRateLimit() ? 1013 : 1008; // 1013 - try again later (rate limited), 1008 - policy violation (other reasons)
                    const reason = decision.reason.isRateLimit() ? 'Too many requests' : 'Access denied';
                    socket.close(code, reason);
                    return;
                }

            } catch (e){
                console.error("Arcjet WebSocket protection error", e);
                socket.close(1011, "Server Security Error");
                return;
            }
        }
        sendJson(socket, {type:'welcome'});
        socket.on('error', console.error);
    });

    function broadcastMatchCreated(match) {
        broadcast(wss, {type:'matchCreated', data: match});
    }
    return { broadcastMatchCreated };
}