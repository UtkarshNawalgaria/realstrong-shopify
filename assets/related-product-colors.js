/**
 * Related Product Color Swatches
 *
 * Handles image switching for related product color swatches
 * Provides smooth transitions and accessibility support
 */

class RelatedProductColors {
  constructor() {
    this.containers = [];
    this.imageCache = new Map();
    this.animationSpeed = 300;
    this.isLoading = false;

    this.init();
  }

  init() {
    // Find all related product color containers
    this.containers = document.querySelectorAll(".related-product-colors");

    if (this.containers.length === 0) return;

    // Initialize each container
    this.containers.forEach((container) => this.initContainer(container));

    // Set up global event listeners
    this.setupGlobalListeners();

    // Initialize carousel functionality
    this.initializeCarousels();
  }

  initContainer(container) {
    const blockId = container.dataset.blockId;
    const swatchesData = this.parseSwatchData(container.dataset.colorSwatches);
    const targetSelector =
      container.dataset.targetImageSelector || ".product-images-carousel";

    if (!blockId || !swatchesData) {
      console.warn("RelatedProductColors: Missing required data attributes", {
        blockId,
        swatchesData: !!swatchesData,
        colorSwatchesAttr: container.dataset.colorSwatches,
      });
      return;
    }

    // Store container data
    container._relatedColors = {
      blockId,
      swatchesData,
      targetSelector,
      currentIndex: this.findCurrentIndex(swatchesData),
      imageElement: this.findImageElement(container, targetSelector),
      originalImage: null,
    };

    // Store original carousel data
    if (container._relatedColors.imageElement) {
      const carouselEl = container._relatedColors.imageElement;
      container._relatedColors.originalCarousel = {
        productId: carouselEl.dataset.productId,
        innerHTML: carouselEl.innerHTML,
      };
    }

    // Setup swatch click handlers
    this.setupSwatchHandlers(container);

    // Setup keyboard navigation
    this.setupKeyboardNavigation(container);

    // Preload images for better performance
    this.preloadImages(swatchesData);
  }

  parseSwatchData(dataString) {
    try {
      return JSON.parse(dataString);
    } catch (error) {
      console.warn("RelatedProductColors: Invalid swatch data", error);
      return null;
    }
  }

  findCurrentIndex(swatchesData) {
    return swatchesData.findIndex((swatch) => swatch.is_current === true);
  }

  findImageElement(container, targetSelector) {
    // Look for carousel within the same product block
    const productBlock = container.closest(".product-block, .cc-product-block");
    if (!productBlock) {
      console.warn(
        "RelatedProductColors: No product block found for container"
      );
      return null;
    }

    const carouselElement = productBlock.querySelector(targetSelector);

    return carouselElement;
  }

  setupSwatchHandlers(container) {
    const swatches = container.querySelectorAll(
      ".related-product-colors__swatch"
    );

    swatches.forEach((swatch, index) => {
      // Click handler
      swatch.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleSwatchClick(container, index);
      });

      // Touch handling for better mobile experience
      let touchStartY = 0;
      swatch.addEventListener("touchstart", (e) => {
        touchStartY = e.touches[0].clientY;
      });

      swatch.addEventListener("touchend", (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const touchDiff = Math.abs(touchEndY - touchStartY);

        // Only trigger if it's a tap, not a scroll
        if (touchDiff < 10) {
          e.preventDefault();
          this.handleSwatchClick(container, index);
        }
      });
    });
  }

  setupKeyboardNavigation(container) {
    const swatches = container.querySelectorAll(
      ".related-product-colors__swatch"
    );

    swatches.forEach((swatch, index) => {
      swatch.addEventListener("keydown", (e) => {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault();
            this.handleSwatchClick(container, index);
            break;

          case "ArrowLeft":
          case "ArrowUp":
            e.preventDefault();
            this.navigateToSwatch(container, index - 1);
            break;

          case "ArrowRight":
          case "ArrowDown":
            e.preventDefault();
            this.navigateToSwatch(container, index + 1);
            break;

          case "Home":
            e.preventDefault();
            this.navigateToSwatch(container, 0);
            break;

          case "End":
            e.preventDefault();
            this.navigateToSwatch(container, swatches.length - 1);
            break;
        }
      });
    });
  }

  navigateToSwatch(container, targetIndex) {
    const swatches = container.querySelectorAll(
      ".related-product-colors__swatch"
    );
    const maxIndex = swatches.length - 1;

    // Wrap around navigation
    let newIndex = targetIndex;
    if (newIndex < 0) newIndex = maxIndex;
    if (newIndex > maxIndex) newIndex = 0;

    // Update focus and tabindex
    this.updateSwatchFocus(container, newIndex);

    // Focus the new swatch
    swatches[newIndex].focus();
  }

  updateSwatchFocus(container, activeIndex) {
    const swatches = container.querySelectorAll(
      ".related-product-colors__swatch"
    );

    swatches.forEach((swatch, index) => {
      const isActive = index === activeIndex;
      swatch.setAttribute("tabindex", isActive ? "0" : "-1");
      swatch.setAttribute("aria-checked", isActive ? "true" : "false");
      swatch.setAttribute("aria-pressed", isActive ? "true" : "false");

      // Update visual state
      swatch.classList.toggle(
        "related-product-colors__swatch--current",
        isActive
      );
    });
  }

  async handleSwatchClick(container, swatchIndex) {
    if (this.isLoading) return;

    const containerData = container._relatedColors;
    const swatchData = containerData.swatchesData[swatchIndex];

    if (!swatchData || !containerData.imageElement) return;

    // Don't switch if it's already the current swatch
    if (swatchIndex === containerData.currentIndex) return;

    try {
      this.isLoading = true;

      // Update swatch states
      this.updateSwatchFocus(container, swatchIndex);

      // Add loading state
      this.setLoadingState(container, true);

      // Switch the image
      await this.switchImage(containerData.imageElement, swatchData);

      // Update current index
      containerData.currentIndex = swatchIndex;

      // Track analytics if enabled
      this.trackSwatchChange(swatchData);
    } catch (error) {
      console.warn("RelatedProductColors: Error switching image", error);

      // Revert swatch state on error
      this.updateSwatchFocus(container, containerData.currentIndex);
    } finally {
      this.setLoadingState(container, false);
      this.isLoading = false;
    }
  }

  async switchImage(carouselElement, swatchData) {
    return new Promise((resolve, reject) => {
      try {
        // Update the color name display
        this.updateColorName(carouselElement, swatchData.color_name);

        // If no images provided, fall back to single image switching
        if (!swatchData.images || swatchData.images.length === 0) {
          this.switchSingleImage(carouselElement, swatchData);
          resolve();
          return;
        }

        // Switch to new carousel with multiple images
        this.switchCarousel(carouselElement, swatchData);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  switchSingleImage(carouselElement, swatchData) {
    const firstSlide = carouselElement.querySelector(".carousel-slide");
    const image = firstSlide?.querySelector(".rimage__image");

    if (image) {
      image.style.transition = `opacity ${this.animationSpeed}ms ease`;
      image.style.opacity = "0";

      setTimeout(() => {
        image.src = swatchData.image_url;
        image.alt = swatchData.image_alt;

        if (image.hasAttribute("data-src")) {
          image.setAttribute("data-src", swatchData.image_url);
        }

        image.style.opacity = "1";
        setTimeout(() => {
          image.style.transition = "";
        }, this.animationSpeed);
      }, this.animationSpeed / 2);
    }
  }

  switchCarousel(carouselElement, swatchData) {
    const container = carouselElement.querySelector(".carousel-container");
    const track = container.querySelector(".carousel-track");
    const dotsContainer = container.querySelector(".carousel-dots");

    // Fade out current carousel
    container.style.transition = `opacity ${this.animationSpeed}ms ease`;
    container.style.opacity = "0";

    setTimeout(() => {
      // Clear existing slides and dots
      track.innerHTML = "";
      if (dotsContainer) dotsContainer.innerHTML = "";

      // Create new slides from images array
      swatchData.images.forEach((image, index) => {
        // Create slide
        const slide = document.createElement("div");
        slide.className = `carousel-slide ${index === 0 ? "active" : ""}`;
        slide.setAttribute("data-slide-index", index);

        slide.innerHTML = `
          <div class="image__first">
            <div class="rimage-outer-wrapper">
              <div class="rimage-wrapper lazyload--placeholder">
                <img class="rimage__image lazyload fade-in"
                     src="${image.url}"
                     alt="${image.alt}"
                     data-src="${image.url}">
              </div>
            </div>
          </div>
        `;

        track.appendChild(slide);

        // Create dot if multiple images
        if (swatchData.images.length > 1 && dotsContainer) {
          const dot = document.createElement("button");
          dot.className = `carousel-dot ${index === 0 ? "active" : ""}`;
          dot.setAttribute("data-slide-to", index);
          dot.setAttribute("aria-label", `Go to image ${index + 1}`);
          dotsContainer.appendChild(dot);
        }
      });

      // Show/hide navigation based on image count
      const prevBtn = container.querySelector(".carousel-btn--prev");
      const nextBtn = container.querySelector(".carousel-btn--next");

      if (swatchData.images.length <= 1) {
        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
        if (dotsContainer) dotsContainer.style.display = "none";
      } else {
        if (prevBtn) prevBtn.style.display = "flex";
        if (nextBtn) nextBtn.style.display = "flex";
        if (dotsContainer) dotsContainer.style.display = "flex";
      }

      // Fade in new carousel
      container.style.opacity = "1";

      setTimeout(() => {
        container.style.transition = "";

        // Reinitialize carousel for this specific container
        this.initializeCarousel(carouselElement);
      }, this.animationSpeed);
    }, this.animationSpeed / 2);
  }

  updateColorName(carouselElement, colorName) {
    const productBlock = carouselElement.closest(
      ".product-block, .cc-product-block"
    );
    const colorNameElement = productBlock?.querySelector(
      "[data-selected-color-name]"
    );

    if (colorNameElement && colorName) {
      const colorValueElement = colorNameElement.querySelector(
        ".selected-color-value"
      );
      if (colorValueElement) {
        colorValueElement.textContent = colorName;
        colorNameElement.style.display = "block";
      }
    }
  }

  setLoadingState(container, isLoading) {
    const swatches = container.querySelectorAll(
      ".related-product-colors__swatch"
    );

    swatches.forEach((swatch) => {
      swatch.classList.toggle(
        "related-product-colors__swatch--loading",
        isLoading
      );
      swatch.disabled = isLoading;
    });
  }

  preloadImages(swatchesData) {
    // Preload the first few images for better performance
    const preloadCount = Math.min(3, swatchesData.length);

    for (let i = 0; i < preloadCount; i++) {
      const swatchData = swatchesData[i];
      if (
        swatchData &&
        swatchData.image_url &&
        !this.imageCache.has(swatchData.image_url)
      ) {
        const img = new Image();
        img.src = swatchData.image_url;
        this.imageCache.set(swatchData.image_url, img);
      }
    }
  }

  trackSwatchChange(swatchData) {
    // Analytics tracking if enabled
    if (window.gtag && typeof window.gtag === "function") {
      window.gtag("event", "swatch_change", {
        event_category: "Related Product Colors",
        event_label: swatchData.color_name,
        custom_map: {
          product_id: swatchData.product_id,
          color_value: swatchData.color_value,
        },
      });
    }
  }

  setupGlobalListeners() {
    // Reinitialize on AJAX updates (for infinite scroll, filtering, etc.)
    document.addEventListener("DOMContentLoaded", () => {
      // Delay initialization to ensure DOM is ready
      setTimeout(() => this.init(), 100);
    });

    // Handle theme AJAX events
    if (window.theme) {
      document.addEventListener("theme:section:load", () => {
        setTimeout(() => this.init(), 100);
      });
    }
  }

  initializeCarousels() {
    const carousels = document.querySelectorAll(".product-images-carousel");
    carousels.forEach((carousel) => this.initializeCarousel(carousel));
  }

  initializeCarousel(carousel) {
    if (!carousel) return;

    const container = carousel.querySelector(".carousel-container");
    const track = container?.querySelector(".carousel-track");
    const slides = container?.querySelectorAll(".carousel-slide");
    const prevBtn = container?.querySelector(".carousel-btn--prev");
    const nextBtn = container?.querySelector(".carousel-btn--next");
    const dots = container?.querySelectorAll(".carousel-dot");

    if (!container || !track || slides.length <= 1) return;

    let currentSlide = 0;
    const totalSlides = slides.length;

    // Remove existing event listeners by cloning buttons
    if (prevBtn) {
      const newPrevBtn = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    }
    if (nextBtn) {
      const newNextBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    }

    // Get the new buttons after cloning
    const newPrevBtn = container.querySelector(".carousel-btn--prev");
    const newNextBtn = container.querySelector(".carousel-btn--next");
    const newDots = container.querySelectorAll(".carousel-dot");

    const goToSlide = (slideIndex) => {
      // Remove active class from all slides and dots
      slides.forEach((slide) => slide.classList.remove("active"));
      newDots.forEach((dot) => dot.classList.remove("active"));

      // Add active class to current slide and dot
      if (slides[slideIndex]) {
        slides[slideIndex].classList.add("active");
        currentSlide = slideIndex;
      }
      if (newDots[slideIndex]) {
        newDots[slideIndex].classList.add("active");
      }
    };

    const nextSlide = () => {
      const next = (currentSlide + 1) % totalSlides;
      goToSlide(next);
    };

    const prevSlide = () => {
      const prev = (currentSlide - 1 + totalSlides) % totalSlides;
      goToSlide(prev);
    };

    if (newPrevBtn) {
      newPrevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        prevSlide();
        return false;
      });
    }

    if (newNextBtn) {
      newNextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        nextSlide();
        return false;
      });
    }

    // Add dot click handlers
    newDots.forEach((dot, index) => {
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        goToSlide(index);
        return false;
      });
    });

    // Add keyboard navigation
    carousel.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prevSlide();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextSlide();
          break;
      }
    });

    // Make carousel focusable for keyboard navigation
    if (!carousel.hasAttribute("tabindex")) {
      carousel.setAttribute("tabindex", "0");
    }
  }

  // Public method to refresh/reinitialize
  refresh() {
    this.init();
  }

  // Public method to reset all carousels to original
  resetAllImages() {
    this.containers.forEach((container) => {
      const containerData = container._relatedColors;
      if (
        containerData &&
        containerData.imageElement &&
        containerData.originalCarousel
      ) {
        const carouselElement = containerData.imageElement;
        const originalCarousel = containerData.originalCarousel;

        // Restore original carousel content
        carouselElement.innerHTML = originalCarousel.innerHTML;
        carouselElement.setAttribute(
          "data-product-id",
          originalCarousel.productId
        );

        // Hide color name display
        const productBlock = carouselElement.closest(
          ".product-block, .cc-product-block"
        );
        const colorNameElement = productBlock?.querySelector(
          "[data-selected-color-name]"
        );
        if (colorNameElement) {
          colorNameElement.style.display = "none";
        }

        // Reinitialize carousel
        this.initializeCarousel(carouselElement);

        // Reset to first swatch
        this.updateSwatchFocus(container, 0);
        containerData.currentIndex = 0;
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.relatedProductColors = new RelatedProductColors();
  });
} else {
  window.relatedProductColors = new RelatedProductColors();
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = RelatedProductColors;
}
