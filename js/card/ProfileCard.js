(() => {
  const { ProfileDataError } = window.ResumeCards;
  const TIMEOUT_MS = 8_000;

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

  window.ResumeCards.ProfileCard = ProfileCard;
})();
