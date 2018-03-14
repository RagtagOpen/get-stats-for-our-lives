import {Events} from "../server/loaders";

async function runTest() {
  const iowaResult = await Events.searchMarches({query: "iowa"});
  process.stdout.write(`Query for 'iowa'\n` + JSON.stringify(iowaResult, undefined, 2));

  const oaklandResult = await Events.searchMarches({query: "oakland"});
  process.stdout.write(`Query for 'oakland'\n` + JSON.stringify(oaklandResult, undefined, 2));

  const zipResult = await Events.searchMarches({query: "02138"});
  process.stdout.write(`Query for '02138'\n` + JSON.stringify(zipResult, undefined, 2));
}
runTest();