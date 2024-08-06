declare module 'geojson-places' {
  export interface RegionInfo {
    continent_code: string;
    country_a2: string;
    country_a3: string;
    region_code: string;
    state_code: string;
  }

  export interface GeoJSONFeatureCollection {
    type: string;
    features: any[];
  }

  export interface CountryInfo {
    country_a2: string;
    country_a3: string;
    country_name: string;
  }

  export interface ContinentInfo {
    continent_code: string;
    continent_name: string;
    countries: string[];
  }

  export interface StateInfo {
    state_code: string;
    state_name: string;
  }

  export interface RegionStateInfo {
    country_a2: string;
    region_code: string;
    region_name: string;
    states: StateInfo[];
  }

  export function lookUp(latitude: number, longitude: number): RegionInfo | null;
  export function lookUpGeoJSON(latitude: number, longitude: number): GeoJSONFeatureCollection | null;
  export function lookUpRaw(latitude: number, longitude: number): any;
  export function getContinentGeoJSONByCode(continent_code: string, simplified?: boolean): GeoJSONFeatureCollection | null;
  export function getCountryGeoJSONByAlpha2(country_a2: string): GeoJSONFeatureCollection | null;
  export function getCountryGeoJSONByAlpha3(country_a3: string): GeoJSONFeatureCollection | null;
  export function getCountryGroupingGeoJSONByCode(grouping_code: string, simplified?: boolean): GeoJSONFeatureCollection | null;
  export function getRegionGeoJSONByCode(region_code: string): GeoJSONFeatureCollection | null;
  export function getStateGeoJSONByCode(state_code: string): GeoJSONFeatureCollection | null;
  export function getContinents(locale?: string | null): ContinentInfo[];
  export function getContinentByCode(continent_code: string, locale?: string | null): ContinentInfo | null;
  export function isValidContinentCode(continent_code: string): boolean;
  export function getCountries(locale?: string | null): CountryInfo[];
  export function getCountryByAlpha2(country_a2: string, locale?: string | null): CountryInfo | null;
  export function getCountryByAlpha3(country_a3: string, locale?: string | null): CountryInfo | null;
  export function isValidCountryAlpha2(country_a2: string): boolean;
  export function isValidCountryAlpha3(country_a3: string): boolean;
  export function countryAlpha3ToAlpha2(country_a3: string): string | null;
  export function countryAlpha2ToAlpha3(country_a2: string): string | null;
  export function getCountriesByContinentCode(continent_code: string, locale?: string | null): CountryInfo[];
  export function getCountriesByCountryGroupingCode(grouping_code: string, locale?: string | null): CountryInfo[];
  export function getCountryGroupings(locale?: string | null): any[];
  export function getCountryGroupingByCode(grouping_code: string, locale?: string | null): any | null;
  export function isValidCountryGroupingCode(grouping_code: string): boolean;
  export function getRegions(locale?: string | null): any[];
  export function getRegionsAndStates(locale?: string | null): RegionStateInfo[];
  export function getRegionsByCountryAlpha2(alpha2: string, locale?: string | null): any[];
  export function getRegionsByCountryAlpha3(alpha3: string, locale?: string | null): any[];
  export function getRegionByCode(region_code: string, locale?: string | null): RegionStateInfo | null;
  export function isValidRegionCode(region_code: string): boolean;
  export function getStatesByRegionCode(region_code: string, locale?: string | null): StateInfo[];
  export function getStateByCode(state_code: string, locale?: string | null): StateInfo | null;
  export function isValidStateCode(state_code: string): boolean;
}
