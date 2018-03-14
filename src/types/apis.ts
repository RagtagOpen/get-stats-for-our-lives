
export type GetNearestMarchesRequestParams = {
  maxResults?: number,
  maxDistanceInMeters?: number
} & ({
  zipCode: string
} | {
  latitude: number,
  longitude: number,
} | {
  latitude: string,
  longitude: string,
});

export type SearchMarchesRequestParams = {
  maxResults?: number,
  query: string
};
