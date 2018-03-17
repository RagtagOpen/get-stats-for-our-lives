import {Events} from "../server/loaders";

async function runTest() {
  const result = await Events.loadEventDetails();
  const entries = [...result.entries()];
  process.stdout.write(JSON.stringify(entries, undefined, 2));
}
runTest();