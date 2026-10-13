(() => {
  const sections = Array.from(document.querySelectorAll("[data-resume-section]"));
  const links = document.querySelectorAll("[data-resume-view]");
  const breadcrumb = document.querySelector("[data-resume-breadcrumb]");

  function showSection(section, moveFocus = false) {
    sections.forEach((item) => {
      item.hidden = item !== section;
    });
    links.forEach((link) => {
      const active = link.dataset.resumeView === section.id;
      link.classList.toggle("nav-sub-item-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    breadcrumb.textContent = `resume / ${section.dataset.resumeTitle.toLowerCase()}`;
    document.title = `${section.dataset.resumeTitle} | Resume | reiva5`;
    if (moveFocus) {
      section.querySelector("h2").focus();
    }
  }

  function followHash(moveFocus) {
    const id = window.location.hash.slice(1) || "cards";
    const section = sections.find((item) => item.id === id);
    if (section) {
      showSection(section, moveFocus);
    }
  }

  showSection(sections[0]);
  followHash(false);
  window.addEventListener("hashchange", () => followHash(true));
})();
