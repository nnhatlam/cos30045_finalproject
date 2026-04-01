async function injectComponent(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load component: ${filePath}`);
    }
    target.innerHTML = await response.text();
  } catch (error) {
    target.innerHTML = '<p>Unable to load section.</p>';
    console.error(error);
  }
}

function setActiveNav(pageName) {
  const activeLink = document.querySelector(`[data-nav="${pageName}"]`);
  if (activeLink) {
    activeLink.classList.add("is-active");
  }
}

function setupMobileMenu() {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");

  if (!menuButton || !nav) {
    return;
  }

  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

function animateCountUp() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) {
    return;
  }

  counters.forEach((counter) => {
    const target = Number(counter.getAttribute("data-count"));
    if (Number.isNaN(target)) {
      return;
    }

    const duration = 1300;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const value = Math.floor(target * progress);
      counter.textContent = value.toLocaleString("en-AU");

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await injectComponent("navbar", "components/navbar.html");
  await injectComponent("footer", "components/footer.html");

  const pageName = document.body.dataset.page;
  if (pageName) {
    setActiveNav(pageName);
  }

  setupMobileMenu();

  if (pageName === "index") {
    animateCountUp();
  }
});
