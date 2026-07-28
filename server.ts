import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initRealtimeHub } from "./src/bsp/infrastructure/realtime/realtime-hub";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
/** Railway and containers require binding all interfaces in production. */
const listenHost = dev ? hostname : "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  initRealtimeHub(server);

  server.listen(port, listenHost, () => {
    console.log(`> BSP ready on http://${hostname}:${port} (bind ${listenHost}, WebSocket enabled)`);
  });
});
