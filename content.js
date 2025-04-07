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

function addFriendsButton() {
  window.addEventListener("pageshow", async () => {
    const currentUrl = window.location.href;
    let friendsButton = document.createElement("a");
    friendsButton.className = "group relative flex h-8 items-center justify-center rounded p-1 hover:bg-fill-3 dark:hover:bg-dark-fill-3 cursor-pointer";
    friendsButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="22" height="22" class="text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5s-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 2.01 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    `;

    const popup = document.createElement("div");
    // Set popup styling with opacity transition for smooth fade in/out (position will be set dynamically)
    popup.className = "absolute bg-white dark:bg-gray-800 text-black dark:text-white rounded shadow-2xl p-2 pt-3 text-sm z-50 transition-opacity duration-200";
    popup.style.opacity = "0";
    popup.style.pointerEvents = "none";
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      popup.style.border = "1px solid #374151";
    } else {
      popup.style.border = "1px solid #D1D5DB";
    }
    popup.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.4)";
    popup.title = "Friends";

    // Create a text container for the popup content
    const popupText = document.createElement("div");
    popupText.textContent = "meow meow meow meow";
    popup.appendChild(popupText);

    document.body.appendChild(popup);

    const baseHeight = popup.offsetHeight * 12;

    // Toggle the popup's visibility on click
    friendsButton.addEventListener("click", () => {
      if (popup.style.opacity === "1") {
        popup.style.opacity = "0";
        popup.style.pointerEvents = "none";
      } else {
        const rect = friendsButton.getBoundingClientRect();
        popup.style.top = (rect.bottom + window.scrollY + 12) + 'px';
        popup.style.right = '3px';
        popup.style.height = baseHeight + 'px';
        const friendCenter = rect.left + rect.width / 2;
        const newWidth = (window.innerWidth - friendCenter - 3) * 2;
        popup.style.width = newWidth + 'px';
        popup.style.opacity = "1";
        popup.style.pointerEvents = "auto";
      }
    });

    let container;

    if (currentUrl.startsWith("https://leetcode.com/problems/")) {
      container = await waitForElement("nav.z-nav-1 .relative.ml-4.flex.items-center.gap-2");
    } else {
      container = await waitForElement("nav#leetcode-navbar .relative.flex.items-center.space-x-2");
    }

    if (!container) {
      console.warn("Navbar container not found!");
      return; 
    }

    if (currentUrl.startsWith("https://leetcode.com/problems/")) {
      container.insertBefore(friendsButton, container.children[3]);
    } else {
      container.insertBefore(friendsButton, container.children[2]);
    }
  });
}

addFriendsButton(); // Call the function manually
