(() => {
  const TIMEOUT_MS = 8_000;

  class ProfileDataError extends Error {}

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

  class ProfileCard {
    constructor(element, { platform, username, profileUrl, sourceLabel }) {
      this.element = element;
      this.platform = platform;
      this.username = username;
      this.profileUrl = profileUrl;
      this.sourceLabel = sourceLabel;
      this.pending = null;
      this.details = null;
      this.name = element.querySelector("[data-card-name]");
      this.handle = element.querySelector("[data-card-handle]");
      this.metadata = element.querySelector("[data-card-metadata]");
      this.status = element.querySelector("[data-card-status]");
      this.updated = element.querySelector("[data-card-updated]");
      this.retry = element.querySelector("[data-card-retry]");
      const link = element.querySelector("[data-card-link]");

      element.querySelector("[data-card-platform]").textContent = platform;
      element.querySelector("[data-card-source]").textContent = sourceLabel;
      this.name.textContent = username;
      this.handle.textContent = `@${username}`;
      link.href = profileUrl;
      link.setAttribute("aria-label", `View profile on ${platform} (opens in a new tab)`);
      this.retry.hidden = false;
      this.retry.addEventListener("click", () => this.load());
    }

    fetchDetails() {
      throw new ProfileDataError("No metadata source has been configured.");
    }

    setStatus(state, message) {
      this.element.dataset.state = state;
      this.status.textContent = message;
      const label = state === "error" ? "Retry" : "Reload";
      this.retry.textContent = label;
      this.retry.setAttribute("aria-label", `${label} ${this.platform} metadata`);
    }

    load() {
      if (this.pending) {
        return this.pending;
      }
      this.setStatus("loading", "Loading metadata...");
      this.element.setAttribute("aria-busy", "true");
      this.retry.disabled = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      this.pending = this.refresh(controller).finally(() => {
        clearTimeout(timer);
        this.element.setAttribute("aria-busy", "false");
        this.retry.disabled = false;
        this.pending = null;
      });
      return this.pending;
    }

    async refresh(controller) {
      try {
        const details = await this.fetchDetails(controller.signal);
        this.renderDetails(details);
        this.details = details;
        if (details.authenticationRequired) {
          this.setStatus("authentication-required", "Authentication required. Awaiting an approved public snapshot.");
        } else if (!details.fullName && details.metadata.length === 0) {
          this.setStatus("empty", "No metadata added yet. The profile link is still available.");
        } else {
          this.setStatus("ready", `${this.sourceLabel} loaded successfully.`);
        }
      } catch (error) {
        let message = "Unable to load details. Check your connection and try again.";
        if (controller.signal.aborted) {
          message = "Loading timed out after 8 seconds. Try again.";
        } else if (error instanceof ProfileDataError) {
          message = error.message;
        } else if (error instanceof SyntaxError) {
          message = "Invalid JSON format.";
        }
        const retained = this.details
          ? "The last successful data is still displayed."
          : "You can still open the profile link.";
        this.setStatus("error", `${message} ${retained}`);
      }
    }

    renderDetails(details) {
      this.name.textContent = details.fullName || this.username;
      this.handle.hidden = !details.fullName;
      const fragment = document.createDocumentFragment();
      details.metadata.forEach(({ label, value }) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        fragment.append(row);
      });
      this.metadata.replaceChildren(fragment);
      this.updated.hidden = details.updatedAt === null;
      if (details.updatedAt) {
        this.updated.dateTime = details.updatedAt;
        this.updated.textContent = `Updated ${new Date(details.updatedAt).toLocaleString("en")}`;
      } else {
        this.updated.removeAttribute("datetime");
        this.updated.textContent = "";
      }
    }
  }

  class SnapshotCard extends ProfileCard {
    constructor(element, options, source) {
      super(element, { ...options, sourceLabel: "Public snapshot" });
      this.source = source;
    }

    async fetchDetails(signal) {
      return normalizeSnapshot(await readJSON(this.source, signal));
    }
  }

  class LinkedInCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "LinkedIn",
        username: "reiva5",
        profileUrl: "https://linkedin.com/in/reiva5",
      }, "./data/resume/linkedin.json");
    }
  }

  class CodeforcesCard extends ProfileCard {
    constructor(element) {
      super(element, {
        platform: "Codeforces",
        username: "reiva5",
        profileUrl: "https://codeforces.com/profile/reiva5",
        sourceLabel: "Public API",
      });
    }

    async fetchDetails(signal) {
      const data = await readJSON(
        `https://codeforces.com/api/user.info?handles=${encodeURIComponent(this.username)}`,
        signal,
      );
      if (!data || data.status !== "OK" || !Array.isArray(data.result) || data.result.length !== 1) {
        throw new ProfileDataError("Invalid Codeforces API response.");
      }
      const user = data.result[0];
      if (!user || typeof user.handle !== "string" || user.handle.toLowerCase() !== this.username.toLowerCase()) {
        throw new ProfileDataError("Codeforces profile identity does not match.");
      }
      const fullName = [user.firstName, user.lastName]
        .filter((part) => typeof part === "string" && part.trim())
        .map((part) => part.trim())
        .join(" ") || null;
      const fields = [
        ["Highest Rank", user.maxRank],
        ["Highest Rating", user.maxRating],
      ];
      return normalizeSnapshot({
        fullName,
        metadata: fields
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([label, value]) => ({ label, value })),
        updatedAt: new Date().toISOString(),
        authenticationRequired: false,
      });
    }
  }

  class LeetCodeCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "LeetCode",
        username: "reiva5",
        profileUrl: "https://leetcode.com/u/reiva5",
      }, "./data/resume/leetcode.json");
    }
  }

  class KaggleCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "Kaggle",
        username: "reiva5",
        profileUrl: "https://kaggle.com/reiva5",
      }, "./data/resume/kaggle.json");
    }
  }

  class KtomCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "KTOM",
        username: "0reiva5",
        profileUrl: "https://ktom-tomi.or.id/users/1601-0reiva5",
      }, "./data/resume/ktom.json");
    }
  }

  const cards = Object.freeze([
    new LinkedInCard(document.getElementById("card-linkedin")),
    new CodeforcesCard(document.getElementById("card-codeforces")),
    new LeetCodeCard(document.getElementById("card-leetcode")),
    new KaggleCard(document.getElementById("card-kaggle")),
    new KtomCard(document.getElementById("card-ktom")),
  ]);
  window.ResumeCards = Object.freeze({
    ProfileCard, SnapshotCard, LinkedInCard, CodeforcesCard, LeetCodeCard, KaggleCard, KtomCard, cards,
  });
  cards.forEach((card) => card.load());
})();
