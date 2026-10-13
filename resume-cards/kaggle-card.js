(() => {
  const { SnapshotCard } = window.ResumeCards;

  class KaggleCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "Kaggle",
        username: "reiva5",
        profileUrl: "https://kaggle.com/reiva5",
      }, "./data/resume/kaggle.json");
    }
  }

  window.ResumeCards.KaggleCard = KaggleCard;
})();
