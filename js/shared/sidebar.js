(() => {
  function initializeSidebar() {
    const shell = document.getElementById("site-shell");
    const sidebar = document.getElementById("sidebar");
    const page = document.getElementById("page");
    const toggleButton = document.getElementById("menu-toggle");
    const closeButton = document.getElementById("sidebar-close");
    const backdrop = document.getElementById("sidebar-backdrop");
    const mobileViewport = window.matchMedia("(max-width: 760px)");

    let sidebarOpen = true;
    let desktopSidebarOpen = true;

    function setSidebarOpen(open, moveFocus = false) {
      const mobile = mobileViewport.matches;
      const label = open ? "Hide menu" : "Show menu";

      sidebarOpen = open;
      shell.dataset.sidebarOpen = String(open);
      sidebar.hidden = !open;
      backdrop.hidden = !mobile || !open;
      page.inert = mobile && open;
      document.body.classList.toggle("menu-open", mobile && open);
      toggleButton.setAttribute("aria-expanded", String(open));
      toggleButton.setAttribute("aria-label", label);
      toggleButton.title = label;
      closeButton.setAttribute("aria-label", mobile ? "Close menu" : "Hide menu");

      if (mobile && open) {
        sidebar.setAttribute("role", "dialog");
        sidebar.setAttribute("aria-modal", "true");
      } else {
        sidebar.removeAttribute("role");
        sidebar.removeAttribute("aria-modal");
      }

      if (moveFocus) {
        if (!open) {
          toggleButton.focus();
        } else if (mobile) {
          closeButton.focus();
        }
      }
    }

    function closeSidebar() {
      if (!mobileViewport.matches) {
        desktopSidebarOpen = false;
      }

      setSidebarOpen(false, true);
    }

    toggleButton.addEventListener("click", () => {
      const nextOpen = !sidebarOpen;

      if (!mobileViewport.matches) {
        desktopSidebarOpen = nextOpen;
      }

      setSidebarOpen(nextOpen, true);
    });

    closeButton.addEventListener("click", closeSidebar);
    backdrop.addEventListener("click", closeSidebar);

    sidebar.addEventListener("click", (event) => {
      if (mobileViewport.matches && sidebarOpen && event.target.closest("a[href]")) {
        closeSidebar();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!sidebarOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
        return;
      }

      if (event.key !== "Tab" || !mobileViewport.matches) {
        return;
      }

      const focusableElements = sidebar.querySelectorAll("a[href], button:not(:disabled)");
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    });

    mobileViewport.addEventListener("change", (event) => {
      const nextOpen = event.matches ? false : desktopSidebarOpen;
      const restoreFocus = !nextOpen && sidebar.contains(document.activeElement);
      setSidebarOpen(nextOpen, restoreFocus);
    });

    setSidebarOpen(!mobileViewport.matches);
    toggleButton.hidden = false;
    closeButton.hidden = false;
  }

  window.SiteShell = Object.freeze({ initializeSidebar });
})();
