import axios from "axios";
import sphereKnn = require("sphere-knn");
import tzLookup = require("tz-lookup");
import {MarchForOurLivesEvent, GetNearestMarchesRequestParams, SearchMarchesRequestParams} from "../../types";
import {zipCodeToLatLong} from "./zip-code-to-latitude-and-longitude";
import {zipCodeToTimeZone} from "./zip-code-to-time-zone";
import * as momenttz from "moment-timezone";
import {cacheFactory} from "./cache-factory";
import * as lunr from "lunr";

const msBetweenReloads = parseInt(process.env["MFOL_EVENT_CACHE_RELOAD_FREQ_MS"] as string || "5000", 10);

interface RawDatabaseFormat {
  city_etc_no_postal: string;
  attendee_count: string; // parseInt
  address1: string;
  address2: string;
  starts_at_ts: string; // YYYY-MM-DD HH:mm:ss, e.g. '2018-03-24 10:00:00',
  latitude: string; // parseFloat, e.g. '33.81947',
  longitude: string; // parseFloat  e.g. '-116.52094',
  is_full: "True" | "False"; // parse to boolean via (value === "True")
  id: string; // parseInt    '8714',
  is_in_past: "True" | "False"; //
  city: string; // e.g. 'Palm Springs',
  is_open_for_signup: "True" | "False",
  zip: string;
  title: string; // e.g. 'March for Our Lives - Palm Springs, CA',
  city_etc: string; // 'Palm Springs, CA 92262',
  venue: string; // e.g.  'Palm Springs High School Football Stadium',
  state: string; // e.g.  'CA',
  starts_at: string; // parse via new Date() // e.g.  'Saturday, March 24, 10:00 AM ',
  starts_at_full: string; // prase via new Data 'Saturday, March 24, 10:00 AM'
}

function parseTrueFalse(tfString: "True" | "False"): boolean {
  return tfString === "True";
}

const timeZoneNumberToName: {[number: string]: string} = {
  0: "America/New_York",
  1: "America/Chicago",
  2: "America/Denver",
  3: "America/Los_Angeles",
  4: "America/Kentucky/Louisville",
  5: "America/Indiana/Indianapolis",
  6: "America/Detroit",
  7: "America/Boise",
  8: "America/Phoenix",
  9: "America/Anchorage",
  10: "Pacific/Honolulu",
  11: "America/Indiana/Knox",
  12: "America/Indiana/Winamac",
  13: "America/Indiana/Vevay",
  14: "America/Indiana/Marengo",
  15: "America/Indiana/Vincennes",
  16: "America/Indiana/Tell_City",
  17: "America/Indiana/Petersburg",
  18: "America/Menominee",
  19: "America/Shiprock",
  20: "America/Nome",
  21: "America/Juneau",
  22: "America/Kentucky/Monticello",
  23: "America/North_Dakota/Center",
  24: "America/Yakutat"
};

function rawEventToEvent(rawEvent: RawDatabaseFormat): MarchForOurLivesEvent {
  const {starts_at, starts_at_full, starts_at_ts, ...raw} = rawEvent;
  const latitude = parseFloat(raw.latitude);
  const longitude = parseFloat(raw.longitude);

  const timeZoneByZip = (typeof(raw.zip) === "string" && raw.zip.length >= 5) ?
    timeZoneNumberToName[zipCodeToTimeZone[raw.zip.substr(0,5)]] : undefined;
  const timeZone = timeZoneByZip || tzLookup(latitude, longitude);
  const whenStarts = momenttz.tz(starts_at_ts, "YYYY-MM-DD HH:mm:ss", timeZone);
  const time_at_iso = whenStarts.toISOString(true);
  // const year = parseInt(starts_at_ts.substr(0,4));
  // const month = parseInt(starts_at_ts.substr(5,2));
  const day = parseInt(starts_at_ts.substr(8,2));
  const hour = parseInt(starts_at_ts.substr(11,2), 10);
  const minute = parseInt(starts_at_ts.substr(14,2), 10);
  return {
    ...raw,
    latitude,
    longitude,
    attendee_count: parseInt(raw.attendee_count, 10),
    id: parseInt(raw.id),
    is_full: parseTrueFalse(raw.is_full),
    is_open_for_signup: parseTrueFalse(raw.is_open_for_signup),
    is_in_past: parseTrueFalse(raw.is_in_past),
    time_at_iso,
    day,
    hour,
    minute
  }
}

const actionKitUrl = `https://event.marchforourlives.com/cms/event/march-our-lives-events_attend/search_results/?all=1&akid=&source=&page=march-our-lives-events_attend&callback=actionkit.forms.onEventSearchResults&callback=actionkit.forms.onEventSearchResults&r=0.4442138994547189`;
export async function loadMarchesByScrapingEveryTown() {
  try {
    const actionKitPage = await axios.get(actionKitUrl);
    let body = actionKitPage.data as string;
    const events: MarchForOurLivesEvent[] = [];

    const startIndicator = `\\nvar event_details = `; // {\\n`;
    const endIndicator = `;\\ntry {\\nadd_marker(`; // `\\n}
    let startIndicatorPosition = body.indexOf(startIndicator, 0);
    while (startIndicatorPosition >= 0) {
      try {
        const startPosition = startIndicatorPosition + startIndicator.length;
        const endPosition = body.indexOf(endIndicator, startPosition);
        if (endPosition < 0)
          break;
        const entryString = body.slice(startPosition, endPosition)
          .replace(/',\\n'/g, `","`)
          .replace(/': '/g, `": "`)
          .replace(/\\n/g,``)
          .replace(`{'`, `{"`)
          .replace(`'}`, `"}`);
        const rawEvent: RawDatabaseFormat = JSON.parse(entryString);
        const event = rawEventToEvent(rawEvent);
        events.push(event);
        startIndicatorPosition = body.indexOf(startIndicator, endPosition);
      } catch (e) {
        console.log("exception", e);
      }
    }
    const eventsById = new Map<string, MarchForOurLivesEvent>(
      events.map( event => [event.id.toString(), event] as [string, MarchForOurLivesEvent])
    );
    const index = lunr(function () {
      this.field('city_etc_no_postal')
      this.field('zip')
      this.field('venue')
      this.field('state')
     
      events.forEach( event => this.add(event));
    });
    const cachedGeographicEventLookup = sphereKnn(events);
    return {
      index,
      events,
      eventsById,
      cachedGeographicEventLookup,
    };
  } catch (e) {
    //
    console.log("exception", e);
    throw e;
  }
}

const cache = cacheFactory(loadMarchesByScrapingEveryTown, msBetweenReloads);

export async function getMarchForOurLivesEvents() {
  const {events} = await cache();
  return events;
}

export async function getNearestMarches(
  params: GetNearestMarchesRequestParams) {
  const maxResults = params.maxResults || 5;
  const maxDistanceInMeters = params.maxDistanceInMeters;
  let latitude: number;
  let longitude: number;
  if ("zipCode" in params) {
    const {zipCode} = params;
    const latLon = zipCodeToLatLong[zipCode];
    if (!latLon) {
      throw new Error("Invalid zipcode");
    }
    [latitude, longitude] = latLon;
  } else if ((typeof params.latitude === "number") && (typeof params.longitude === "number")) {
    latitude = params.latitude;
    longitude = params.longitude;
  } else {
    latitude = parseFloat(params.latitude as string);
    longitude = parseFloat(params.longitude as string);
  }
  const {cachedGeographicEventLookup} = await cache();
  return cachedGeographicEventLookup(latitude, longitude, maxResults, maxDistanceInMeters);
};


export async function searchMarches(
  params: SearchMarchesRequestParams) {
  const {maxResults = 5, query} = params;
  const trimQuery = query.trim().substr(0,5);
  if (trimQuery.match(/\d{5}/) != null) {
    return await getNearestMarches({zipCode: trimQuery, maxResults});
  }
  const {eventsById, index} = await cache();
  const results = index.search(query)
    .slice(0, maxResults)
    .map( result => {
      return {...result, ...eventsById.get(result.ref)}
     } );
  return results;
};