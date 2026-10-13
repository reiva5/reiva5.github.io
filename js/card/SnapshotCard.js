(() => {
  const { ProfileCard, readJSON, normalizeSnapshot } = window.ResumeCards;

  class SnapshotCard extends ProfileCard {
    constructor(element, options, source) {
      super(element, { ...options, sourceLabel: "Public snapshot" });
      this.source = source;
    }

    async fetchDetails(signal) {
      return normalizeSnapshot(await readJSON(this.source, signal));
    }
  }

  window.ResumeCards.SnapshotCard = SnapshotCard;
})();
