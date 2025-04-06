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