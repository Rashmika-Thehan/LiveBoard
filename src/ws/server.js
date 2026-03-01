import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);

    if(!subscribers) return;
    subscribers.delete(socket);

    if(subscribers.size===0){
        matchSubscribers.delete(matchId);
    }
}


function cleanupSubscriptions(socket) {
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId, socket);
    }
}

function sendJson(socket, payload) {
    if(socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers) return;

    const message = JSON.stringify(payload);
    for(const client of subscribers){
        if(client.readyState === WebSocket.OPEN){
            client.send(message);
        }
    }
}

function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    }
}

function handleMessage(socket, data) {
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (e) {
        return sendJson(socket, {type:'error', error: 'Invalid JSON'});
    }

    if(message?.type === 'subscribe' && Number.isInteger(message.matchId)){
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket, {type:'subscribed', matchId: message.matchId});
        return;
    }
    if(message?.type === 'unsubscribe' && Number.isInteger(message.matchId)){
        unsubscribe(message.matchId, socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket, {type:'unsubscribed', matchId: message.matchId});
        return;
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 }); // 1MB max payload

    wss.on('connection', async(socket, req) => {
        if(wsArcjet){
            try{
                const decision = await wsArcjet.protect(req); // analysis the req locally or calls arcjet cloud to get a decide whether we are letting this req through or not
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
        socket.subscriptions = new Set(); // track which matches this socket is subscribed to
        sendJson(socket, {type:'welcome'});

        socket.on('message', (data) => handleMessage(socket, data));
        socket.on('close', () => cleanupSubscriptions(socket));
        socket.on('error', () => {socket.terminate()});
    });

    function broadcastMatchCreated(match) {
        broadcastToAll(wss, {type:'matchCreated', data: match});
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, {type:'Commentary', data: comment});
    }

    return { broadcastMatchCreated, broadcastCommentary };
}