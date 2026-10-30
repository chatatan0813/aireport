import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fetchGoogleRating, BISNIS_GOOGLE } from "./google-rating";

describe("fetchGoogleRating", () => {
  const kunciSebelum = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "kunci-uji";
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = kunciSebelum;
  });

  function fetchPalsu(jawab: (placeId: string) => Response) {
    const panggilan: { url: string; kunci: string | null; mask: string | null }[] = [];
    const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const h = new Headers(init?.headers);
      panggilan.push({ url, kunci: h.get("x-goog-api-key"), mask: h.get("x-goog-fieldmask") });
      return jawab(url.split("/places/")[1]);
    }) as typeof fetch;
    return { impl, panggilan };
  }

  it("asks Places API (New) for rating + review count of every business", async () => {
    const { impl, panggilan } = fetchPalsu(() =>
      Response.json({ rating: 4.8, userRatingCount: 120, googleMapsUri: "https://maps.google.com/?cid=1" }),
    );

    const hasil = await fetchGoogleRating({ fetchImpl: impl });

    expect(panggilan).toHaveLength(BISNIS_GOOGLE.length);
    for (const p of panggilan) {
      expect(p.url).toMatch(/^https:\/\/places\.googleapis\.com\/v1\/places\/[A-Za-z0-9_-]+$/);
      expect(p.kunci).toBe("kunci-uji");
      expect(p.mask).toBe("rating,userRatingCount,googleMapsUri");
    }
    expect(hasil.kunciBelumDiisi).toBe(false);
    expect(hasil.gagal).toEqual([]);
    expect(hasil.bisnis[0]).toMatchObject({ rating: 4.8, totalReview: 120, urlMaps: "https://maps.google.com/?cid=1" });
    expect(hasil.bisnis.find((b) => b.nama === "Kopi Sabrina")?.grup).toBe("Alabica Group");
    expect(hasil.bisnis.find((b) => b.nama === "CHTTN")?.grup).toBe("Chatatan Group");
  });

  it("marks a business as failed without dropping the others", async () => {
    const gagalId = BISNIS_GOOGLE[1].placeId;
    const { impl } = fetchPalsu((id) =>
      id === gagalId ? new Response("x", { status: 403 }) : Response.json({ rating: 5, userRatingCount: 3 }),
    );

    const hasil = await fetchGoogleRating({ fetchImpl: impl });

    expect(hasil.gagal).toEqual([BISNIS_GOOGLE[1].nama]);
    expect(hasil.bisnis).toHaveLength(BISNIS_GOOGLE.length - 1);
  });

  it("treats a place with no reviews yet as 0 reviews, not a failure", async () => {
    const { impl } = fetchPalsu(() => Response.json({}));

    const hasil = await fetchGoogleRating({ fetchImpl: impl });

    expect(hasil.gagal).toEqual([]);
    expect(hasil.bisnis[0]).toMatchObject({ rating: null, totalReview: 0 });
  });

  it("does not call Google at all when the API key is missing", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const { impl, panggilan } = fetchPalsu(() => Response.json({}));

    const hasil = await fetchGoogleRating({ fetchImpl: impl });

    expect(panggilan).toHaveLength(0);
    expect(hasil).toEqual({ bisnis: [], gagal: [], kunciBelumDiisi: true });
  });
});
