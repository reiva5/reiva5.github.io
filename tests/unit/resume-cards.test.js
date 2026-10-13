import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const html = readFileSync(new URL("../../resume.html", import.meta.url), "utf8");
const codeforcesURL = "https://codeforces.com/api/user.info?handles=reiva5";
const snapshot = (overrides = {}) => ({
  fullName: null,
  metadata: [],
  updatedAt: null,
  authenticationRequired: false,
  ...overrides,
});
const codeforces = (user = {}) => ({
  status: "OK",
  result: [{
    handle: "Reiva5",
    firstName: "Nama",
    lastName: "Pengguna",
    rating: 1435,
    rank: "specialist",
    maxRating: 2052,
    maxRank: "candidate master",
    contribution: 0,
    organization: "Organisasi",
    ...user,
  }],
});
const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
let dom;
let data;
let fetchMock;
let defaultFetch;

async function start(settle = true) {
  await import("../../resume-cards.js");
  if (settle) {
    await Promise.all(window.ResumeCards.cards.map((card) => card.pending));
  }
  return window.ResumeCards;
}

function cardFor(platform) {
  return window.ResumeCards.cards.find((card) => card.platform === platform);
}

beforeEach(() => {
  vi.resetModules();
  dom = new JSDOM(html, { url: "https://reiva5.github.io/resume.html" });
  data = new Map([
    [codeforcesURL, codeforces()],
    ...["linkedin", "leetcode", "kaggle", "ktom"].map((platform) => [
      `./data/resume/${platform}.json`,
      JSON.parse(readFileSync(new URL(`../../data/resume/${platform}.json`, import.meta.url), "utf8")),
    ]),
  ]);
  defaultFetch = (source) => Promise.resolve(response(data.get(source)));
  fetchMock = vi.fn(defaultFetch);
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  dom.window.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("OOP card registry", () => {
  it("constructs distinct platform subclasses with stable identities and profile links", async () => {
    const api = await start();
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.cards)).toBe(true);
    const expected = [
      [api.LinkedInCard, "LinkedIn", "reiva5", "https://linkedin.com/in/reiva5"],
      [api.CodeforcesCard, "Codeforces", "reiva5", "https://codeforces.com/profile/reiva5"],
      [api.LeetCodeCard, "LeetCode", "reiva5", "https://leetcode.com/u/reiva5"],
      [api.KaggleCard, "Kaggle", "reiva5", "https://kaggle.com/reiva5"],
      [api.KtomCard, "KTOM", "0reiva5", "https://ktom-tomi.or.id/users/1601-0reiva5"],
    ];
    api.cards.forEach((card, index) => {
      const [Type, platform, username, profileUrl] = expected[index];
      expect(card).toBeInstanceOf(Type);
      expect(card).toBeInstanceOf(api.ProfileCard);
      if (platform !== "Codeforces") {
        expect(card).toBeInstanceOf(api.SnapshotCard);
      }
      expect(card.platform).toBe(platform);
      expect(card.username).toBe(username);
      expect(card.profileUrl).toBe(profileUrl);
      expect(card.element.querySelector("[data-card-link]").href).toBe(profileUrl);
      expect(card.retry.getAttribute("aria-label")).toBe(`Muat ulang metadata ${platform}`);
      expect(card.retry.hidden).toBe(false);
      expect(card.retry.disabled).toBe(false);
      expect(card.element.getAttribute("aria-busy")).toBe("false");
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    fetchMock.mock.calls.forEach(([, options]) => {
      expect(options.credentials).toBe("omit");
      expect(options.redirect).toBe("error");
      expect(options.referrerPolicy).toBe("no-referrer");
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });
  });

  it("exposes the base data-source contract without failing other cards", async () => {
    const api = await start();
    const base = new api.ProfileCard(document.getElementById("card-linkedin"), {
      platform: "Custom",
      username: "username",
      profileUrl: "https://example.com/profile",
      sourceLabel: "Custom source",
    });
    await base.load();
    expect(base.element.dataset.state).toBe("error");
    expect(base.status.textContent).toContain("Sumber metadata belum ditentukan.");
    expect(cardFor("Codeforces").element.dataset.state).toBe("ready");
  });

  it("starts all five requests independently and renders available cards while one remains pending", async () => {
    let resolveCodeforces;
    fetchMock.mockImplementation((source) => source === codeforcesURL
      ? new Promise((resolve) => { resolveCodeforces = resolve; })
      : defaultFetch(source));
    await start(false);
    await Promise.all(window.ResumeCards.cards.filter((card) => card.platform !== "Codeforces").map((card) => card.pending));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(cardFor("Codeforces").element.dataset.state).toBe("loading");
    expect(cardFor("Codeforces").name.textContent).toBe("reiva5");
    expect(cardFor("Codeforces").retry.disabled).toBe(true);
    expect(cardFor("LinkedIn").element.dataset.state).toBe("empty");
    expect(cardFor("LeetCode").element.dataset.state).toBe("empty");
    expect(cardFor("Kaggle").element.dataset.state).toBe("empty");
    expect(cardFor("KTOM").element.dataset.state).toBe("authentication-required");
    resolveCodeforces(response(codeforces()));
    await cardFor("Codeforces").pending;
    expect(cardFor("Codeforces").element.dataset.state).toBe("ready");
  });

  it("deduplicates in-flight loads instead of racing or blocking other cards", async () => {
    let resolveRequest;
    fetchMock.mockImplementation((source) => source === codeforcesURL
      ? new Promise((resolve) => { resolveRequest = resolve; })
      : defaultFetch(source));
    await start(false);
    const card = cardFor("Codeforces");
    const pending = card.pending;
    expect(card.load()).toBe(pending);
    expect(card.load()).toBe(pending);
    expect(fetchMock.mock.calls.filter(([source]) => source === codeforcesURL)).toHaveLength(1);
    resolveRequest(response(codeforces()));
    await pending;
    expect(card.pending).toBeNull();
  });
});

describe("public snapshots", () => {
  it("shows username fallback and an explicit empty state rather than invented statistics", async () => {
    await start();
    for (const platform of ["LinkedIn", "LeetCode", "Kaggle"]) {
      const card = cardFor(platform);
      expect(card.name.textContent).toBe("reiva5");
      expect(card.handle.hidden).toBe(true);
      expect(card.metadata.children).toHaveLength(0);
      expect(card.element.dataset.state).toBe("empty");
      expect(card.status.textContent).toContain("Metadata belum ditambahkan.");
      expect(card.updated.hidden).toBe(true);
    }
  });

  it("renders custom scalar metadata and full name as text, without trusting injected URLs or fields", async () => {
    const fullName = '<img src=x onerror="alert(1)">';
    data.set("./data/resume/linkedin.json", snapshot({
      fullName,
      metadata: [
        { label: "  Headline  ", value: "<script>unsafe()</script>" },
        { label: "Jumlah", value: 0 },
        { label: "Aktif", value: false },
      ],
      updatedAt: "2026-10-13T15:00:00.000Z",
      profileUrl: "javascript:alert(1)",
      password: "must-not-be-rendered",
    }));
    await start();
    const card = cardFor("LinkedIn");
    expect(card.name.textContent).toBe(fullName);
    expect(card.handle.hidden).toBe(false);
    expect(card.handle.textContent).toBe("@reiva5");
    expect(Array.from(card.metadata.querySelectorAll("dt"), (term) => term.textContent)).toEqual([
      "Headline", "Jumlah", "Aktif",
    ]);
    expect(Array.from(card.metadata.querySelectorAll("dd"), (entry) => entry.textContent)).toEqual([
      "<script>unsafe()</script>", "0", "false",
    ]);
    expect(card.element.querySelectorAll("img, script")).toHaveLength(0);
    expect(card.element.textContent).not.toContain("must-not-be-rendered");
    expect(card.element.querySelector("[data-card-link]").href).toBe("https://linkedin.com/in/reiva5");
    expect(card.updated.hidden).toBe(false);
    expect(card.updated.dateTime).toBe("2026-10-13T15:00:00.000Z");
    expect(card.updated.textContent).toContain("Diperbarui");
    expect(card.element.dataset.state).toBe("ready");
    expect(card.status.textContent).toBe("Snapshot publik berhasil dimuat.");
  });

  it("treats a full name without statistics as available data", async () => {
    data.set("./data/resume/kaggle.json", snapshot({ fullName: "  Nama Publik  " }));
    await start();
    const card = cardFor("Kaggle");
    expect(card.name.textContent).toBe("Nama Publik");
    expect(card.element.dataset.state).toBe("ready");
  });

  it("normalizes a blank name to the username fallback", async () => {
    data.set("./data/resume/kaggle.json", snapshot({ fullName: "   " }));
    await start();
    expect(cardFor("Kaggle").name.textContent).toBe("reiva5");
    expect(cardFor("Kaggle").element.dataset.state).toBe("empty");
  });

  it("keeps KTOM authentication-required while displaying only its public user ID", async () => {
    await start();
    const card = cardFor("KTOM");
    expect(card.element.dataset.state).toBe("authentication-required");
    expect(card.status.textContent).toContain("Perlu autentikasi");
    expect(card.metadata.textContent).toBe("ID pengguna1601");
    expect(fetchMock.mock.calls.filter(([source]) => source.includes("ktom-tomi.or.id"))).toHaveLength(0);
    data.set("./data/resume/ktom.json", snapshot({
      fullName: "Nama KTOM",
      metadata: [{ label: "Skor", value: 42 }],
    }));
    card.retry.click();
    await card.pending;
    expect(card.element.dataset.state).toBe("ready");
    expect(card.name.textContent).toBe("Nama KTOM");
    expect(card.metadata.textContent).toBe("Skor42");
  });

  const invalidSnapshots = [
    ["null", null],
    ["primitive", "wrong"],
    ["array", []],
    ["missing fields", {}],
    ["invalid full name", snapshot({ fullName: 42 })],
    ["missing full name", { metadata: [], updatedAt: null, authenticationRequired: false }],
    ["invalid metadata list", snapshot({ metadata: {} })],
    ["invalid authentication state", snapshot({ authenticationRequired: "true" })],
    ["invalid timestamp type", snapshot({ updatedAt: 42 })],
    ["invalid timestamp value", snapshot({ updatedAt: "not-a-date" })],
    ["missing timestamp", { fullName: null, metadata: [], authenticationRequired: false }],
    ["null metadata", snapshot({ metadata: [null] })],
    ["missing label", snapshot({ metadata: [{ value: "text" }] })],
    ["non-string label", snapshot({ metadata: [{ label: 1, value: "text" }] })],
    ["empty label", snapshot({ metadata: [{ label: "   ", value: "text" }] })],
    ["object value", snapshot({ metadata: [{ label: "Label", value: {} }] })],
    ["array value", snapshot({ metadata: [{ label: "Label", value: [] }] })],
    ["null value", snapshot({ metadata: [{ label: "Label", value: null }] })],
    ["infinite value", snapshot({ metadata: [{ label: "Label", value: Infinity }] })],
    ["NaN value", snapshot({ metadata: [{ label: "Label", value: NaN }] })],
    ["empty value", snapshot({ metadata: [{ label: "Label", value: " " }] })],
  ];
  it.each(invalidSnapshots)("reports %s as invalid without affecting other cards", async (_name, value) => {
    data.set("./data/resume/linkedin.json", value);
    await start();
    expect(cardFor("LinkedIn").element.dataset.state).toBe("error");
    expect(cardFor("LinkedIn").status.textContent).toContain("tidak valid");
    expect(cardFor("LinkedIn").metadata.children).toHaveLength(0);
    expect(cardFor("Codeforces").element.dataset.state).toBe("ready");
    expect(cardFor("KTOM").element.dataset.state).toBe("authentication-required");
  });
});

describe("Codeforces adapter", () => {
  it("uses the official API and maps available public statistics including zero values", async () => {
    await start();
    const card = cardFor("Codeforces");
    expect(fetchMock).toHaveBeenCalledWith(codeforcesURL, expect.objectContaining({ credentials: "omit" }));
    expect(card.name.textContent).toBe("Nama Pengguna");
    expect(card.handle.hidden).toBe(false);
    expect(Array.from(card.metadata.querySelectorAll("dt"), (term) => term.textContent)).toEqual([
      "Rating", "Rank", "Rating tertinggi", "Rank tertinggi", "Kontribusi", "Organisasi",
    ]);
    expect(Array.from(card.metadata.querySelectorAll("dd"), (entry) => entry.textContent)).toEqual([
      "1435", "specialist", "2052", "candidate master", "0", "Organisasi",
    ]);
    expect(card.status.textContent).toBe("API publik berhasil dimuat.");
    expect(Number.isFinite(Date.parse(card.updated.dateTime))).toBe(true);
  });

  it("omits absent optional fields and never fabricates a rating for an unrated user", async () => {
    data.set(codeforcesURL, {
      status: "OK",
      result: [{ handle: "reiva5", firstName: 1, lastName: " ", organization: null }],
    });
    await start();
    const card = cardFor("Codeforces");
    expect(card.name.textContent).toBe("reiva5");
    expect(card.handle.hidden).toBe(true);
    expect(card.metadata.children).toHaveLength(0);
    expect(card.element.dataset.state).toBe("empty");
  });

  it("accepts a single available name part and trims its whitespace", async () => {
    data.set(codeforcesURL, codeforces({ firstName: "  Nama  ", lastName: undefined }));
    await start();
    expect(cardFor("Codeforces").name.textContent).toBe("Nama");
  });

  it.each([
    ["null response", null],
    ["API failure", { status: "FAILED", comment: "private diagnostic" }],
    ["invalid results", { status: "OK", result: {} }],
    ["missing user", { status: "OK", result: [] }],
    ["extra user", { status: "OK", result: [{ handle: "reiva5" }, { handle: "other" }] }],
    ["null user", { status: "OK", result: [null] }],
    ["invalid handle", { status: "OK", result: [{ handle: 1 }] }],
    ["different handle", { status: "OK", result: [{ handle: "other" }] }],
    ["invalid statistic", codeforces({ rating: {} })],
  ])("isolates %s and does not expose upstream diagnostics", async (_name, value) => {
    data.set(codeforcesURL, value);
    await start();
    const card = cardFor("Codeforces");
    expect(card.element.dataset.state).toBe("error");
    expect(card.status.textContent).not.toContain("private diagnostic");
    expect(cardFor("LinkedIn").element.dataset.state).toBe("empty");
  });
});

describe("failure isolation, timeout, and retry", () => {
  it("reports HTTP failures and retries only the affected card", async () => {
    fetchMock.mockImplementation((source) => source === codeforcesURL
      ? Promise.resolve(response(null, 429))
      : defaultFetch(source));
    await start();
    const card = cardFor("Codeforces");
    expect(card.element.dataset.state).toBe("error");
    expect(card.status.textContent).toContain("HTTP 429");
    expect(card.retry.textContent).toBe("Coba lagi");
    expect(card.retry.getAttribute("aria-label")).toBe("Coba lagi metadata Codeforces");
    expect(card.retry.disabled).toBe(false);
    fetchMock.mockImplementation(defaultFetch);
    card.retry.click();
    await card.pending;
    expect(card.element.dataset.state).toBe("ready");
    expect(card.retry.textContent).toBe("Muat ulang");
    expect(card.retry.getAttribute("aria-label")).toBe("Muat ulang metadata Codeforces");
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls.filter(([source]) => source === codeforcesURL)).toHaveLength(2);
  });

  it("reports a missing snapshot without blocking public API cards", async () => {
    fetchMock.mockImplementation((source) => source === "./data/resume/linkedin.json"
      ? Promise.resolve(response(null, 404))
      : defaultFetch(source));
    await start();
    expect(cardFor("LinkedIn").status.textContent).toContain("HTTP 404");
    expect(cardFor("Codeforces").element.dataset.state).toBe("ready");
  });

  it.each([
    ["network error", new Error("private-network-details"), "Periksa koneksi"],
    ["JSON parse error", new SyntaxError("private-parser-details"), "Format JSON tidak valid"],
    ["unknown rejection", "private-string-details", "Periksa koneksi"],
  ])("reports %s explicitly without showing raw error text", async (_name, error, message) => {
    fetchMock.mockImplementation((source) => source === "./data/resume/kaggle.json"
      ? Promise.resolve({ ...response(null), json: () => Promise.reject(error) })
      : defaultFetch(source));
    await start();
    const card = cardFor("Kaggle");
    expect(card.element.dataset.state).toBe("error");
    expect(card.status.textContent).toContain(message);
    expect(card.status.textContent).not.toContain("private");
    expect(cardFor("Codeforces").element.dataset.state).toBe("ready");
  });

  it("aborts a slow card after exactly eight seconds while others finish independently", async () => {
    vi.useFakeTimers();
    let signal;
    fetchMock.mockImplementation((source, options) => {
      if (source !== codeforcesURL) {
        return defaultFetch(source);
      }
      signal = options.signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    await start(false);
    const card = cardFor("Codeforces");
    await Promise.all(window.ResumeCards.cards.filter((item) => item !== card).map((item) => item.pending));
    expect(cardFor("KTOM").element.dataset.state).toBe("authentication-required");
    await vi.advanceTimersByTimeAsync(7_999);
    expect(card.element.dataset.state).toBe("loading");
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await card.pending;
    expect(signal.aborted).toBe(true);
    expect(card.element.dataset.state).toBe("error");
    expect(card.status.textContent).toContain("Batas waktu 8 detik");
    expect(card.element.getAttribute("aria-busy")).toBe("false");
    expect(card.retry.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    fetchMock.mockImplementation(defaultFetch);
    await card.load();
    expect(card.element.dataset.state).toBe("ready");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains last successful data on failure and replaces, rather than appends, metadata on recovery", async () => {
    data.set("./data/resume/linkedin.json", snapshot({
      fullName: "Nama Sebelumnya",
      metadata: [{ label: "Headline", value: "Nilai sebelumnya" }],
      updatedAt: "2026-10-13T15:00:00.000Z",
    }));
    await start();
    const card = cardFor("LinkedIn");
    data.set("./data/resume/linkedin.json", snapshot({ metadata: [{ label: "Bad", value: {} }] }));
    await card.load();
    expect(card.element.dataset.state).toBe("error");
    expect(card.status.textContent).toContain("Data terakhir tetap ditampilkan.");
    expect(card.name.textContent).toBe("Nama Sebelumnya");
    expect(card.metadata.textContent).toBe("HeadlineNilai sebelumnya");
    expect(card.updated.dateTime).toBe("2026-10-13T15:00:00.000Z");
    data.set("./data/resume/linkedin.json", snapshot({ metadata: [{ label: "Baru", value: 7 }] }));
    await card.load();
    expect(card.element.dataset.state).toBe("ready");
    expect(card.name.textContent).toBe("reiva5");
    expect(card.handle.hidden).toBe(true);
    expect(card.metadata.children).toHaveLength(1);
    expect(card.metadata.textContent).toBe("Baru7");
    expect(card.updated.hidden).toBe(true);
    expect(card.updated.hasAttribute("datetime")).toBe(false);
    expect(card.updated.textContent).toBe("");
  });
});
