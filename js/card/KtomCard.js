(() => {
  const { SnapshotCard } = window.ResumeCards;

  class KtomCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "KTOM",
        username: "0reiva5",
        profileUrl: "https://ktom-tomi.or.id/users/1601-0reiva5",
      }, "./data/resume/ktom.json");
    }
  }

  window.ResumeCards.KtomCard = KtomCard;
})();
