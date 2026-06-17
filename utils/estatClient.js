// Note: fetch is available globally in Node.js 18+
// If using Node < 18, uncomment the line below and install node-fetch
// import fetch from "node-fetch";

// const ESTAT_BASE_URL = "https://api.e-stat.go.jp/api/1.1/json";

/**
 * e-Stat API Client for housing data retrieval
 * Handles authentication and data fetching from e-Stat
 */
export class EstatClient {
  constructor(appId, apiKey) {
    this.appId = appId;
    this.apiKey = apiKey;
  }

  /**
   * Verify credentials by testing the API connection
   */
  async verifyCredentials() {
    try {
      const url = new URL(`${ESTAT_BASE_URL}/app/queryInfo`);
      url.searchParams.append("appId", this.appId);
      url.searchParams.append("apiKey", this.apiKey);
      url.searchParams.append("limit", "1");

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`e-Stat API error: ${response.status}`);
      }

      const data = await response.json();
      return data.result.error !== null
        ? { valid: false, error: data.result.error }
        : { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Fetch housing data from e-Stat database
   * @param {Object} params - Query parameters
   * @param {String} params.statsDataId - e-Stat database ID for housing data
   * @param {String} params.prefecture - Prefecture code or name
   * @param {String} params.limit - Number of results to return
   */
  async fetchHousingData(params = {}) {
    try {
      const {
        statsDataId = "0003411",
        prefecture = null,
        limit = 100,
        offset = 0,
      } = params;

      const url = new URL(`${ESTAT_BASE_URL}/data`);
      url.searchParams.append("appId", this.appId);
      url.searchParams.append("apiKey", this.apiKey);
      url.searchParams.append("statsDataId", statsDataId);
      url.searchParams.append("cdTab", "Y");
      url.searchParams.append("limit", limit);
      url.searchParams.append("startPosition", offset);

      if (prefecture) {
        url.searchParams.append("lvTab", prefecture);
      }

      // Use AbortController for timeout support in fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `e-Stat API error: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.result.error) {
          throw new Error(`e-Stat error: ${JSON.stringify(data.result.error)}`);
        }

        return this.transformEstatData(data);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("e-Stat API request timeout");
      }
      throw new Error(`Failed to fetch housing data: ${error.message}`);
    }
  }

  /**
   * Fetch all available datasets from e-Stat
   */
  async fetchDatasets(searchKeyword = "housing") {
    try {
      const url = new URL(`${ESTAT_BASE_URL}/app/getStatsList`);
      url.searchParams.append("appId", this.appId);
      url.searchParams.append("apiKey", this.apiKey);
      url.searchParams.append("searchWord", searchKeyword);
      url.searchParams.append("limit", "100");

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`e-Stat API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.result.error) {
        throw new Error(`e-Stat error: ${JSON.stringify(data.result.error)}`);
      }

      return data.result;
    } catch (error) {
      throw new Error(`Failed to fetch datasets: ${error.message}`);
    }
  }

  /**
   * Transform e-Stat API response to housing property format
   */
  transformEstatData(estatResponse) {
    try {
      if (!estatResponse.result || !estatResponse.result.data) {
        return [];
      }

      const { table, data } = estatResponse.result;

      // Transform raw e-Stat data into property listings
      return data
        .map((item) => {
          return {
            listingId: `estat-${item[0]}`,
            title: this.extractTitle(item, table),
            prefecture: item.find((val, idx) => table.tab[idx]?.name === "area")
              ? item[table.tab.findIndex((t) => t.name === "area")]
              : "Unknown",
            city: this.extractCity(item, table),
            price: this.extractPrice(item, table),
            bedrooms: this.extractBedrooms(item, table),
            sqMeters: this.extractSquareMeters(item, table),
            yearBuilt: this.extractYearBuilt(item, table),
            description: this.extractDescription(item, table),
            imageUrl: "",
            tags: ["e-Stat", "Government Data"],
          };
        })
        .filter((property) => property.price > 0); // Only return valid listings
    } catch (error) {
      console.error("Error transforming e-Stat data:", error);
      return [];
    }
  }

  extractTitle(item, table) {
    const titleIndex = table.tab.findIndex(
      (t) => t.name === "title" || t.name === "区分",
    );
    return titleIndex >= 0 ? item[titleIndex] : "Housing Data";
  }

  extractCity(item, table) {
    const cityIndex = table.tab.findIndex(
      (t) => t.name === "city" || t.name === "市区町村",
    );
    return cityIndex >= 0 ? item[cityIndex] : "Unknown";
  }

  extractPrice(item, table) {
    const priceIndex = table.tab.findIndex(
      (t) =>
        t.name === "price" ||
        t.name === "価格" ||
        t.name === "平均価格" ||
        t.name?.includes("価"),
    );
    const price = priceIndex >= 0 ? parseFloat(item[priceIndex]) : 0;
    return isNaN(price) ? 0 : price;
  }

  extractBedrooms(item, table) {
    const bedroomIndex = table.tab.findIndex(
      (t) =>
        t.name === "bedrooms" || t.name === "部屋数" || t.name?.includes("室"),
    );
    const bedrooms = bedroomIndex >= 0 ? parseInt(item[bedroomIndex]) : null;
    return isNaN(bedrooms) ? null : bedrooms;
  }

  extractSquareMeters(item, table) {
    const sqIndex = table.tab.findIndex(
      (t) =>
        t.name === "sqMeters" || t.name === "面積" || t.name?.includes("㎡"),
    );
    const sqMeters = sqIndex >= 0 ? parseFloat(item[sqIndex]) : null;
    return isNaN(sqMeters) ? null : sqMeters;
  }

  extractYearBuilt(item, table) {
    const yearIndex = table.tab.findIndex(
      (t) => t.name === "year" || t.name === "築年数" || t.name?.includes("年"),
    );
    const year = yearIndex >= 0 ? parseInt(item[yearIndex]) : null;
    return isNaN(year) ? null : year;
  }

  extractDescription(item, table) {
    const descIndex = table.tab.findIndex(
      (t) =>
        t.name === "description" ||
        t.name === "説明" ||
        t.name?.includes("備考"),
    );
    return descIndex >= 0 ? item[descIndex] : "";
  }
}

export default EstatClient;
