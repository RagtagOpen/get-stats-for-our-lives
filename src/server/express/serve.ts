import * as express from "express";
import * as Loaders from "../loaders";
import * as cors from "cors";
import * as compression from "compression";
import * as path from "path";

export function wrapGet<
  QUERY_PARAMETERS
>(
  handler: (parameters: QUERY_PARAMETERS, req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>
) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = await handler(req.query as QUERY_PARAMETERS, req, res, next);

      if (typeof (result) !== "undefined") {
        res.json(result);
      }

      // If we reached here, there was no error.
      // Send method-specific success codes
      if (typeof (result) === "undefined") {
        res.status(404); // Not found
      }
      res.end();
    } catch (err) {
      return next(err);
    }
  };
}

var app = express();

app.use(compression({}));

app.get('/api/nearby', cors(), wrapGet<{maxResults?: number, maxDistanceInMeters?: number} & ({zipCode: string} | {latitude: number, longitude: number})>( 
  async (params, _req, _res) => 
    await Loaders.Events.getNearestMarches(params)
));

app.get('/api/search', cors(), wrapGet<{query: string, maxResults?: number}>( 
  async (params, _req, _res) => 
    await Loaders.Events.searchMarches(params)
));

app.get('/api/events', cors(), wrapGet<undefined>( 
  async (_params, _req, _res) => 
    await Loaders.Events.getMarchForOurLivesEvents()
));

app.get('/api/stats', cors(), wrapGet<undefined>( 
  async (_params, _req, _res) => 
    await Loaders.Stats.getStatsForOurLives()
));

const staticParams = { root: path.join(__dirname, '../../static') };
app.get('/api.js', cors(), function(_req, res) {
  return res.sendFile('api.js', staticParams);
});

app.get('/demo.js', function(_req, res) {
  return res.sendFile('demo.js', staticParams);
});

app.get('/index.html', function(_req, res) {
  return res.sendFile('index.html', { root: path.join(__dirname, '../../../src/static') });
});

var port = process.env.PORT || 5000;

app.listen(port, function() {
    console.log("Listening on " + port);
});