/**
 * Related Product Color Swatches
 *
 * Handles image switching for related product color swatches
 * Provides smooth transitions and accessibility support
 */

class RelatedProductColors extends HTMLElement {
  constructor() {
    super();

    this.imageCache = new Map();
    this.animationSpeed = 300;
    this.isLoading = false;
    this._observer = null;
    this._refreshTimer = null;
    this._globalListenersAttached = false;

    this.init();
  }

  init() {
    // Initialize each container (idempotent)
    this.initContainer()

    // Initialize carousel functionality
    this.initializeCarousels();

    // Global listeners only once
    this.setupGlobalListeners();
  }

  initContainer() {
    // Prevent duplicate initialization (important for filter/infinite scroll)
    if (this.dataset.rpcInitialized === "true") return;

    const blockId = this.dataset.blockId;
    const swatchesData = this.parseSwatchData(this.dataset.colorSwatches);
    const targetSelector =
      this.dataset.targetImageSelector || ".product-images-carousel";

    if (!blockId || !swatchesData) {
      console.warn("RelatedProductColors: Missing required data attributes", {
        blockId,
        swatchesData: !!swatchesData,
        colorSwatchesAttr: this.dataset.colorSwatches,
      });
      return;
    }

    // Mark as initialized (support BOTH flags so scheduleRefresh selector works)
    this.dataset.rpcInitialized = "true";
    this.setAttribute("data-rpc-initialized", "true");

    // Store container data
    this._relatedColors = {
      blockId,
      swatchesData,
      targetSelector,
      currentIndex: Math.max(0, this.findCurrentIndex(swatchesData)),
      imageElement: this.findImageElement(targetSelector),
      originalImage: null,
      originalCarousel: null,
    };

    // Store original carousel data
    if (this._relatedColors.imageElement) {
      const carouselEl = this._relatedColors.imageElement;
      this._relatedColors.originalCarousel = {
        productId: carouselEl.dataset.productId,
        innerHTML: carouselEl.innerHTML,
      };
    }

    // Setup swatch click handlers
    this.setupSwatchHandlers();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Preload images for better performance
    this.preloadImages(swatchesData);
  }

  parseSwatchData(dataString) {
    if (!dataString || typeof dataString !== "string") return null;

    // Most common cause of failures: HTML-encoded quotes
    const tryParse = (str) => {
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    };

    let parsed = tryParse(dataString);
    if (parsed) return parsed;

    // Fallback decode for &quot; etc (in case anything escapes the attribute)
    const decoded = dataString
      .replaceAll("&quot;", '"')
      .replaceAll("&#34;", '"')
      .replaceAll("&amp;", "&");

    parsed = tryParse(decoded);
    if (parsed) return parsed;

    console.warn("RelatedProductColors: Invalid swatch data", {
      dataStringPreview: dataString.slice(0, 120),
    });
    return null;
  }

  findCurrentIndex(swatchesData) {
    return swatchesData.findIndex((swatch) => swatch.is_current === true);
  }

  findImageElement(targetSelector) {
    // Look for carousel within the same product block
    const productBlock = this.closest(".product-block, .cc-product-block");
    console.log(productBlock)
    if (!productBlock) {
      console.warn("RelatedProductColors: No product block found for container");
      return null;
    }
    return productBlock.querySelector(targetSelector);
  }

  setupSwatchHandlers() {
    const swatches = this.querySelectorAll(
      ".related-product-colors__swatch"
    );

    swatches.forEach((swatch, index) => {
      // Click handler
      swatch.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleSwatchClick(this, index);
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
          this.handleSwatchClick(this, index);
        }
      });
    });
  }

  setupKeyboardNavigation() {
    const swatches = this.querySelectorAll(
      ".related-product-colors__swatch"
    );

    swatches.forEach((swatch, index) => {
      swatch.addEventListener("keydown", (e) => {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault();
            this.handleSwatchClick(index);
            break;

          case "ArrowLeft":
          case "ArrowUp":
            e.preventDefault();
            this.navigateToSwatch(index - 1);
            break;

          case "ArrowRight":
          case "ArrowDown":
            e.preventDefault();
            this.navigateToSwatch(index + 1);
            break;

          case "Home":
            e.preventDefault();
            this.navigateToSwatch(0);
            break;

          case "End":
            e.preventDefault();
            this.navigateToSwatch(swatches.length - 1);
            break;
        }
      });
    });
  }

  navigateToSwatch(targetIndex) {
    const swatches = this.querySelectorAll(
      ".related-product-colors__swatch"
    );
    const maxIndex = swatches.length - 1;

    // Wrap around navigation
    let newIndex = targetIndex;
    if (newIndex < 0) newIndex = maxIndex;
    if (newIndex > maxIndex) newIndex = 0;

    // Update focus and tabindex
    this.updateSwatchFocus(newIndex);

    // Focus the new swatch
    swatches[newIndex].focus();
  }

  updateSwatchFocus(activeIndex) {
    const swatches = this.querySelectorAll(
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

  setCarouselLoading(carouselElement, isLoading) {
    if (!carouselElement) return;
    carouselElement.classList.toggle("rpc-loading", !!isLoading);
  }

  setLoadingState(isLoading) {
    const swatches = this.querySelectorAll(
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

  /**
   * Preload swatch images and resolve when the first image is ready.
   */
  preloadSwatchImages(swatchData) {
    const images = Array.isArray(swatchData?.images) ? swatchData.images : [];
    if (images.length === 0) return Promise.resolve();

    const firstUrl = images[0]?.url;
    if (!firstUrl) return Promise.resolve();

    // Cache hit
    if (this.imageCache.has(firstUrl)) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(firstUrl, img);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = firstUrl;
    });
  }

  /**
   * Force-load lazy images that are injected dynamically.
   * Many themes hide lazy images until lazySizes/theme loader runs.
   */
  forceLoadImages(rootEl) {
    if (!rootEl) return;

    rootEl.querySelectorAll("img").forEach((img) => {
      const dataSrc = img.getAttribute("data-src");
      const dataSrcset = img.getAttribute("data-srcset");

      // If no real src but data-src exists, promote it
      if ((!img.getAttribute("src") || img.getAttribute("src") === "") && dataSrc) {
        img.setAttribute("src", dataSrc);
      }
      if ((!img.getAttribute("srcset") || img.getAttribute("srcset") === "") && dataSrcset) {
        img.setAttribute("srcset", dataSrcset);
      }

      // If theme CSS hides until "lazyloaded", force the state
      img.classList.remove("lazyload", "lazyloading");
      img.classList.add("lazyloaded");

      // Sometimes wrapper has placeholder class
      const wrap = img.closest(".rimage-wrapper");
      if (wrap) wrap.classList.remove("lazyload--placeholder");
    });

    // Try to notify any lazy loader if present
    try {
      if (window.theme?.lazyLoader?.update) window.theme.lazyLoader.update();
      if (window.lazySizes?.loader?.checkElems) window.lazySizes.loader.checkElems();
    } catch (e) { }
  }

  /**
   * Wait for the first visible image to actually load before removing loading overlay.
   */
  waitForFirstImage(rootEl) {
    const img =
      rootEl?.querySelector(".carousel-slide.active img") ||
      rootEl?.querySelector(".carousel-slide img");

    if (!img) return Promise.resolve();

    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    return new Promise((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  }

  async handleSwatchClick(swatchIndex) {
    if (this.isLoading) return;

    const containerData = this._relatedColors;
    if (!containerData) return;

    const swatchData = containerData.swatchesData[swatchIndex];
    if (!swatchData || !containerData.imageElement) return;

    // Don't switch if it's already the current swatch
    if (swatchIndex === containerData.currentIndex) return;

    try {
      this.isLoading = true;

      // Update swatch states immediately
      this.updateSwatchFocus(swatchIndex);

      // Loading state on swatches + carousel overlay
      this.setLoadingState(true);
      this.setCarouselLoading(containerData.imageElement, true);

      // Preload first image
      await this.preloadSwatchImages(swatchData);

      // Switch the carousel/images
      await this.switchImage(containerData.imageElement, swatchData);

      // Ensure images actually show
      this.forceLoadImages(containerData.imageElement);

      // Wait until first image is loaded (prevents "DOM updated but blank" moment)
      await this.waitForFirstImage(containerData.imageElement);

      // Update current index
      containerData.currentIndex = swatchIndex;

      // Track analytics if enabled
      this.trackSwatchChange(swatchData);
    } catch (error) {
      console.warn("RelatedProductColors: Error switching image", error);
      // Revert swatch state on error
      this.updateSwatchFocus(containerData.currentIndex);
    } finally {
      if (containerData?.imageElement) {
        this.setCarouselLoading(containerData.imageElement, false);
      }
      this.setLoadingState(false);
      this.isLoading = false;
    }
  }

  async switchImage(carouselElement, swatchData) {
    return new Promise((resolve, reject) => {
      try {
        // Update the color name display
        // this.updateColorName(carouselElement, swatchData.color_name);

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
    const image =
      firstSlide?.querySelector(".rimage__image") ||
      firstSlide?.querySelector("img");

    if (image) {
      image.style.transition = `opacity ${this.animationSpeed}ms ease`;
      image.style.opacity = "0";

      setTimeout(() => {
        if (swatchData.image_url) image.src = swatchData.image_url;
        if (swatchData.image_alt) image.alt = swatchData.image_alt;

        if (image.hasAttribute("data-src") && swatchData.image_url) {
          image.setAttribute("data-src", swatchData.image_url);
        }

        // Force visible state for lazyload CSS
        image.classList.remove("lazyload", "lazyloading");
        image.classList.add("lazyloaded");

        image.style.opacity = "1";
        setTimeout(() => {
          image.style.transition = "";
        }, this.animationSpeed);
      }, this.animationSpeed / 2);
    }
  }

  getTemplateSlide(carouselElement) {
    // Use the existing (working) slide markup as a template
    const existing =
      carouselElement.querySelector(".carousel-track .carousel-slide") ||
      carouselElement.querySelector(".carousel-slide");

    return existing ? existing.cloneNode(true) : null;
  }

  applyImageToSlide(slideEl, image) {
    if (!slideEl || !image?.url) return;

    // Try common image selectors used by Showcase
    const img =
      slideEl.querySelector("img.rimage__image") ||
      slideEl.querySelector("img");

    if (!img) return;

    const url = image.url;
    const alt = image.alt || "";

    // Force a real src (not just data-src)
    img.setAttribute("src", url);
    img.setAttribute("alt", alt);

    // Keep theme lazyload attributes aligned (some themes read data-src)
    img.setAttribute("data-src", url);
    img.removeAttribute("srcset");
    img.removeAttribute("data-srcset");

    // Force visibility (some themes hide until lazyloaded)
    img.classList.remove("lazyload", "lazyloading", "fade-in");
    img.classList.add("lazyloaded");

    // Remove placeholder wrapper state if present
    const wrap = img.closest(".rimage-wrapper");
    if (wrap) wrap.classList.remove("lazyload--placeholder");

    // Also ensure slide is not hidden by inline opacity
    slideEl.style.opacity = "1";
  }

  switchCarousel(carouselElement, swatchData) {
    const container = carouselElement.querySelector(".carousel-container");
    const track = container?.querySelector(".carousel-track");
    const dotsContainer = container?.querySelector(".carousel-dots");

    if (!container || !track) return;

    const images = Array.isArray(swatchData.images) ? swatchData.images : [];
    if (images.length === 0) return;

    // Use existing working slide markup as template (critical)
    const templateSlide = this.getTemplateSlide(carouselElement);

    // Fade out current carousel
    this.style.transition = `opacity ${this.animationSpeed}ms ease`;
    this.style.opacity = "0";

    setTimeout(() => {
      // Clear current slides/dots
      track.innerHTML = "";
      if (dotsContainer) dotsContainer.innerHTML = "";

      // Build slides using template markup
      images.slice(0, 5).forEach((image, index) => {
        let slide;

        if (templateSlide) {
          slide = templateSlide.cloneNode(true);
        } else {
          // Fallback minimal slide (only if template missing)
          slide = document.createElement("div");
          slide.innerHTML = `<div class="image__first"><img></div>`;
        }

        slide.classList.add("carousel-slide");
        slide.classList.toggle("active", index === 0);
        slide.setAttribute("data-slide-index", index);

        this.applyImageToSlide(slide, image);
        track.appendChild(slide);

        // Dots
        if (images.length > 1 && dotsContainer) {
          const dot = document.createElement("button");
          dot.className = `carousel-dot ${index === 0 ? "active" : ""}`;
          dot.setAttribute("data-slide-to", index);
          dot.setAttribute("aria-label", `Go to image ${index + 1}`);
          dotsContainer.appendChild(dot);
        }
      });

      // Show/hide navigation based on image count
      const prevBtn = this.querySelector(".carousel-btn--prev");
      const nextBtn = this.querySelector(".carousel-btn--next");

      if (images.length <= 1) {
        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
        if (dotsContainer) dotsContainer.style.display = "none";
      } else {
        if (prevBtn) prevBtn.style.display = "flex";
        if (nextBtn) nextBtn.style.display = "flex";
        if (dotsContainer) dotsContainer.style.display = "flex";
      }

      // Reset carousel position + ensure first slide visible
      const slides = track.querySelectorAll(".carousel-slide");
      slides.forEach((s) => s.classList.remove("active"));
      if (slides[0]) slides[0].classList.add("active");

      track.style.transform = "translateX(0%)";
      carouselElement.dataset.currentSlide = "0";

      // Force-load (in case theme CSS is waiting for lazyloaded)
      this.forceLoadImages(carouselElement);

      // Fade in
      this.style.opacity = "1";

      setTimeout(() => {
        this.style.transition = "";
        delete carouselElement.dataset.rpcCarouselInitialized;
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

  preloadImages(swatchesData) {
    // Preload the first few images for better performance
    const preloadCount = Math.min(3, swatchesData.length);

    for (let i = 0; i < preloadCount; i++) {
      const swatchData = swatchesData[i];
      if (swatchData?.image_url && !this.imageCache.has(swatchData.image_url)) {
        const img = new Image();
        img.src = swatchData.image_url;
        this.imageCache.set(swatchData.image_url, img);
      }
    }
  }

  trackSwatchChange(swatchData) {
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
    if (this._globalListenersAttached) return;
    this._globalListenersAttached = true;

    document.addEventListener("shopify:section:load", () => this.scheduleRefresh());
    document.addEventListener("theme:section:load", () => this.scheduleRefresh());

    if (!this._observer) {
      this._observer = new MutationObserver(() => this.scheduleRefresh());
      this._observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  }

  scheduleRefresh() {
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => {
      // Init any new blocks added to DOM
      document
        .querySelectorAll('.related-product-colors:not([data-rpc-initialized="true"])')
        .forEach((el) => this.initContainer(el));

      this.initializeCarousels();
    }, 80);
  }

  initializeCarousels() {
    const carousels = document.querySelectorAll(".product-images-carousel");
    carousels.forEach((carousel) => this.initializeCarousel(carousel));
  }

  initializeCarousel(carousel) {
    if (!carousel) return;

    // Avoid double-binding when init is called multiple times
    if (carousel.dataset.rpcCarouselInitialized === "true") return;

    const container = carousel.querySelector(".carousel-container");
    const track = container?.querySelector(".carousel-track");
    const slides = container?.querySelectorAll(".carousel-slide");
    const prevBtn = container?.querySelector(".carousel-btn--prev");
    const nextBtn = container?.querySelector(".carousel-btn--next");

    if (!container || !track || !slides || slides.length <= 1) return;

    // Ensure there is always an active slide
    let currentSlide = 0;
    const hasActive = Array.from(slides).some((s) => s.classList.contains("active"));
    if (!hasActive && slides[0]) slides[0].classList.add("active");
    const totalSlides = slides.length;

    // Remove existing event listeners by cloning buttons
    if (prevBtn) {
      const newPrevBtnClone = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrevBtnClone, prevBtn);
    }
    if (nextBtn) {
      const newNextBtnClone = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNextBtnClone, nextBtn);
    }

    const newPrevBtn = this.querySelector(".carousel-btn--prev");
    const newNextBtn = this.querySelector(".carousel-btn--next");
    const newDots = this.querySelectorAll(".carousel-dot");

    const goToSlide = (slideIndex) => {
      slides.forEach((slide) => slide.classList.remove("active"));
      newDots.forEach((dot) => dot.classList.remove("active"));

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

    newDots.forEach((dot, index) => {
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        goToSlide(index);
        return false;
      });
    });

    // Keyboard navigation
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

    if (!carousel.hasAttribute("tabindex")) {
      carousel.setAttribute("tabindex", "0");
    }

    carousel.dataset.rpcCarouselInitialized = "true";
  }

  // Public method to refresh/reinitialize
  refresh() {
    this.init();
  }

  // Public method to reset all carousels to original
  resetAllImages() {
    const containerData = this._relatedColors;
    if (containerData?.imageElement && containerData.originalCarousel) {
      const carouselElement = containerData.imageElement;
      const originalCarousel = containerData.originalCarousel;

      carouselElement.innerHTML = originalCarousel.innerHTML;
      carouselElement.setAttribute("data-product-id", originalCarousel.productId);

      // Hide color name display
      const productBlock = carouselElement.closest(
        ".product-block, .cc-product-block"
      );
      const colorNameElement = productBlock?.querySelector(
        "[data-selected-color-name]"
      );
      if (colorNameElement) colorNameElement.style.display = "none";

      // Reinitialize carousel
      delete carouselElement.dataset.rpcCarouselInitialized;
      this.initializeCarousel(carouselElement);

      // Reset to first swatch
      this.updateSwatchFocus(0);
      containerData.currentIndex = 0;
    }
  }
}

customElements.define('related-product-colors', RelatedProductColors);

// Export for module systems
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = RelatedProductColors;
// }
