# Ragtag APIs for March for Our Lives data access

This project provides an Amazon Web Services (AWS) lambda function that returns statistics on the March for Our Lives, ans well as the list of all events and a lookup of nearby events.  These statics include the number of petition signatories, the number of events taking place, and the aggregate total number of people signed up to march at the events.  The function provides a REST GET API.

The project is written in TypeScript for compilation to JavaScript.

It includes components to allow cross-domain API requests (using cross-domain messaging) if deployed with api/proxy.js and an iframe that does nothing buy load that proxy.js (still to be added).

## API
For full details, see `src/static/api.ts`

`/api/stats`

     returns a `MarchForOurLivesStats` object with current statistics (see interface below.)

`/api/events`

     returns an array of all `MarchForOurLivesEvent` objects in the database.

`/api/nearby`

     requres either `zipCode` or (`latitude` and `longitude`)

     optional parameters are `maxDistanceInMeters` (an integer) and `maxResults` (the max number of reuslts to return).

     returns at most `maxResults` `MarchForOurLivesEvent` objects ranked by distance (closest first)

`/api/search`

     requres either query (string)

     optional parameter is `maxResults` (the max number of reuslts to return).

     Searches on zip code if query is a numeric string of 5+ digits, otherwise
     performs a text search on city, venue, state, and zip (for direct matches if < 5 digits)

## Installing dependencies
If you haven't already, install node.js on your machine.

Clone the repository from https://github.com/RagtagOpen/get-stats-for-our-lives.git

### If you use yarn, use it to install the project's dependencies.
```
yarn
```
### If you do not use yarn, install via Node Package Manager (npm).
```
npm install
```

## Compiling
Compile the typescript into javascript to build the contents of the `dist` directory.
```
node ./node_modules/typescript/bin/tsc
```
## Test individual functions
```
node ./dist/test/stats.js
node ./dist/test/marches.js
node ./dist/test/marches-by-lat-long.js
node ./dist/test/marches-by-zip-code.js
node ./dist/test/marches-by-query.js
```
## Run a server
```
npm run serve
```
## Not yet tested
Exposing as lambda functions
## To do
Compile API as separate .js and typescript defintions for export to partners
## Epilog
"And I would have gotten away with it too, if it weren't for you meddling kids!" -- Every villian on Scooby Doo, and soon the NRA as well.

## Event format
```
interface MarchForOurLivesEvent {
  attendee_count: number;
  latitude: number;
  longitude: number;
  id: number;
  is_full: boolean;
  is_open_for_signup: boolean;
  is_in_past: boolean;
  time_at_iso: string; // ISO 8601 formatted start time with time zone set to event's zip code
  day: number;
  hour: number;
  minute: number;
  city_etc_no_postal: string;
  address1: string;
  address2: string;
  city: string;
  zip: string;
  title: string;
  city_etc: string;
  venue: string;
  state: string;
};
```

## Statistics format
```
interface MarchForOurLivesStatistics {
  // The total number of marches
  numEvents: number;
  // The total number of participants for all the marches
  numParticipants: number;  
  // The total number of petition signatures
  numPetitionSignatures: number;
};
```
