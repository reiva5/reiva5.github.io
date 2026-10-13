(() => {
  const {
    ProfileCard, SnapshotCard, LinkedInCard, CodeforcesCard, LeetCodeCard, KaggleCard, KtomCard,
  } = window.ResumeCards;

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
