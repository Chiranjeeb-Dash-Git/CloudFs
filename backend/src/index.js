import "dotenv/config";
import { createApp } from "./app.js";
import { startTrashPurgeInterval } from "./util.js";

const port = Number(process.env.PORT || 8080);
const app = createApp();

startTrashPurgeInterval();

app.listen(port, () => {
  console.log(`CloudFS API listening on http://localhost:${port}`);
});
