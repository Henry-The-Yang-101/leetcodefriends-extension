async function waitForElement(selector) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);
  });
}

function getDirectChild(element, selector) {
  return Array.from(element.children).find(child => child.matches(selector));
}

function addFriendsButton() {
  window.onload = async () => {
    console.log("HELLO");
    let div = document.createElement("a");
    div.className = "group relative flex h-8 items-center justify-center rounded p-1 hover:bg-fill-3 dark:hover:bg-dark-fill-3 cursor-pointer";
    div.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="22" height="22" class="text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5s-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 2.01 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    `;
    div.title = "Friends";

    const popup = document.createElement("div");
    // Set popup styling with opacity transition for smooth fade in/out (position will be set dynamically)
    popup.className = "absolute bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded shadow-lg p-2 pt-3 text-sm z-50 transition-opacity duration-200";
    popup.style.opacity = "0";

    // Create an arrow element to point to the icon
    const arrow = document.createElement("div");
    arrow.className = "absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rotate-45";
    popup.appendChild(arrow);

    // Create a text container for the popup content
    const popupText = document.createElement("div");
    popupText.textContent = "Friends Panel Coming Soon!";
    popup.appendChild(popupText);

    document.body.appendChild(popup);

    // Use opacity transition on hover instead of display toggling
    div.addEventListener("mouseenter", () => {
        const rect = div.getBoundingClientRect();
        popup.style.top = rect.bottom + window.scrollY + 'px';
        popup.style.left = rect.left + window.scrollX + rect.width / 2 + 'px';
        popup.style.transform = 'translateX(-50%)';
        popup.style.opacity = "1";
    });
    div.addEventListener("mouseleave", () => {
        popup.style.opacity = "0";
    });

    // Wait for the navbar container that holds the top bar elements
    let navbar = await waitForElement("nav#leetcode-navbar");
    // Find the main container holding the items (assumed to have these classes)
    let container = navbar.querySelector(".relative.flex.items-center.space-x-2");
    if (!container) {
      console.warn("Navbar container not found!");
      return;
    }
    // Find the profile button by its ID and then its closest container
    let profileButton = container.querySelector("#headlessui-menu-button-5");
    if (profileButton) {
      let profileContainer = profileButton.closest("div[style*='position: relative']");
      if (profileContainer) {
        // Insert the new element before the profile container
        container.insertBefore(div, profileContainer);
      } else {
        console.warn("Profile container not found!");
      }
    } else {
      console.warn("Profile button not found!");
    }
  };
}

addFriendsButton(); // Call the function manually