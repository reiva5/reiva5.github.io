(() => {
  const { ProfileDataError } = window.ResumeCards;

  async function readJSON(source, signal) {
    const response = await fetch(source, {
      signal,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) {
      throw new ProfileDataError(`Unable to load metadata (HTTP ${response.status}).`);
    }
    return response.json();
  }

  function normalizeSnapshot(data) {
    if (
      !data || typeof data !== "object" || Array.isArray(data) ||
      (data.fullName !== null && typeof data.fullName !== "string") ||
      !Array.isArray(data.metadata) ||
      typeof data.authenticationRequired !== "boolean" ||
      (data.updatedAt !== null && (
        typeof data.updatedAt !== "string" || !Number.isFinite(Date.parse(data.updatedAt))
      ))
    ) {
      throw new ProfileDataError("Invalid snapshot format.");
    }

    const metadata = data.metadata.map((entry) => {
      if (
        !entry || typeof entry.label !== "string" || !entry.label.trim() ||
        !["string", "number", "boolean"].includes(typeof entry.value) ||
        (typeof entry.value === "number" && !Number.isFinite(entry.value)) ||
        (typeof entry.value === "string" && !entry.value.trim())
      ) {
        throw new ProfileDataError("Invalid metadata format.");
      }
      return { label: entry.label.trim(), value: String(entry.value) };
    });

    return {
      fullName: data.fullName === null ? null : data.fullName.trim() || null,
      metadata,
      updatedAt: data.updatedAt,
      authenticationRequired: data.authenticationRequired,
    };
  }

  Object.assign(window.ResumeCards, { readJSON, normalizeSnapshot });
})();
