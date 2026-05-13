require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.AISSTREAM_KEY;
if (!apiKey) {
  console.log("No API key");
  process.exit(1);
}

const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
ws.addEventListener('open', () => {
  console.log("Connected");
  const sub = {
    APIKey: apiKey,
    BoundingBoxes: [[[25.2, 54.6], [27.8, 58.4]]],
    FilterMessageTypes: ['PositionReport', 'ShipStaticData']
  };
  ws.send(JSON.stringify(sub));
});

ws.addEventListener('message', (event) => {
  console.log("Got message:", event.data.toString().substring(0, 100));
});

ws.addEventListener('error', (err) => console.log("Error:", err));
ws.addEventListener('close', () => console.log("Closed"));
