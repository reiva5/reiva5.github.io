(() => {
  const { SnapshotCard } = window.ResumeCards;

  class LinkedInCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "LinkedIn",
        username: "reiva5",
        profileUrl: "https://linkedin.com/in/reiva5",
      }, "./data/resume/linkedin.json");
    }
  }

  window.ResumeCards.LinkedInCard = LinkedInCard;
})();
