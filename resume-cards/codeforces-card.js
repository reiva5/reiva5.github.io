(() => {
  const { ProfileCard, ProfileDataError, readJSON, normalizeSnapshot } = window.ResumeCards;

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

  window.ResumeCards.CodeforcesCard = CodeforcesCard;
})();
