import { ESTAT_BASE_URL, ESTAT_REQUEST_TIMEOUT } from "./config.js";

// A typical Japanese home (for scaling per-m2 land/floor price stats into a
// rough representative total). Purely a labeling convenience — the raw
// statValue/statUnit are always preserved on the listing so nothing is hidden.
const TYPICAL_HOME_SQM = 90;

// e-Stat's JSON conversion collapses single-item arrays to a bare object
// (a classic XML->JSON quirk). Every list-shaped field must be normalized
// before iterating, or a dataset with exactly one row silently breaks.
const toArray = (value) => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * e-Stat API client (v3.0, JSON) for Japan's government statistics API.
 * https://www.e-stat.go.jp/api/api-info/e-stat-manual3-0
 *
 * e-Stat issues a single Application ID per registered app (not per
 * end-user) and has no separate "apiKey" — appId is the only credential.
 */
export class EstatClient {
  constructor(appId) {
    if (!appId) {
      throw new Error("EstatClient requires an appId");
    }
    this.appId = appId;
  }

  async #request(endpoint, params) {
    const url = new URL(`${ESTAT_BASE_URL}/${endpoint}`);
    url.searchParams.set("appId", this.appId);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      ESTAT_REQUEST_TIMEOUT,
    );

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`e-Stat API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("e-Stat API request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verify the appId is accepted by e-Stat (cheapest possible real call).
   */
  async verifyCredentials() {
    try {
      const json = await this.#request("getStatsList", { limit: 1 });
      const result = json?.GET_STATS_LIST?.RESULT;
      if (!result || result.STATUS !== 0) {
        return { valid: false, error: result?.ERROR_MSG || "Unknown e-Stat error" };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Search the e-Stat table catalog to discover a statsDataId.
   * e.g. searchDatasets({ keyword: "空き家" })
   */
  async searchDatasets({ keyword, limit = 20 } = {}) {
    const json = await this.#request("getStatsList", {
      searchWord: keyword,
      limit,
    });

    const result = json?.GET_STATS_LIST?.RESULT;
    if (!result || result.STATUS !== 0) {
      throw new Error(`e-Stat error: ${result?.ERROR_MSG || "Unknown error"}`);
    }

    const tables = toArray(json.GET_STATS_LIST.DATALIST_INF?.TABLE_INF);

    return tables.map((t) => ({
      statsDataId: t["@id"],
      statName: t.STAT_NAME?.$ || "",
      title: typeof t.TITLE === "string" ? t.TITLE : t.TITLE?.$ || "",
      govOrg: t.GOV_ORG?.$ || "",
      mainCategory: t.MAIN_CATEGORY?.$ || "",
      subCategory: t.SUB_CATEGORY?.$ || "",
      surveyDate: t.SURVEY_DATE || "",
      updatedDate: t.UPDATED_DATE || "",
    }));
  }

  /**
   * Fetch raw statistical data for a table (statsDataId) plus its
   * classification metadata (area/category/time code -> name lookups).
   */
  async fetchStatsData({ statsDataId, limit = 100, startPosition = 1 }) {
    if (!statsDataId) {
      throw new Error("statsDataId is required to fetch e-Stat data");
    }

    const json = await this.#request("getStatsData", {
      statsDataId,
      limit,
      startPosition,
      metaGetFlg: "Y",
      cntGetFlg: "N",
    });

    const result = json?.GET_STATS_DATA?.RESULT;
    if (!result || result.STATUS !== 0) {
      throw new Error(`e-Stat error: ${result?.ERROR_MSG || "Unknown error"}`);
    }

    const statData = json.GET_STATS_DATA.STATISTICAL_DATA;
    const classAxes = toArray(statData?.CLASS_INF?.CLASS_OBJ);
    const values = toArray(statData?.DATA_INF?.VALUE);

    return { classAxes, values };
  }

  /**
   * Build { axisId: { name, codes: { code: { name, level, parentCode } } } }
   * from CLASS_INF.CLASS_OBJ so raw codes on each data row can be resolved
   * to human-readable Japanese names.
   */
  static buildClassLookup(classAxes) {
    const lookup = {};
    for (const axis of classAxes) {
      const codes = {};
      for (const cls of toArray(axis.CLASS)) {
        codes[cls["@code"]] = {
          name: cls["@name"],
          level: cls["@level"],
          parentCode: cls["@parentCode"],
        };
      }
      lookup[axis["@id"]] = { name: axis["@name"], codes };
    }
    return lookup;
  }

  static resolveArea(areaCode, areaAxis) {
    const entry = areaAxis?.codes?.[areaCode];
    if (!entry) {
      return { prefecture: areaCode || "Unknown", city: "" };
    }
    // Prefecture-level rows have no parentCode (or level "1"); municipality
    // rows carry a parentCode pointing back at their prefecture's code.
    if (!entry.parentCode) {
      return { prefecture: entry.name, city: "" };
    }
    const parent = areaAxis.codes[entry.parentCode];
    return { prefecture: parent?.name || entry.name, city: entry.name };
  }

  static estimatePrice(statValue, unit) {
    if (!unit || !Number.isFinite(statValue)) return 0;
    if (unit.includes("円/m2") || unit.includes("円/㎡")) {
      return Math.round(statValue * TYPICAL_HOME_SQM);
    }
    if (unit.includes("千円")) return Math.round(statValue * 1000);
    if (unit === "円" || unit.includes("円")) return Math.round(statValue);
    return 0;
  }

  /**
   * Transform raw e-Stat statistical rows into area-level "listing" cards.
   *
   * IMPORTANT: e-Stat publishes aggregate statistics per area (vacant-home
   * counts, average land price, housing starts) — never individual homes
   * with a street address or photo. Each card here represents one area's
   * statistic for the most recent survey period in the fetched data, and
   * is explicitly flagged `isStatisticalEstimate: true` so the frontend can
   * label it as such rather than presenting it as a specific property.
   */
  static transformToAreaListings({ classAxes, values }, { statsDataId }) {
    if (!values.length) return [];

    const lookup = EstatClient.buildClassLookup(classAxes);
    const areaAxis = lookup.area;
    const timeAxis = lookup.time;
    const catAxis = lookup.cat01;
    const tabAxis = lookup.tab;

    // Restrict to the most recent survey period present in this batch so we
    // don't emit a dozen near-duplicate cards per area across decades of
    // survey history. e-Stat time codes are zero-padded and sort correctly
    // as strings (larger code = later period).
    const latestTime = values.reduce(
      (max, v) => (v["@time"] > max ? v["@time"] : max),
      values[0]["@time"],
    );

    return values
      .filter((v) => v["@time"] === latestTime)
      .map((v) => {
        const { prefecture, city } = EstatClient.resolveArea(v["@area"], areaAxis);
        const timeName = timeAxis?.codes?.[v["@time"]]?.name || v["@time"];
        const categoryLabel =
          catAxis?.codes?.[v["@cat01"]]?.name ||
          tabAxis?.codes?.[v["@tab"]]?.name ||
          "Statistic";
        const unit = v["@unit"] || "";
        const statValue = parseFloat(v["$"]);

        const listingId = [
          "estat",
          statsDataId,
          v["@tab"],
          v["@cat01"],
          v["@area"],
          v["@time"],
        ]
          .filter(Boolean)
          .join("-");

        return {
          listingId,
          title: `${prefecture}${city ? " ・ " + city : ""} — ${categoryLabel} (${timeName})`,
          prefecture,
          city,
          price: EstatClient.estimatePrice(statValue, unit),
          imageUrl: "",
          bedrooms: null,
          sqMeters: null,
          yearBuilt: null,
          description:
            `Statistical estimate for ${prefecture}${city ? " / " + city : ""}, ` +
            `based on e-Stat dataset ${statsDataId} (${timeName}): ` +
            `${categoryLabel} = ${Number.isFinite(statValue) ? statValue.toLocaleString() : v["$"]}${unit}. ` +
            `This reflects an aggregate government statistic for the area, not an individual property.`,
          tags: ["e-Stat", "Statistical Estimate", categoryLabel].filter(Boolean),
          isStatisticalEstimate: true,
          sourceDatasetId: statsDataId,
          statValue: Number.isFinite(statValue) ? statValue : null,
          statUnit: unit,
          statLabel: categoryLabel,
        };
      })
      .filter((listing) => listing.prefecture && listing.prefecture !== "Unknown");
  }
}

export default EstatClient;
