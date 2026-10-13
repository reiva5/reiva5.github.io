(() => {
  const { SnapshotCard } = window.ResumeCards;

  class LeetCodeCard extends SnapshotCard {
    constructor(element) {
      super(element, {
        platform: "LeetCode",
        username: "reiva5",
        profileUrl: "https://leetcode.com/u/reiva5",
      }, "./data/resume/leetcode.json");
    }
  }

  window.ResumeCards.LeetCodeCard = LeetCodeCard;
})();
