import { WebSocket } from 'ws';

for (let i = 0; i < 20; i++) {
  const ws = new WebSocket("ws://localhost:8000/ws");
  ws.onopen = () => console.log(`Socket ${i} opened`);
  ws.onclose = (e) => console.log(`Socket ${i} closed: ${e.code} ${e.reason}`);
}