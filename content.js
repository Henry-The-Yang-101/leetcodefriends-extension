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
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="20" height="20" class="text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary">
        <path d="M17.6 12.1c1.826 0 3.289 -1.474 3.289 -3.3S19.426 5.5 17.6 5.5s-3.3 1.474 -3.3 3.3 1.474 3.3 3.3 3.3zm-8.8 0c1.826 0 3.289 -1.474 3.289 -3.3S10.626 5.5 8.8 5.5 5.5 6.974 5.5 8.8s1.474 3.3 3.3 3.3zm0 2.2c-2.563 0 -7.7 1.287 -7.7 3.85V20.9h15.4v-2.75c0 -2.563 -5.137 -3.85 -7.7 -3.85zm8.8 0c-0.319 0 -0.682 0.022 -1.067 0.055 1.276 0.924 2.167 2.211 2.167 3.795V20.9h6.6v-2.75c0 -2.563 -5.137 -3.85 -7.7 -3.85z"/>
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