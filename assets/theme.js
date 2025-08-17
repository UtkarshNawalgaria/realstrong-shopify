(function ($) {
  var $ = jQuery = $;

  let cc = {
    sections: []
  };

  theme.Shopify = {
    formatMoney: function (t, r) {
      function e(t, r) {
        return void 0 === t ? r : t;
      }
      function a(t, r, a, o) {
        if (r = e(r, 2),
        a = e(a, ","),
        o = e(o, "."),
        isNaN(t) || null == t)
        return 0;
        t = (t / 100).toFixed(r);
        var n = t.split(".");
        return n[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + a) + (n[1] ? o + n[1] : "");
      }
      "string" == typeof t && (t = t.replace(".", ""));
      var o = "",
        n = /\{\{\s*(\w+)\s*\}\}/,
        i = r || this.money_format;
      switch (i.match(n)[1]) {
        case "amount":
          o = a(t, 2);
          break;
        case "amount_no_decimals":
          o = a(t, 0);
          break;
        case "amount_with_comma_separator":
          o = a(t, 2, ".", ",");
          break;
        case "amount_with_space_separator":
          o = a(t, 2, " ", ",");
          break;
        case "amount_with_period_and_space_separator":
          o = a(t, 2, " ", ".");
          break;
        case "amount_no_decimals_with_comma_separator":
          o = a(t, 0, ".", ",");
          break;
        case "amount_no_decimals_with_space_separator":
          o = a(t, 0, " ", "");
          break;
        case "amount_with_apostrophe_separator":
          o = a(t, 2, "'", ".");
          break;
        case "amount_with_decimal_separator":
          o = a(t, 2, ".", ".");}

      return i.replace(n, o);
    },
    formatImage: function (originalImageUrl, format) {
      return originalImageUrl ? originalImageUrl.replace(/^(.*)\.([^\.]*)$/g, '$1_' + format + '.$2') : '';
    },
    Image: {
      imageSize: function (t) {
        var e = t.match(/.+_((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})[_\.@]/);
        return null !== e ? e[1] : null;
      },
      getSizedImageUrl: function (t, e) {
        if (null == e)
        return t;
        if ("master" == e)
        return this.removeProtocol(t);
        var o = t.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);
        if (null != o) {
          var i = t.split(o[0]),
            r = o[0];
          return this.removeProtocol(i[0] + "_" + e + r);
        }
        return null;
      },
      removeProtocol: function (t) {
        return t.replace(/http(s)?:/, "");
      }
    }
  };
  class ccComponent {
    constructor(name) {let cssSelector = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : `.cc-${name}`;
      const _this = this;
      this.instances = [];

      // Initialise any instance of this component within a section
      $(document).on('cc:component:load', function (event, component, target) {
        if (component === name) {
          $(target).find(`${cssSelector}:not(.cc-initialized)`).each(function () {
            _this.init(this);
          });
        }
      });

      // Destroy any instance of this component within a section
      $(document).on('cc:component:unload', function (event, component, target) {
        if (component === name) {
          $(target).find(cssSelector).each(function () {
            _this.destroy(this);
          });
        }
      });

      // Initialise any instance of this component
      $(cssSelector).each(function () {
        _this.init(this);
      });
    }

    init(container) {
      $(container).addClass('cc-initialized');
    }

    destroy(container) {
      $(container).removeClass('cc-initialized');
    }

    registerInstance(container, instance) {
      this.instances.push({
        container,
        instance
      });
    }

    destroyInstance(container) {
      this.instances = this.instances.filter((item) => {
        if (item.container === container) {
          if (typeof item.instance.destroy === 'function') {
            item.instance.destroy();
          }

          return item.container !== container;
        }
      });
    }
  }
  // requires: throttled-scroll, debouncedresize

  /*
    Define a section by creating a new function object and registering it with the section handler.
    The section handler manages:
      Instantiation for all sections on the current page
      Theme editor lifecycle events
      Deferred initialisation
      Event cleanup
  
    There are two ways to register a section.
    In a theme:
      theme.Sections.register('slideshow', theme.SlideshowSection);
      theme.Sections.register('header', theme.HeaderSection, { deferredLoad: false });
      theme.Sections.register('background-video', theme.VideoManager, { deferredLoadViewportExcess: 800 });
  
    As a component:
      cc.sections.push({ name: 'faq', section: theme.Faq });
  
    Assign any of these to receive Shopify section lifecycle events:
      this.onSectionLoad
      this.afterSectionLoadCallback
      this.onSectionSelect
      this.onSectionDeselect
      this.onBlockSelect
      this.onBlockDeselect
      this.onSectionUnload
      this.afterSectionUnloadCallback
      this.onSectionReorder
  
    If you add any events using the manager's registerEventListener,
    e.g. this.registerEventListener(element, 'click', this.functions.handleClick.bind(this)),
    these will be automatically cleaned up after onSectionUnload.
   */

  theme.Sections = new function () {
    var _ = this;

    _._instances = [];
    _._deferredSectionTargets = [];
    _._sections = [];
    _._deferredLoadViewportExcess = 300; // load defferred sections within this many px of viewport
    _._deferredWatcherRunning = false;

    _.init = function () {
      $(document).on('shopify:section:load', function (e) {
        // load a new section
        var target = _._themeSectionTargetFromShopifySectionTarget(e.target);
        if (target) {
          _.sectionLoad(target);
        }
      }).on('shopify:section:unload', function (e) {
        // unload existing section
        var target = _._themeSectionTargetFromShopifySectionTarget(e.target);
        if (target) {
          _.sectionUnload(target);
        }
      }).on('shopify:section:reorder', function (e) {
        // unload existing section
        var target = _._themeSectionTargetFromShopifySectionTarget(e.target);
        if (target) {
          _.sectionReorder(target);
        }
      });
      $(window).on('throttled-scroll.themeSectionDeferredLoader debouncedresize.themeSectionDeferredLoader', _._processDeferredSections);
      _._deferredWatcherRunning = true;
    };

    // register a type of section
    _.register = function (type, section, options) {
      _._sections.push({
        type: type,
        section: section,
        afterSectionLoadCallback: options ? options.afterLoad : null,
        afterSectionUnloadCallback: options ? options.afterUnload : null
      });

      // load now
      $('[data-section-type="' + type + '"]').each(function () {
        if (Shopify.designMode || options && options.deferredLoad === false || !_._deferredWatcherRunning) {
          _.sectionLoad(this);
        } else {
          _.sectionDeferredLoad(this, options);
        }
      });
    };

    // prepare a section to load later
    _.sectionDeferredLoad = function (target, options) {
      _._deferredSectionTargets.push({
        target: target,
        deferredLoadViewportExcess: options && options.deferredLoadViewportExcess ? options.deferredLoadViewportExcess : _._deferredLoadViewportExcess
      });
      _._processDeferredSections(true);
    };

    // load deferred sections if in/near viewport
    _._processDeferredSections = function (firstRunCheck) {
      if (_._deferredSectionTargets.length) {
        var viewportTop = $(window).scrollTop(),
          viewportBottom = viewportTop + $(window).height(),
          loopStart = firstRunCheck === true ? _._deferredSectionTargets.length - 1 : 0;
        for (var i = loopStart; i < _._deferredSectionTargets.length; i++) {
          var target = _._deferredSectionTargets[i].target,
            viewportExcess = _._deferredSectionTargets[i].deferredLoadViewportExcess,
            sectionTop = $(target).offset().top - viewportExcess,
            doLoad = sectionTop > viewportTop && sectionTop < viewportBottom;
          if (!doLoad) {
            var sectionBottom = sectionTop + $(target).outerHeight() + viewportExcess * 2;
            doLoad = sectionBottom > viewportTop && sectionBottom < viewportBottom;
          }
          if (doLoad || sectionTop < viewportTop && sectionBottom > viewportBottom) {
            // in viewport, load
            _.sectionLoad(target);
            // remove from deferred queue and resume checks
            _._deferredSectionTargets.splice(i, 1);
            i--;
          }
        }
      }

      // remove event if no more deferred targets left, if not on first run
      if (firstRunCheck !== true && _._deferredSectionTargets.length === 0) {
        _._deferredWatcherRunning = false;
        $(window).off('.themeSectionDeferredLoader');
      }
    };

    // load in a section
    _.sectionLoad = function (target) {
      var target = target,
        sectionObj = _._sectionForTarget(target),
        section = false;

      if (sectionObj.section) {
        section = sectionObj.section;
      } else {
        section = sectionObj;
      }

      if (section !== false) {
        var instance = {
          target: target,
          section: section,
          $shopifySectionContainer: $(target).closest('.shopify-section'),
          thisContext: {
            functions: section.functions,
            registeredEventListeners: []
          }
        };
        instance.thisContext.registerEventListener = _._registerEventListener.bind(instance.thisContext);
        _._instances.push(instance);

        //Initialise any components
        if ($(target).data('components')) {
          //Init each component
          const components = $(target).data('components').split(',');
          components.forEach((component) => {
            $(document).trigger('cc:component:load', [component, target]);
          });
        }

        _._callSectionWith(section, 'onSectionLoad', target, instance.thisContext);
        _._callSectionWith(section, 'afterSectionLoadCallback', target, instance.thisContext);

        // attach additional UI events if defined
        if (section.onSectionSelect) {
          instance.$shopifySectionContainer.on('shopify:section:select', function (e) {
            _._callSectionWith(section, 'onSectionSelect', e.target, instance.thisContext);
          });
        }
        if (section.onSectionDeselect) {
          instance.$shopifySectionContainer.on('shopify:section:deselect', function (e) {
            _._callSectionWith(section, 'onSectionDeselect', e.target, instance.thisContext);
          });
        }
        if (section.onBlockSelect) {
          $(target).on('shopify:block:select', function (e) {
            _._callSectionWith(section, 'onBlockSelect', e.target, instance.thisContext);
          });
        }
        if (section.onBlockDeselect) {
          $(target).on('shopify:block:deselect', function (e) {
            _._callSectionWith(section, 'onBlockDeselect', e.target, instance.thisContext);
          });
        }
      }
    };

    // unload a section
    _.sectionUnload = function (target) {
      var sectionObj = _._sectionForTarget(target);
      var instanceIndex = -1;
      for (var i = 0; i < _._instances.length; i++) {
        if (_._instances[i].target == target) {
          instanceIndex = i;
        }
      }
      if (instanceIndex > -1) {
        var instance = _._instances[instanceIndex];
        // remove events and call unload, if loaded
        $(target).off('shopify:block:select shopify:block:deselect');
        instance.$shopifySectionContainer.off('shopify:section:select shopify:section:deselect');
        _._callSectionWith(instance.section, 'onSectionUnload', target, instance.thisContext);
        _._unloadRegisteredEventListeners(instance.thisContext.registeredEventListeners);
        _._callSectionWith(sectionObj, 'afterSectionUnloadCallback', target, instance.thisContext);
        _._instances.splice(instanceIndex);

        //Destroy any components
        if ($(target).data('components')) {
          //Init each component
          const components = $(target).data('components').split(',');
          components.forEach((component) => {
            $(document).trigger('cc:component:unload', [component, target]);
          });
        }
      } else {
        // check if it was a deferred section
        for (var i = 0; i < _._deferredSectionTargets.length; i++) {
          if (_._deferredSectionTargets[i].target == target) {
            _._deferredSectionTargets[i].splice(i, 1);
            break;
          }
        }
      }
    };

    _.sectionReorder = function (target) {
      var instanceIndex = -1;
      for (var i = 0; i < _._instances.length; i++) {
        if (_._instances[i].target == target) {
          instanceIndex = i;
        }
      }
      if (instanceIndex > -1) {
        var instance = _._instances[instanceIndex];
        _._callSectionWith(instance.section, 'onSectionReorder', target, instance.thisContext);
      }
    };

    // Helpers
    _._registerEventListener = function (element, eventType, callback) {
      element.addEventListener(eventType, callback);
      this.registeredEventListeners.push({
        element,
        eventType,
        callback
      });
    };

    _._unloadRegisteredEventListeners = function (registeredEventListeners) {
      registeredEventListeners.forEach((rel) => {
        rel.element.removeEventListener(rel.eventType, rel.callback);
      });
    };

    _._callSectionWith = function (section, method, container, thisContext) {
      if (typeof section[method] === 'function') {
        try {
          if (thisContext) {
            section[method].bind(thisContext)(container);
          } else {
            section[method](container);
          }
        } catch (ex) {
          const sectionType = container.dataset['sectionType'];
          console.warn(`Theme warning: '${method}' failed for section '${sectionType}'`);
          console.debug(container, ex);
        }
      }
    };

    _._themeSectionTargetFromShopifySectionTarget = function (target) {
      var $target = $('[data-section-type]:first', target);
      if ($target.length > 0) {
        return $target[0];
      } else {
        return false;
      }
    };

    _._sectionForTarget = function (target) {
      var type = $(target).attr('data-section-type');
      for (var i = 0; i < _._sections.length; i++) {
        if (_._sections[i].type == type) {
          return _._sections[i];
        }
      }
      return false;
    };

    _._sectionAlreadyRegistered = function (type) {
      for (var i = 0; i < _._sections.length; i++) {
        if (_._sections[i].type == type) {
          return true;
        }
      }
      return false;
    };
  }();
  // Loading third party scripts
  theme.scriptsLoaded = {};
  theme.loadScriptOnce = function (src, callback, beforeRun, sync) {
    if (typeof theme.scriptsLoaded[src] === 'undefined') {
      theme.scriptsLoaded[src] = [];
      var tag = document.createElement('script');
      tag.src = src;

      if (sync || beforeRun) {
        tag.async = false;
      }

      if (beforeRun) {
        beforeRun();
      }

      if (typeof callback === 'function') {
        theme.scriptsLoaded[src].push(callback);
        if (tag.readyState) {// IE, incl. IE9
          tag.onreadystatechange = function () {
            if (tag.readyState == "loaded" || tag.readyState == "complete") {
              tag.onreadystatechange = null;
              for (var i = 0; i < theme.scriptsLoaded[this].length; i++) {
                theme.scriptsLoaded[this][i]();
              }
              theme.scriptsLoaded[this] = true;
            }
          }.bind(src);
        } else {
          tag.onload = function () {// Other browsers
            for (var i = 0; i < theme.scriptsLoaded[this].length; i++) {
              theme.scriptsLoaded[this][i]();
            }
            theme.scriptsLoaded[this] = true;
          }.bind(src);
        }
      }

      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      return true;
    } else if (typeof theme.scriptsLoaded[src] === 'object' && typeof callback === 'function') {
      theme.scriptsLoaded[src].push(callback);
    } else {
      if (typeof callback === 'function') {
        callback();
      }
      return false;
    }
  };

  theme.loadStyleOnce = function (src) {
    var srcWithoutProtocol = src.replace(/^https?:/, '');
    if (!document.querySelector('link[href="' + encodeURI(srcWithoutProtocol) + '"]')) {
      var tag = document.createElement('link');
      tag.href = srcWithoutProtocol;
      tag.rel = 'stylesheet';
      tag.type = 'text/css';
      var firstTag = document.getElementsByTagName('link')[0];
      firstTag.parentNode.insertBefore(tag, firstTag);
    }
  };theme.Disclosure = function () {
    var selectors = {
      disclosureList: '[data-disclosure-list]',
      disclosureToggle: '[data-disclosure-toggle]',
      disclosureInput: '[data-disclosure-input]',
      disclosureOptions: '[data-disclosure-option]'
    };

    var classes = {
      listVisible: 'disclosure-list--visible'
    };

    function Disclosure($disclosure) {
      this.$container = $disclosure;
      this.cache = {};
      this._cacheSelectors();
      this._connectOptions();
      this._connectToggle();
      this._onFocusOut();
    }

    Disclosure.prototype = $.extend({}, Disclosure.prototype, {
      _cacheSelectors: function () {
        this.cache = {
          $disclosureList: this.$container.find(selectors.disclosureList),
          $disclosureToggle: this.$container.find(selectors.disclosureToggle),
          $disclosureInput: this.$container.find(selectors.disclosureInput),
          $disclosureOptions: this.$container.find(selectors.disclosureOptions)
        };
      },

      _connectToggle: function () {
        this.cache.$disclosureToggle.on(
        'click',
        function (evt) {
          var ariaExpanded =
          $(evt.currentTarget).attr('aria-expanded') === 'true';
          $(evt.currentTarget).attr('aria-expanded', !ariaExpanded);

          this.cache.$disclosureList.toggleClass(classes.listVisible);
        }.bind(this));

      },

      _connectOptions: function () {
        this.cache.$disclosureOptions.on(
        'click',
        function (evt) {
          evt.preventDefault();
          this._submitForm($(evt.currentTarget).data('value'));
        }.bind(this));

      },

      _onFocusOut: function () {
        this.cache.$disclosureToggle.on(
        'focusout',
        function (evt) {
          var disclosureLostFocus =
          this.$container.has(evt.relatedTarget).length === 0;

          if (disclosureLostFocus) {
            this._hideList();
          }
        }.bind(this));


        this.cache.$disclosureList.on(
        'focusout',
        function (evt) {
          var childInFocus =
          $(evt.currentTarget).has(evt.relatedTarget).length > 0;
          var isVisible = this.cache.$disclosureList.hasClass(
          classes.listVisible);


          if (isVisible && !childInFocus) {
            this._hideList();
          }
        }.bind(this));


        this.$container.on(
        'keyup',
        function (evt) {
          if (evt.which !== 27) return; // escape
          this._hideList();
          this.cache.$disclosureToggle.focus();
        }.bind(this));


        this.bodyOnClick = function (evt) {
          var isOption = this.$container.has(evt.target).length > 0;
          var isVisible = this.cache.$disclosureList.hasClass(
          classes.listVisible);


          if (isVisible && !isOption) {
            this._hideList();
          }
        }.bind(this);

        $('body').on('click', this.bodyOnClick);
      },

      _submitForm: function (value) {
        this.cache.$disclosureInput.val(value);
        this.$container.parents('form').submit();
      },

      _hideList: function () {
        this.cache.$disclosureList.removeClass(classes.listVisible);
        this.cache.$disclosureToggle.attr('aria-expanded', false);
      },

      unload: function () {
        $('body').off('click', this.bodyOnClick);
        this.cache.$disclosureOptions.off();
        this.cache.$disclosureToggle.off();
        this.cache.$disclosureList.off();
        this.$container.off();
      }
    });

    return Disclosure;
  }();
  /// Show a short-lived text popup above an element
  theme.showQuickPopup = function (message, $origin) {
    var $popup = $('<div class="simple-popup"/>');
    var offs = $origin.offset();
    $popup.html(message).css({ 'left': offs.left, 'top': offs.top }).hide();
    $('body').append($popup);
    $popup.css({ marginTop: -$popup.outerHeight() - 10, marginLeft: -($popup.outerWidth() - $origin.outerWidth()) / 2 });
    $popup.fadeIn(200).delay(3500).fadeOut(400, function () {
      $(this).remove();
    });
  };
  //v1.0
  $.fn.sort = [].sort; // v1.0
  $.fn.fadeOutAndRemove = function (speed, callback) {
    $(this).fadeOut(speed, function () {
      $(this).remove();
      typeof callback == 'function' && callback();
    });
  }; // Turn a <select> tag into clicky boxes
  // Use with: $('select').clickyBoxes()
  $.fn.clickyBoxes = function (prefix) {
    if (prefix == 'destroy') {
      $(this).off('.clickyboxes');
      $(this).next('.clickyboxes').off('.clickyboxes');
    } else {
      return $(this).filter('select:not(.clickybox-replaced)').addClass('clickybox-replaced').each(function () {
        //Make sure rows are unique
        var prefix = prefix || $(this).attr('id');
        //Create container
        var $optCont = $('<ul class="clickyboxes"/>').attr('id', 'clickyboxes-' + prefix).data('select', $(this)).insertAfter(this);

        var $label;
        if ($(this).is('[id]')) {
          $label = $('label[for="' + $(this).attr('id') + '"]'); // Grab real label
        } else {
          $label = $(this).siblings('label'); // Rough guess
        }
        if ($label.length > 0) {
          $optCont.addClass('options-' + removeDiacritics($label.text()).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/-*$/, ''));
        }

        //Add options to container
        $(this).find('option').each(function () {
          $('<li/>').appendTo($optCont).append(
          $('<a href="#"/>').attr('data-value', $(this).val()).html($(this).html()).
          addClass('opt--' + removeDiacritics($(this).text()).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/-*$/, '')));

        });
        //Select change event
        $(this).hide().addClass('replaced').on('change.clickyboxes keyup.clickyboxes', function () {
          //Choose the right option to show
          var val = $(this).val();
          $optCont.find('a').removeClass('active').filter(function () {
            return $(this).attr('data-value') == val;
          }).addClass('active');
        }).trigger('keyup'); //Initial value
        //Button click event
        $optCont.on('click.clickyboxes', 'a', function () {
          if (!$(this).hasClass('active')) {
            var $clicky = $(this).closest('.clickyboxes');
            $clicky.data('select').val($(this).data('value')).trigger('change');
            $clicky.trigger('change');
          }
          return false;
        });
      });
    }
  };
  // v1.0
  //Find out how wide scrollbars are on this browser
  $.scrollBarWidth = function () {
    var $temp = $('<div/>').css({
      width: 100,
      height: 100,
      overflow: 'scroll',
      position: 'absolute',
      top: -9999
    }).prependTo('body');
    var w = $temp[0].offsetWidth - $temp[0].clientWidth;
    $temp.remove();
    return w;
  }; //Restyle all select dropdowns
  //NOTE: Only for us on showcase until this can be replaced with jquery.selectreplace.v1.0.js
  var chevronDownIcon = '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 7.84L12 12.42l4.59-4.58L18 9.25l-6 6-6-6z"/><path d="M0-.75h24v24H0z" fill="none"/></svg>';
  $.fn.selectReplace = function (leaveLabel) {
    return $(this).filter('select:not(.replaced, .noreplace)').each(function () {
      //Add formatting containers
      var $opts = $(this).find('option');
      var initialText = $opts.filter(':selected').length > 0 ? $opts.filter(':selected').text() : $opts.first().text();
      var $cont = $(this).addClass('replaced').wrap('<div class="pretty-select">').parent().addClass('id-' + $(this).attr('id')).
      append('<span class="text"><span class="value">' + initialText + '</span></span>' + chevronDownIcon);
      //Label? Move inside
      if ($(this).attr('id')) {
        //Find label
        var $label = $('label[for="' + $(this).attr('id') + '"]');
        //If table cells used for layout, do not move the label
        var $selectTD = $(this).closest('td');
        var $labelTD = $label.closest('td');
        if (!leaveLabel && ($selectTD.length == 0 || $labelTD.length == 0 || $selectTD[0] == $labelTD[0])) {
          //Add to dropdown
          var $labelSpan = $('<span class="label">').html($label.html()).prependTo($cont.find('.text'));
          //Add colon, if it doesn't exist
          if ($labelSpan.slice(-1) != ':') {
            $labelSpan.append(':');
          }
          // remove label element and use aria
          $cont.find('select').attr('aria-label', $label.text());
          $label.remove();
        }
      }
    }).on('change keyup', function () {
      $(this).siblings('.text').find('.value').html($(this).find(':selected').html());
    });
  };$.fn.ccHoverLine = function (opts) {
    $(this).each(function () {
      const $this = $(this);
      if (!$this.hasClass('cc-init')) {
        $this.append("<li class='cc-hover-line'></li>").addClass('cc-init');
        const $hoverLine = $(this).find(".cc-hover-line");

        if (opts && opts.lineCss) {
          $hoverLine.css(opts.lineCss);
        }

        function updateLine() {let $link = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : $this.find('li a[aria-selected="true"], li a.active');
          if ($link.length === 1) {
            $hoverLine.css({
              width: $link.width(),
              top: $link.position().top + $link.outerHeight(),
              left: $link.position().left
            });
          }
        }

        updateLine();

        if ($(window).outerWidth() < 768) {
          $(this).find("li").click(function () {
            const $link = $(this).find('a');
            if ($link.length === 1) {
              updateLine($link);
            }
          });
        } else {
          $(this).find("li").hover(function () {
            const $link = $(this).find('a');
            if ($link.length === 1) {
              updateLine($link);
            }
          }, function () {
            updateLine();
          });
        }

        $(window).on('debouncedresizewidth', function () {
          updateLine();
        });
      }
    });
  };
  (function () {
    function throttle(callback, threshold) {
      let debounceTimeoutId = -1;
      let tick = false;

      return function () {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = setTimeout(callback, threshold);

        if (!tick) {
          callback.call();
          tick = true;
          setTimeout(function () {
            tick = false;
          }, threshold);
        }
      };
    }

    const scrollEvent = document.createEvent('Event');
    scrollEvent.initEvent('throttled-scroll', true, true);

    window.addEventListener("scroll", throttle(function () {
      window.dispatchEvent(scrollEvent);
    }, 200));

  })();
  theme.cartNoteMonitor = {
    load: function ($notes) {
      $notes.on('change.themeCartNoteMonitor paste.themeCartNoteMonitor keyup.themeCartNoteMonitor', function () {
        theme.cartNoteMonitor.postUpdate($(this).val());
      });
    },

    unload: function ($notes) {
      $notes.off('.themeCartNoteMonitor');
    },

    updateThrottleTimeoutId: -1,
    updateThrottleInterval: 500,

    postUpdate: function (val) {
      clearTimeout(theme.cartNoteMonitor.updateThrottleTimeoutId);
      theme.cartNoteMonitor.updateThrottleTimeoutId = setTimeout(function () {
        $.post(theme.routes.cart_url + '/update.js', {
          note: val
        }, function (data) {}, 'json');
      }, theme.cartNoteMonitor.updateThrottleInterval);
    }
  };
  // Source: https://davidwalsh.name/javascript-debounce-function
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  theme.debounce = function (func) {let wait = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 700;let immediate = arguments.length > 2 ? arguments[2] : undefined;
    var timeout;
    return function () {
      var context = this,args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };
  class AccordionInstance {
    constructor(container) {
      this.accordion = container;
      this.itemClass = '.cc-accordion-item';
      this.titleClass = '.cc-accordion-item__title';
      this.panelClass = '.cc-accordion-item__panel';
      this.allowMultiOpen = this.accordion.dataset.allowMultiOpen === 'true';

      // If multiple open items not allowed, set open item as active (if there is one)
      if (!this.allowMultiOpen) {
        this.activeItem = this.accordion.querySelector(`${this.itemClass}[open]`);
      }

      this.bindEvents();
    }

    /**
     * Adds inline 'height' style to a panel, to trigger open transition
     * @param {HTMLDivElement} panel - The accordion item content panel
     */
    static addPanelHeight(panel) {
      panel.style.height = `${panel.scrollHeight}px`;
    }

    /**
     * Removes inline 'height' style from a panel, to trigger close transition
     * @param {HTMLDivElement} panel - The accordion item content panel
     */
    static removePanelHeight(panel) {
      panel.getAttribute('style'); // Fix Safari bug (doesn't remove attribute without this first!)
      panel.removeAttribute('style');
    }

    /**
     * Opens an accordion item
     * @param {HTMLDetailsElement} item - The accordion item
     * @param {HTMLDivElement} panel - The accordion item content panel
     */
    open(item, panel) {
      panel.style.height = '0';

      // Set item to open. Blocking the default click action and opening it this way prevents a
      // slight delay which causes the panel height to be set to '0' (because item's not open yet)
      item.open = true;

      AccordionInstance.addPanelHeight(panel);

      // Slight delay required before starting transitions
      setTimeout(() => {
        item.classList.add('is-open');
      }, 10);

      if (!this.allowMultiOpen) {
        // If there's an active item and it's not the opened item, close it
        if (this.activeItem && this.activeItem !== item) {
          const activePanel = this.activeItem.querySelector(this.panelClass);
          this.close(this.activeItem, activePanel);
        }

        this.activeItem = item;
      }
    }

    /**
     * Closes an accordion item
     * @param {HTMLDetailsElement} item - The accordion item
     * @param {HTMLDivElement} panel - The accordion item content panel
     */
    close(item, panel) {
      AccordionInstance.addPanelHeight(panel);

      item.classList.remove('is-open');
      item.classList.add('is-closing');

      if (this.activeItem === item) {
        this.activeItem = null;
      }

      // Slight delay required to allow scroll height to be applied before changing to '0'
      setTimeout(() => {
        panel.style.height = '0';
      }, 10);
    }

    /**
     * Handles 'click' event on the accordion
     * @param {Object} e - The event object
     */
    handleClick(e) {
      // Ignore clicks outside a toggle (<summary> element)
      const toggle = e.target.closest(this.titleClass);
      if (!toggle) return;

      // Prevent the default action
      // We'll trigger it manually after open transition initiated or close transition complete
      e.preventDefault();

      const item = toggle.parentNode;
      const panel = toggle.nextElementSibling;

      if (item.open) {
        this.close(item, panel);
      } else {
        this.open(item, panel);
      }
    }

    /**
     * Handles 'transitionend' event in the accordion
     * @param {Object} e - The event object
     */
    handleTransition(e) {
      // Ignore transitions not on a panel element
      if (!e.target.matches(this.panelClass)) return;

      const panel = e.target;
      const item = panel.parentNode;

      if (item.classList.contains('is-closing')) {
        item.classList.remove('is-closing');
        item.open = false;
      }

      AccordionInstance.removePanelHeight(panel);
    }

    bindEvents() {
      // Need to assign the function calls to variables because bind creates a new function,
      // which means the event listeners can't be removed in the usual way
      this.clickHandler = this.handleClick.bind(this);
      this.transitionHandler = this.handleTransition.bind(this);

      this.accordion.addEventListener('click', this.clickHandler);
      this.accordion.addEventListener('transitionend', this.transitionHandler);
    }

    destroy() {
      this.accordion.removeEventListener('click', this.clickHandler);
      this.accordion.removeEventListener('transitionend', this.transitionHandler);
    }
  }

  class Accordion extends ccComponent {
    constructor() {let name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'accordion';let cssSelector = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : `.cc-${name}`;
      super(name, cssSelector);
    }

    init(container) {
      super.init(container);
      this.registerInstance(container, new AccordionInstance(container));
    }

    destroy(container) {
      this.destroyInstance(container);
      super.destroy(container);
    }
  }

  new Accordion();
  (() => {
    theme.initAnimateOnScroll = function () {
      if (document.body.classList.contains('cc-animate-enabled') && window.innerWidth >= 768) {
        const animationTimeout = typeof document.body.dataset.ccAnimateTimeout !== "undefined" ? document.body.dataset.ccAnimateTimeout : 200;

        if ('IntersectionObserver' in window) {
          const intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
              // In view and hasn't been animated yet
              if (entry.isIntersecting && !entry.target.classList.contains("cc-animate-complete")) {
                setTimeout(() => {
                  entry.target.classList.add("-in", "cc-animate-complete");
                }, animationTimeout);

                setTimeout(() => {
                  //Once the animation is complete (assume 5 seconds), remove the animate attribute to remove all css
                  entry.target.classList.remove("data-cc-animate");
                  entry.target.style.transitionDuration = null;
                  entry.target.style.transitionDelay = null;
                }, 5000);

                // Remove observer after animation
                observer.unobserve(entry.target);
              }
            });
          });

          document.querySelectorAll('[data-cc-animate]:not(.cc-animate-init)').forEach((elem) => {
            //Set the animation delay
            if (elem.dataset.ccAnimateDelay) {
              elem.style.transitionDelay = elem.dataset.ccAnimateDelay;
            }

            ///Set the animation duration
            if (elem.dataset.ccAnimateDuration) {
              elem.style.transitionDuration = elem.dataset.ccAnimateDuration;
            }

            //Init the animation
            if (elem.dataset.ccAnimate) {
              elem.classList.add(elem.dataset.ccAnimate);
            }

            elem.classList.add("cc-animate-init");

            //Watch for elem
            intersectionObserver.observe(elem);
          });
        } else {
          //Fallback, load all the animations now
          const elems = document.querySelectorAll('[data-cc-animate]:not(.cc-animate-init)');
          for (let i = 0; i < elems.length; i++) {
            elems[i].classList.add("-in", "cc-animate-complete");
          }
        }
      }
    };

    theme.initAnimateOnScroll();

    document.addEventListener('shopify:section:load', () => {
      setTimeout(theme.initAnimateOnScroll, 100);
    });

    //Reload animations when changing from mobile to desktop
    try {
      window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
        if (event.matches) {
          setTimeout(theme.initAnimateOnScroll, 100);
        }
      });
    } catch (e) {}
  })();


  class GiftCardRecipient extends HTMLElement {
    constructor() {
      super();
      this.recipientCheckbox = null;
      this.recipientFields = null;
      this.recipientEmail = null;
      this.recipientName = null;
      this.recipientMessage = null;
      this.recipientSendOn = null;
      this.recipientOffsetProperty = null;
    }

    connectedCallback() {
      this.recipientEmail = this.querySelector('[name="properties[Recipient email]"]');
      this.recipientEmailLabel = this.querySelector(`label[for="${this.recipientEmail.id}"]`);
      this.recipientName = this.querySelector('[name="properties[Recipient name]"]');
      this.recipientMessage = this.querySelector('[name="properties[Message]"]');
      this.recipientSendOn = this.querySelector('[name="properties[Send on]"]');
      this.recipientOffsetProperty = this.querySelector('[name="properties[__shopify_offset]"]');

      // When JS is enabled, the recipientEmail field changes from optional to required
      // For themes using labels
      if (this.recipientEmailLabel && this.recipientEmailLabel.dataset.jsLabel) {
        this.recipientEmailLabel.innerText = this.recipientEmailLabel.dataset.jsLabel;
      }
      // For themes using placeholders
      if (this.recipientEmail.dataset.jsPlaceholder) {
        this.recipientEmail.placeholder = this.recipientEmail.dataset.jsPlaceholder;
        this.recipientEmail.ariaLabel = this.recipientEmail.dataset.jsAriaLabel;
      }

      // Set the timezone offset property input and enable it
      if (this.recipientOffsetProperty) {
        this.recipientOffsetProperty.value = new Date().getTimezoneOffset().toString();
        this.recipientOffsetProperty.removeAttribute('disabled');
      }

      this.recipientCheckbox = this.querySelector('.cc-gift-card-recipient__checkbox');
      this.recipientFields = this.querySelector('.cc-gift-card-recipient__fields');

      this.recipientCheckbox.addEventListener('change', () => this.synchronizeProperties());
      this.synchronizeProperties();
    }

    synchronizeProperties() {
      if (this.recipientCheckbox.checked) {
        this.recipientFields.style.display = 'block';
        // The 'required' attribute is not set in HTML because the recipientEmail field is optional when JS is disabled
        this.recipientEmail.setAttribute('required', '');
        this.recipientEmail.removeAttribute('disabled');
        this.recipientName.removeAttribute('disabled');
        this.recipientMessage.removeAttribute('disabled');
        this.recipientSendOn.removeAttribute('disabled');
        if (this.recipientOffsetProperty) {
          this.recipientOffsetProperty.removeAttribute('disabled');
        }
      } else {
        this.recipientFields.style.display = 'none';
        this.recipientEmail.removeAttribute('required');
        this.recipientEmail.setAttribute('disabled', '');
        this.recipientName.setAttribute('disabled', '');
        this.recipientMessage.setAttribute('disabled', '');
        this.recipientSendOn.setAttribute('disabled', '');
        if (this.recipientOffsetProperty) {
          this.recipientOffsetProperty.setAttribute('disabled', '');
        }
      }
    }
  }

  if (!window.customElements.get('gift-card-recipient')) {
    window.customElements.define('gift-card-recipient', GiftCardRecipient);
  }
  class ccPopup {
    constructor($container, namespace) {
      this.$container = $container;
      this.namespace = namespace;
      this.cssClasses = {
        visible: 'cc-popup--visible',
        bodyNoScroll: 'cc-popup-no-scroll',
        bodyNoScrollPadRight: 'cc-popup-no-scroll-pad-right'
      };
    }

    /**
     * Open popup on timer / local storage - move focus to input ensure you can tab to submit and close
     * Add the cc-popup--visible class
     * Update aria to visible
     */
    open(callback) {
      // Prevent the body from scrolling
      if (this.$container.data('freeze-scroll')) {
        clearTimeout(theme.ccPopupRemoveScrollFreezeTimeoutId);
        $('body').addClass(this.cssClasses.bodyNoScroll);

        // Add any padding necessary to the body to compensate for the scrollbar that just disappeared
        var scrollDiv = document.createElement('div');
        scrollDiv.className = 'popup-scrollbar-measure';
        document.body.appendChild(scrollDiv);
        var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        if (scrollbarWidth > 0) {
          $('body').css('padding-right', scrollbarWidth + 'px').addClass(this.cssClasses.bodyNoScrollPadRight);
        }
      }

      // Add reveal class
      this.$container.addClass(this.cssClasses.visible);

      // Track previously focused element
      this.previouslyActiveElement = document.activeElement;

      // Focus on the close button after the animation in has completed
      setTimeout(() => {
        this.$container.find('.cc-popup-close')[0].focus();
      }, 500);

      // Pressing escape closes the modal
      $(window).on('keydown' + this.namespace, (event) => {
        if (event.keyCode === 27) {
          this.close();
        }
      });

      if (callback) {
        callback();
      }
    }

    /**
     * Close popup on click of close button or background - where does the focus go back to?
     * Remove the cc-popup--visible class
     */
    close(callback) {
      // Remove reveal class
      this.$container.removeClass(this.cssClasses.visible);

      // Revert focus
      if (this.previouslyActiveElement) {
        $(this.previouslyActiveElement).focus();
      }

      // Destroy the escape event listener
      $(window).off('keydown' + this.namespace);

      // Allow the body to scroll and remove any scrollbar-compensating padding, if no other scroll-freeze popups are visible
      const $visibleFreezePopups = $('.' + this.cssClasses.visible).filter(() => {return this.$container.data('freeze-scroll');});
      if ($visibleFreezePopups.length === 0) {
        let transitionDuration = 500;

        const $innerModal = this.$container.find('.cc-popup-modal');
        if ($innerModal.length) {
          transitionDuration = parseFloat(getComputedStyle($innerModal[0])['transitionDuration']);
          if (transitionDuration && transitionDuration > 0) {
            transitionDuration *= 1000;
          }
        }

        theme.ccPopupRemoveScrollFreezeTimeoutId = setTimeout(() => {
          $('body').removeClass(this.cssClasses.bodyNoScroll).removeClass(this.cssClasses.bodyNoScrollPadRight).css('padding-right', '0');
        }, transitionDuration);
      }

      if (callback) {
        callback();
      }
    }
  };
  class PriceRangeInstance {
    constructor(container) {
      this.container = container;
      this.selectors = {
        inputMin: '.cc-price-range__input--min',
        inputMax: '.cc-price-range__input--max',
        control: '.cc-price-range__control',
        controlMin: '.cc-price-range__control--min',
        controlMax: '.cc-price-range__control--max',
        bar: '.cc-price-range__bar',
        activeBar: '.cc-price-range__bar-active'
      };
      this.controls = {
        min: {
          barControl: container.querySelector(this.selectors.controlMin),
          input: container.querySelector(this.selectors.inputMin)
        },
        max: {
          barControl: container.querySelector(this.selectors.controlMax),
          input: container.querySelector(this.selectors.inputMax)
        }
      };
      this.controls.min.value = parseInt(this.controls.min.input.value === '' ? this.controls.min.input.placeholder : this.controls.min.input.value);
      this.controls.max.value = parseInt(this.controls.max.input.value === '' ? this.controls.max.input.placeholder : this.controls.max.input.value);
      this.valueMin = this.controls.min.input.min;
      this.valueMax = this.controls.min.input.max;
      this.valueRange = this.valueMax - this.valueMin;

      [this.controls.min, this.controls.max].forEach((item) => {
        item.barControl.setAttribute('aria-valuemin', this.valueMin);
        item.barControl.setAttribute('aria-valuemax', this.valueMax);
        item.barControl.setAttribute('tabindex', 0);
      });
      this.controls.min.barControl.setAttribute('aria-valuenow', this.controls.min.value);
      this.controls.max.barControl.setAttribute('aria-valuenow', this.controls.max.value);

      this.bar = container.querySelector(this.selectors.bar);
      this.activeBar = container.querySelector(this.selectors.activeBar);
      this.inDrag = false;
      this.rtl = document.querySelector('html[dir=rtl]');

      this.bindEvents();
      this.render();
    }

    getPxToValueRatio() {
      const r = this.bar.clientWidth / (this.valueMax - this.valueMin);
      if (this.rtl) {
        return -r;
      } else {
        return r;
      }
    }

    getPcToValueRatio() {
      return 100.0 / (this.valueMax - this.valueMin);
    }

    setActiveControlValue(value) {
      // only accept valid numbers
      if (isNaN(parseInt(value))) return;

      // clamp & default
      if (this.activeControl === this.controls.min) {
        if (value === '') {
          value = this.valueMin;
        }
        value = Math.max(this.valueMin, value);
        value = Math.min(value, this.controls.max.value);
      } else {
        if (value === '') {
          value = this.valueMax;
        }
        value = Math.min(this.valueMax, value);
        value = Math.max(value, this.controls.min.value);
      }

      // round
      this.activeControl.value = Math.round(value);

      // update input
      if (this.activeControl.input.value != this.activeControl.value) {
        if (this.activeControl.value == this.activeControl.input.placeholder) {
          this.activeControl.input.value = '';
        } else {
          this.activeControl.input.value = this.activeControl.value;
        }
        this.activeControl.input.dispatchEvent(new CustomEvent('change', { bubbles: true, cancelable: false, detail: { sender: 'theme:component:price_range' } }));
      }

      // a11y
      this.activeControl.barControl.setAttribute('aria-valuenow', this.activeControl.value);
    }

    render() {
      this.drawControl(this.controls.min);
      this.drawControl(this.controls.max);
      this.drawActiveBar();
    }

    drawControl(control) {
      const x = (control.value - this.valueMin) * this.getPcToValueRatio() + '%';
      if (this.rtl) {
        control.barControl.style.right = x;
      } else {
        control.barControl.style.left = x;
      }
    }

    drawActiveBar() {
      const s = (this.controls.min.value - this.valueMin) * this.getPcToValueRatio() + '%',
        e = (this.valueMax - this.controls.max.value) * this.getPcToValueRatio() + '%';
      if (this.rtl) {
        this.activeBar.style.left = e;
        this.activeBar.style.right = s;
      } else {
        this.activeBar.style.left = s;
        this.activeBar.style.right = e;
      }
    }

    handleControlTouchStart(e) {
      e.preventDefault();
      this.startDrag(e.target, e.touches[0].clientX);
      this.boundControlTouchMoveEvent = this.handleControlTouchMove.bind(this);
      this.boundControlTouchEndEvent = this.handleControlTouchEnd.bind(this);
      window.addEventListener('touchmove', this.boundControlTouchMoveEvent);
      window.addEventListener('touchend', this.boundControlTouchEndEvent);
    }

    handleControlTouchMove(e) {
      this.moveDrag(e.touches[0].clientX);
    }

    handleControlTouchEnd(e) {
      e.preventDefault();
      window.removeEventListener('touchmove', this.boundControlTouchMoveEvent);
      window.removeEventListener('touchend', this.boundControlTouchEndEvent);
      this.stopDrag();
    }

    handleControlMouseDown(e) {
      e.preventDefault();
      this.startDrag(e.target, e.clientX);
      this.boundControlMouseMoveEvent = this.handleControlMouseMove.bind(this);
      this.boundControlMouseUpEvent = this.handleControlMouseUp.bind(this);
      window.addEventListener('mousemove', this.boundControlMouseMoveEvent);
      window.addEventListener('mouseup', this.boundControlMouseUpEvent);
    }

    handleControlMouseMove(e) {
      this.moveDrag(e.clientX);
    }

    handleControlMouseUp(e) {
      e.preventDefault();
      window.removeEventListener('mousemove', this.boundControlMouseMoveEvent);
      window.removeEventListener('mouseup', this.boundControlMouseUpEvent);
      this.stopDrag();
    }

    startDrag(target, startX) {
      if (this.controls.min.barControl === target) {
        this.activeControl = this.controls.min;
      } else {
        this.activeControl = this.controls.max;
      }
      this.dragStartX = startX;
      this.dragStartValue = this.activeControl.value;
      this.inDrag = true;
    }

    moveDrag(moveX) {
      if (this.inDrag) {
        let value = this.dragStartValue + (moveX - this.dragStartX) / this.getPxToValueRatio();
        this.setActiveControlValue(value);
        this.render();
      }
    }

    stopDrag() {
      this.inDrag = false;
    }

    handleControlKeyDown(e) {
      if (e.key === 'ArrowRight') {
        this.incrementControlFromKeypress(e.target, 10.0);
      } else if (e.key === 'ArrowLeft') {
        this.incrementControlFromKeypress(e.target, -10.0);
      }
    }

    incrementControlFromKeypress(control, pxAmount) {
      if (this.controls.min.barControl === control) {
        this.activeControl = this.controls.min;
      } else {
        this.activeControl = this.controls.max;
      }
      this.setActiveControlValue(this.activeControl.value + pxAmount / this.getPxToValueRatio());
      this.render();
    }

    handleInputChange(e) {
      // strip out non numeric values
      e.target.value = e.target.value.replace(/\D/g, '');

      if (!e.detail || e.detail.sender != 'theme:component:price_range') {
        if (this.controls.min.input === e.target) {
          this.activeControl = this.controls.min;
        } else {
          this.activeControl = this.controls.max;
        }
        this.setActiveControlValue(e.target.value);
        this.render();
      }
    }

    handleInputKeyup(e) {
      // enforce numeric chars in the input
      setTimeout(function () {
        this.value = this.value.replace(/\D/g, '');
      }.bind(e.target), 10);
    }

    bindEvents() {
      [this.controls.min, this.controls.max].forEach((item) => {
        item.barControl.addEventListener('touchstart', this.handleControlTouchStart.bind(this));
        item.barControl.addEventListener('mousedown', this.handleControlMouseDown.bind(this));
        item.barControl.addEventListener('keydown', this.handleControlKeyDown.bind(this));
        item.input.addEventListener('change', this.handleInputChange.bind(this));
        item.input.addEventListener('keyup', this.handleInputKeyup.bind(this));
      });
    }

    destroy() {
    }
  }

  class PriceRange extends ccComponent {
    constructor() {let name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'price-range';let cssSelector = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : `.cc-${name}`;
      super(name, cssSelector);
    }

    init(container) {
      super.init(container);
      this.registerInstance(container, new PriceRangeInstance(container));
    }

    destroy(container) {
      this.destroyInstance(container);
      super.destroy(container);
    }
  }

  new PriceRange();
  /**
   * Adjusts the css top property of an element such that it sticks appropriately based on the scroll direction. The
   * container is assumed to be position: sticky, with top: 0 (or whatever).
   *
   * When scrolling down, it'll stick to the bottom of the container, when scrolling up it'll stick to the top of
   * the container.
   */
  class StickyScrollDirectionInstance {
    constructor(container) {
      if (!container) {
        console.warn("StickyScrollDirection component: No container provided");
        return;
      }

      if (window.innerWidth >= 768) {
        this.container = container;
        this.currentTop = parseInt(getComputedStyle(this.container).top);
        this.defaultTop = this.currentTop;
        this.scrollY = window.scrollY;
        this.bindEvents();
      }
    }

    bindEvents() {
      this.scrollListener = this.handleScroll.bind(this);
      window.addEventListener('scroll', this.scrollListener);

      // Use the 'data-cc-sticky-scroll-top' attribute to update the defaultTop. Example use - if the container should
      // stick under the nav, but the nav changes height (either a result from a browser resize, or Theme Editor setting
      // tweak), set this attr the new nav height
      if (typeof this.container.dataset.ccStickyScrollTop !== "undefined") {
        this.observer = new MutationObserver((mutations) => {
          for (let mutation of mutations) {
            if (mutation.attributeName === "data-cc-sticky-scroll-top") {
              this.defaultTop = parseInt(mutation.target.dataset.ccStickyScrollTop);
            }
          }
        });
        this.observer.observe(this.container, { attributes: true });
      }
    }

    /**
     * Updates the current css top based on scroll direction
     */
    handleScroll() {
      const bounds = this.container.getBoundingClientRect();
      const maxTop = bounds.top + window.scrollY - this.container.offsetTop + this.defaultTop;
      const minTop = this.container.clientHeight - window.innerHeight;

      if (window.scrollY < this.scrollY) {
        this.currentTop -= window.scrollY - this.scrollY;
      } else {
        this.currentTop += this.scrollY - window.scrollY;
      }

      this.currentTop = Math.min(Math.max(this.currentTop, -minTop), maxTop, this.defaultTop);
      this.scrollY = window.scrollY;
      this.container.style.top = this.currentTop + "px";
    }

    destroy() {
      window.removeEventListener('scroll', this.scrollListener);
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }

  class StickyScrollDirection extends ccComponent {
    constructor() {let name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'sticky-scroll-direction';let cssSelector = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : `.cc-${name}`;
      super(name, cssSelector);
    }

    init(container) {
      super.init(container);
      this.registerInstance(container, new StickyScrollDirectionInstance(container));
    }

    destroy(container) {
      this.destroyInstance(container);
      super.destroy(container);
    }
  }

  new StickyScrollDirection();
  new class extends ccComponent {
    init(container) {
      super.init(container);

      const $container = $(container);

      //Emit's an event to indicate a tab is being changed. Also includes the difference in height
      //between the closing and opening tab
      function dispatchTabChangedEvent() {
        const event = new CustomEvent("cc-tab-changed");
        window.dispatchEvent(event);
      }

      $container.on('click', '[data-cc-toggle-panel]', function () {
        const $tabs = $(this).closest('.cc-tabs');
        const tabIndexToShow = $(this).data('cc-toggle-panel');
        let $tabToClose = $tabs.find('.cc-tabs__tab__panel:visible');
        const $tabToOpen = $tabs.find(`.cc-tabs__tab .cc-tabs__tab__panel[aria-labelledby="product-tab-panel${tabIndexToShow}"]`);
        const openAllTabs = $(this).closest('.cc-tabs[data-cc-tab-allow-multi-open="true"]').length;

        if ($tabs.hasClass('cc-tabs--tab-mode')) {
          $tabToClose.attr('hidden', '');
          $tabToOpen.removeAttr('hidden');
          $tabs.find('[role="tab"] [aria-selected="true"]').removeAttr('aria-selected');
          $tabs.find(`[data-cc-toggle-panel="${tabIndexToShow}"]`).attr('aria-selected', 'true');
        } else {
          const accordionSpeed = 300;

          if (!openAllTabs) {
            var tabNeedsClosing = $tabToClose.length;
            var tabNeedsOpening = $tabToOpen.attr('id') !== $tabToClose.attr('id') && $tabToOpen.length;

          } else {
            if ($tabToOpen.is(':visible')) {
              var tabNeedsClosing = true;
              var tabNeedsOpening = false;
              $tabToClose = $tabToOpen;
            } else {
              var tabNeedsClosing = false;
              var tabNeedsOpening = true;
            }
          }

          // On mobile, all accordions can be open at once
          if ($(window).outerWidth() < 768) {
            if ($tabToOpen.is(':visible')) {
              tabNeedsClosing = true;
              tabNeedsOpening = false;
              $tabToClose = $tabToOpen;
            } else {
              tabNeedsClosing = false;
            }
          }

          if (tabNeedsClosing) {
            $tabToClose.slideUp(accordionSpeed, function () {
              $(this).attr('hidden', '');
              if (!tabNeedsOpening) {
                dispatchTabChangedEvent();
              }
            });
            $tabToClose.prev().removeAttr('aria-selected');
          }

          if (tabNeedsOpening) {
            $tabToOpen.css('display', 'none').removeAttr('hidden').slideDown(accordionSpeed, dispatchTabChangedEvent);
            $tabToOpen.prev().attr('aria-selected', 'true');
          }
        }
        return false;
      });

      if ($container.hasClass('cc-tabs--tab-mode')) {
        $container.find('.cc-tabs__tab-headers').ccHoverLine();
      }
    }

    destroy(container) {
      super.destroy(container);
      $(container).off('click', '[data-cc-toggle-panel]');
    }
  }('tabs');


  // Manage videos
  theme.VideoManager = new function () {
    let _ = this;

    _.videos = {
      incrementor: 0,
      videoData: {}
    };

    _._loadYoutubeVideos = function (container) {
      $('.video-container[data-video-type="youtube"]:not(.video--init)', container).each(function () {
        $(this).addClass('video--init');
        _.videos.incrementor++;
        let containerId = 'theme-yt-video-' + _.videos.incrementor;
        $(this).data('video-container-id', containerId);
        let autoplay = $(this).data('video-autoplay');
        let loop = $(this).data('video-loop');
        let videoId = $(this).data('video-id');
        let isBackgroundVideo = $(this).hasClass('video-container--background');

        let ytURLSearchParams = new URLSearchParams('iv_load_policy=3&modestbranding=1&rel=0&showinfo=0&enablejsapi=1&playslinline=1');
        ytURLSearchParams.append('origin', location.origin);
        ytURLSearchParams.append('playlist', videoId);
        ytURLSearchParams.append('loop', loop ? 1 : 0);
        ytURLSearchParams.append('autoplay', 0);
        ytURLSearchParams.append('controls', isBackgroundVideo ? 0 : 1);
        let widgetid = _.videos.incrementor;
        ytURLSearchParams.append('widgetid', widgetid);

        let src = 'https://www.youtube.com/embed/' + videoId + '?' + ytURLSearchParams.toString();

        let $videoElement = $('<iframe class="video-container__video-element" frameborder="0" allowfullscreen="1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">').attr({
          id: containerId,
          width: 640,
          height: 360,
          tabindex: isBackgroundVideo ? '-1' : null
        }).appendTo($('.video-container__video', this));

        _.videos.videoData[containerId] = {
          type: 'yt',
          id: containerId,
          container: this,
          mute: () => $videoElement[0].contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*'),
          play: () => $videoElement[0].contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*'),
          pause: () => $videoElement[0].contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'),
          stop: () => $videoElement[0].contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*'),
          seekTo: (to) => $videoElement[0].contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${to},true]}`, '*'),
          videoElement: $videoElement[0],
          isBackgroundVideo: isBackgroundVideo,
          establishedYTComms: false
        };

        if (autoplay) {
          $videoElement.on('load', () => setTimeout(() => {
            // set up imitation JS API and watch for play event
            window.addEventListener('message', (message) => {
              if (message.origin === 'https://www.youtube.com' && message.data && typeof message.data === 'string') {
                let data = JSON.parse(message.data);

                if (data.event === 'initialDelivery' && data.info && data.info.duration) {
                  _.videos.videoData[containerId].duration = data.info.duration;
                }

                if (data.event === 'infoDelivery' && data.channel === 'widget' && data.id === widgetid) {
                  _.videos.videoData[containerId].establishedYTComms = true;
                  // playing - add class
                  if (data.info && data.info.playerState === 1) {
                    $(this).addClass('video-container--playing');
                  }

                  // loop if in final second
                  if (loop && data.info && data.info.currentTime > _.videos.videoData[containerId].duration - 1) {
                    _.videos.videoData[containerId].seekTo(0);
                  }
                }
              }
            });
            $videoElement[0].contentWindow.postMessage(`{"event":"listening","id":${widgetid},"channel":"widget"}`, '*');

            // mute and play
            _.videos.videoData[containerId].mute();
            _.videos.videoData[containerId].play();

            // if no message received in 2s, assume comms failure and that video is playing
            setTimeout(() => {
              if (!_.videos.videoData[containerId].establishedYTComms) {
                $(this).addClass('video-container--playing');
              }
            }, 2000);
          }, 100));
        }

        if (isBackgroundVideo) {
          $videoElement.attr('tabindex', '-1');
          _._initBackgroundVideo(_.videos.videoData[containerId]);

          // hack only needed for YT BG videos
          _.addYTPageshowListenerHack();
        }

        $videoElement.attr('src', src);

        fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent($(this).data('video-url'))).
        then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        }).
        then((response) => {
          if (response.width && response.height) {
            $videoElement.attr({ width: response.width, height: response.height });
            if (_.videos.videoData[containerId].assessBackgroundVideo) {
              _.videos.videoData[containerId].assessBackgroundVideo();
            }
          }
        });
      });
    };

    _._loadVimeoVideos = function (container) {
      $('.video-container[data-video-type="vimeo"]:not(.video--init)', container).each(function () {
        $(this).addClass('video--init');
        _.videos.incrementor++;
        var containerId = 'theme-vi-video-' + _.videos.incrementor;
        $(this).data('video-container-id', containerId);
        var autoplay = $(this).data('video-autoplay');
        let loop = $(this).data('video-loop');
        let videoId = $(this).data('video-id');
        let isBackgroundVideo = $(this).hasClass('video-container--background');

        let viURLSearchParams = new URLSearchParams();
        if (autoplay) {
          viURLSearchParams.append('muted', 1);
        }
        if (loop) {
          viURLSearchParams.append('loop', 1);
        }
        if (isBackgroundVideo) {
          viURLSearchParams.append('controls', 0);
        }

        let src = 'https://player.vimeo.com/video/' + videoId + '?' + viURLSearchParams.toString();

        let $videoElement = $('<iframe class="video-container__video-element" frameborder="0" allowfullscreen="1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">').attr({
          id: containerId,
          width: 640,
          height: 360,
          tabindex: isBackgroundVideo ? '-1' : null
        }).appendTo($('.video-container__video', this));

        _.videos.videoData[containerId] = {
          type: 'vimeo',
          id: containerId,
          container: this,
          play: () => $videoElement[0].contentWindow.postMessage('{"method":"play"}', '*'),
          pause: () => $videoElement[0].contentWindow.postMessage('{"method":"pause"}', '*'),
          videoElement: $videoElement[0],
          isBackgroundVideo: isBackgroundVideo,
          establishedVimeoComms: false
        };

        if (autoplay) {
          $videoElement.on('load', () => setTimeout(() => {
            // set up imitation JS API and watch for play event
            window.addEventListener('message', (message) => {
              if (message.origin !== 'https://player.vimeo.com') return;
              if (message.source !== $videoElement[0].contentWindow) return;
              if (!message.data) return;

              let data = message.data;
              if (typeof data === 'string') {
                data = JSON.parse(data);
              }

              if (data.method === 'ping' || data.event === 'playing') {
                _.videos.videoData[containerId].establishedVimeoComms = true;
              }

              if (data.event === 'playing') {
                $(this).addClass('video-container--playing');
              }
            });
            $videoElement[0].contentWindow.postMessage({ method: 'addEventListener', value: 'playing' }, '*');
            $videoElement[0].contentWindow.postMessage({ method: 'appendVideoMetadata', value: location.origin }, '*');
            $videoElement[0].contentWindow.postMessage({ method: 'ping' }, '*');

            // play video
            _.videos.videoData[containerId].play();

            // if no message received in 2s, assume comms failure and that video is playing
            setTimeout(() => {
              if (!_.videos.videoData[containerId].establishedVimeoComms) {
                $(this).addClass('video-container--playing');
              }
            }, 2000);
          }, 100));
        }

        if (isBackgroundVideo) {
          $videoElement.attr('tabindex', '-1');
          _._initBackgroundVideo(_.videos.videoData[containerId]);
        }

        $videoElement.attr('src', src);

        fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent($(this).data('video-url'))).
        then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        }).
        then((response) => {
          if (response.width && response.height) {
            $videoElement.attr({ width: response.width, height: response.height });
            if (_.videos.videoData[containerId].assessBackgroundVideo) {
              _.videos.videoData[containerId].assessBackgroundVideo();
            }
          }
        });
      });
    };

    _._loadMp4Videos = function (container) {
      $('.video-container[data-video-type="mp4"]:not(.video--init)', container).addClass('video--init').each(function () {
        _.videos.incrementor++;
        var containerId = 'theme-mp-video-' + _.videos.incrementor;
        var $container = $(this);
        $(this).data('video-container-id', containerId);
        var $videoElement = $('<div class="video-container__video-element">').attr('id', containerId).
        appendTo($('.video-container__video', this));
        var autoplay = $(this).data('video-autoplay');
        let isBackgroundVideo = $(this).hasClass('video-container--background');

        var $video = $('<video playsinline>');
        if ($(this).data('video-loop')) {
          $video.attr('loop', 'loop');
        }
        $video.on('click mouseenter', () => $video.attr('controls', 'controls'));
        if (autoplay) {
          $video.attr({ autoplay: 'autoplay', muted: 'muted' });
          $video[0].muted = true; // required by Chrome - ignores attribute
          $video.one('loadeddata', function () {
            this.play();
            $container.addClass('video-container--playing');
          });
        }

        if ($(this).data('video-url')) {
          $video.attr('src', $(this).data('video-url'));
        }
        if ($(this).data('video-sources')) {
          const sources = $(this).data('video-sources').split('|');
          for (let i = 0; i < sources.length; i++) {
            const [format, mimeType, url] = sources[i].split(' ');
            // only use HLS if not looping
            if (format === 'm3u8' && $(this).data('video-loop')) {
              continue;
            }
            $('<source>').attr({ src: url, type: mimeType }).appendTo($video);
          }
        }
        $video.appendTo($videoElement);

        const videoData = _.videos.videoData[containerId] = {
          type: 'mp4',
          element: $video[0],
          play: () => $video[0].play(),
          pause: () => $video[0].pause(),
          isBackgroundVideo: isBackgroundVideo
        };


        if (isBackgroundVideo) {
          $video.attr('tabindex', '-1');
          if (autoplay) {
            // Support playing background videos in low power mode
            container.addEventListener('click', videoData.play, { once: true });
          }
        }
      });
    };

    // background video placement for iframes
    _._initBackgroundVideo = function (videoData) {
      if (videoData.container.classList.contains('video-container--background')) {
        videoData.assessBackgroundVideo = function () {
          var cw = this.offsetWidth,
            ch = this.offsetHeight,
            cr = cw / ch,
            frame = this.querySelector('iframe'),
            vr = parseFloat(frame.width) / parseFloat(frame.height),
            pan = this.querySelector('.video-container__video'),
            vCrop = 75; // pushes video outside container to hide controls
          if (cr > vr) {
            var vh = cw / vr + vCrop * 2;
            pan.style.marginTop = (ch - vh) / 2 - vCrop + 'px';
            pan.style.marginInlineStart = '';
            pan.style.height = vh + vCrop * 2 + 'px';
            pan.style.width = '';
          } else {
            var ph = ch + vCrop * 2;
            var pw = ph * vr;
            pan.style.marginTop = -vCrop + 'px';
            pan.style.marginInlineStart = (cw - pw) / 2 + 'px';
            pan.style.height = ph + 'px';
            pan.style.width = pw + 'px';
          }
        }.bind(videoData.container);
        videoData.assessBackgroundVideo();
        $(window).on('debouncedresize.' + videoData.id, videoData.assessBackgroundVideo);

        // Support playing background videos in low power mode
        videoData.container.addEventListener('click', videoData.play, { once: true });
      }
    };

    _._unloadVideos = function (container) {
      for (let dataKey in _.videos.videoData) {
        let data = _.videos.videoData[dataKey];
        if ($(container).find(data.container).length) {
          delete _.videos.videoData[dataKey];
          return;
        }
      }
    };

    // Compatibility with Sections
    this.onSectionLoad = function (container) {
      // url only - infer type
      $('.video-container[data-video-url]:not([data-video-type])').each(function () {
        var url = $(this).data('video-url');

        if (url.indexOf('.mp4') > -1) {
          $(this).attr('data-video-type', 'mp4');
        }

        if (url.indexOf('vimeo.com') > -1) {
          $(this).attr('data-video-type', 'vimeo');
          $(this).attr('data-video-id', url.split('?')[0].split('/').pop());
        }

        if (url.indexOf('youtu.be') > -1 || url.indexOf('youtube.com') > -1) {
          $(this).attr('data-video-type', 'youtube');
          if (url.indexOf('v=') > -1) {
            $(this).attr('data-video-id', url.split('v=').pop().split('&')[0]);
          } else {
            $(this).attr('data-video-id', url.split('?')[0].split('/').pop());
          }
        }
      });

      _._loadYoutubeVideos(container);
      _._loadVimeoVideos(container);
      _._loadMp4Videos(container);

      // play button
      $('.video-container__play', container).on('click', function (evt) {
        evt.preventDefault();
        var $container = $(this).closest('.video-container');
        // reveal
        $container.addClass('video-container--playing');

        // broadcast a play event on the section container
        $container.trigger("cc:video:play");

        // play
        var id = $container.data('video-container-id');
        _.videos.videoData[id].play();
      });

      // modal close button
      $('.video-container__stop', container).on('click', function (evt) {
        evt.preventDefault();
        var $container = $(this).closest('.video-container');
        // hide
        $container.removeClass('video-container--playing');

        // broadcast a stop event on the section container
        $container.trigger("cc:video:stop");

        // stop
        var id = $container.data('video-container-id');
        _.videos.videoData[id].pause();
      });
    };

    this.onSectionUnload = function (container) {
      $('.video-container__play, .video-container__stop', container).off('click');
      $(window).off('.' + $('.video-container').data('video-container-id'));
      $(window).off('debouncedresize.video-manager-resize');
      _._unloadVideos(container);
      $(container).trigger("cc:video:stop");
    };

    _.addYTPageshowListenerHack = function () {
      if (!_.pageshowListenerAdded) {
        _.pageshowListenerAdded = true;
        window.addEventListener('pageshow', (event) => {
          if (event.persisted) {
            // A playing YT video shows a black screen when loaded from bfcache on iOS
            Object.keys(_.videos.videoData).
            filter((key) => _.videos.videoData[key].type === 'yt' && _.videos.videoData[key].isBackgroundVideo).
            forEach((key) => {
              _.videos.videoData[key].stop();
              _.videos.videoData[key].play();
            });
          }
        });
      }
    };
  }();

  // Register the section
  cc.sections.push({
    name: 'video',
    section: theme.VideoManager
  });
  theme.MapSection = new function () {
    var _ = this;
    _.config = {
      zoom: 14,
      styles: {
        default: [],
        silver: [{ "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] }, { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }, { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] }, { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] }, { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] }, { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }, { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] }, { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] }, { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] }, { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }, { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] }, { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] }, { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }],
        retro: [{ "elementType": "geometry", "stylers": [{ "color": "#ebe3cd" }] }, { "elementType": "labels.text.fill", "stylers": [{ "color": "#523735" }] }, { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f1e6" }] }, { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#c9b2a6" }] }, { "featureType": "administrative.land_parcel", "elementType": "geometry.stroke", "stylers": [{ "color": "#dcd2be" }] }, { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#ae9e90" }] }, { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] }, { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#93817c" }] }, { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#a5b076" }] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#447530" }] }, { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#f5f1e6" }] }, { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#fdfcf8" }] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#f8c967" }] }, { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#e9bc62" }] }, { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#e98d58" }] }, { "featureType": "road.highway.controlled_access", "elementType": "geometry.stroke", "stylers": [{ "color": "#db8555" }] }, { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#806b63" }] }, { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] }, { "featureType": "transit.line", "elementType": "labels.text.fill", "stylers": [{ "color": "#8f7d77" }] }, { "featureType": "transit.line", "elementType": "labels.text.stroke", "stylers": [{ "color": "#ebe3cd" }] }, { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] }, { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#b9d3c2" }] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#92998d" }] }],
        dark: [{ "elementType": "geometry", "stylers": [{ "color": "#212121" }] }, { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }, { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] }, { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] }, { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] }, { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }, { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] }, { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] }, { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] }, { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] }, { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] }, { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] }, { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] }, { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] }, { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }],
        night: [{ "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] }, { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] }, { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] }, { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] }, { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] }, { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] }, { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] }, { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] }, { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] }, { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] }, { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] }, { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }],
        aubergine: [{ "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] }, { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] }, { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] }, { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] }, { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#64779e" }] }, { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] }, { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{ "color": "#334e87" }] }, { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#023e58" }] }, { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#6f9ba5" }] }, { "featureType": "poi", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] }, { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#023e58" }] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#3C7680" }] }, { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] }, { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#2c6675" }] }, { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#255763" }] }, { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#b0d5ce" }] }, { "featureType": "road.highway", "elementType": "labels.text.stroke", "stylers": [{ "color": "#023e58" }] }, { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] }, { "featureType": "transit", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] }, { "featureType": "transit.line", "elementType": "geometry.fill", "stylers": [{ "color": "#283d6a" }] }, { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#3a4762" }] }, { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#4e6d70" }] }]
      }
    };
    _.apiStatus = null;

    this.geolocate = function ($map) {
      var deferred = $.Deferred();
      var geocoder = new google.maps.Geocoder();
      var address = $map.data('address-setting');

      geocoder.geocode({ address: address }, function (results, status) {
        if (status !== google.maps.GeocoderStatus.OK) {
          deferred.reject(status);
        }

        deferred.resolve(results);
      });

      return deferred;
    };

    this.createMap = function (container) {
      var $map = $('.map-section__map-container', container);

      return _.geolocate($map).
      then(
      function (results) {
        var mapOptions = {
          zoom: _.config.zoom,
          styles: _.config.styles[$(container).data('map-style')],
          center: results[0].geometry.location,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          disableDefaultUI: true,
          zoomControl: !$map.data('hide-zoom')
        };

        _.map = new google.maps.Map($map[0], mapOptions);
        _.center = _.map.getCenter();

        var marker = new google.maps.Marker({
          map: _.map,
          position: _.center,
          clickable: false
        });

        google.maps.event.addDomListener(window, 'resize', function () {
          google.maps.event.trigger(_.map, 'resize');
          _.map.setCenter(_.center);
        });
      }.bind(this)).

      fail(function () {
        var errorMessage;

        switch (status) {
          case 'ZERO_RESULTS':
            errorMessage = theme.strings.addressNoResults;
            break;
          case 'OVER_QUERY_LIMIT':
            errorMessage = theme.strings.addressQueryLimit;
            break;
          default:
            errorMessage = theme.strings.addressError;
            break;}


        // Only show error in the theme editor
        if (Shopify.designMode) {
          var $mapContainer = $map.parents('.map-section');

          $mapContainer.addClass('page-width map-section--load-error');
          $mapContainer.
          find('.map-section__wrapper').
          html(
          '<div class="errors text-center">' + errorMessage + '</div>');

        }
      });
    };

    this.onSectionLoad = function (target) {
      var $container = $(target);
      // Global function called by Google on auth errors
      window.gm_authFailure = function () {
        if (!Shopify.designMode) return;

        $container.addClass('page-width map-section--load-error');
        $container.
        find('.map-section__wrapper').
        html(
        '<div class="errors text-center">' + theme.strings.authError + '</div>');

      };

      // create maps
      var key = $container.data('api-key');

      if (typeof key !== 'string' || key === '') {
        return;
      }

      // load map
      theme.loadScriptOnce('https://maps.googleapis.com/maps/api/js?key=' + key, function () {
        _.createMap($container);
      });
    };

    this.onSectionUnload = function (target) {
      if (typeof window.google !== 'undefined' && typeof google.maps !== 'undefined') {
        google.maps.event.clearListeners(_.map, 'resize');
      }
    };
  }();

  // Register the section
  cc.sections.push({
    name: 'map',
    section: theme.MapSection
  });
  /**
   * Popup Section Script
   * ------------------------------------------------------------------------------
   *
   * @namespace Popup
   */

  theme.Popup = new function () {
    /**
     * Popup section constructor. Runs on page load as well as Theme Editor
     * `section:load` events.
     * @param {string} container - selector for the section container DOM element
     */

    var dismissedStorageKey = 'cc-theme-popup-dismissed';

    this.onSectionLoad = function (container) {
      this.namespace = theme.namespaceFromSection(container);
      this.$container = $(container);
      this.popup = new ccPopup(this.$container, this.namespace);

      var dismissForDays = this.$container.data('dismiss-for-days'),
        delaySeconds = this.$container.data('delay-seconds'),
        showPopup = true,
        testMode = this.$container.data('test-mode'),
        lastDismissed = window.localStorage.getItem(dismissedStorageKey);

      // Should we show it during this page view?
      // Check when it was last dismissed
      if (lastDismissed) {
        var dismissedDaysAgo = (new Date().getTime() - lastDismissed) / (1000 * 60 * 60 * 24);
        if (dismissedDaysAgo < dismissForDays) {
          showPopup = false;
        }
      }

      // Check for error or success messages
      if (this.$container.find('.cc-popup-form__response').length) {
        showPopup = true;
        delaySeconds = 1;

        // If success, set as dismissed
        if (this.$container.find('.cc-popup-form__response--success').length) {
          this.functions.popupSetAsDismissed.call(this);
        }
      }

      // Prevent popup on Shopify robot challenge page
      if (document.querySelector('.shopify-challenge__container')) {
        showPopup = false;
      }

      // Show popup, if appropriate
      if (showPopup || testMode) {
        setTimeout(() => {
          this.popup.open();
        }, delaySeconds * 1000);
      }

      // Click on close button or modal background
      this.$container.on('click' + this.namespace, '.cc-popup-close, .cc-popup-background', () => {
        this.popup.close(() => {
          this.functions.popupSetAsDismissed.call(this);
        });
      });
    };

    this.onSectionSelect = function () {
      this.popup.open();
    };

    this.functions = {
      /**
       * Use localStorage to set as dismissed
       */
      popupSetAsDismissed: function () {
        window.localStorage.setItem(dismissedStorageKey, new Date().getTime());
      }
    };

    /**
     * Event callback for Theme Editor `section:unload` event
     */
    this.onSectionUnload = function () {
      this.$container.off(this.namespace);
    };
  }();

  // Register section
  cc.sections.push({
    name: 'newsletter-popup',
    section: theme.Popup
  });
  /**
   * StoreAvailability Section Script
   * ------------------------------------------------------------------------------
   *
   * @namespace StoreAvailability
   */

  theme.StoreAvailability = function (container) {
    const loadingClass = 'store-availability-loading';
    const initClass = 'store-availability-initialized';
    const storageKey = 'cc-location';

    this.onSectionLoad = function (container) {
      this.namespace = theme.namespaceFromSection(container);
      this.$container = $(container);
      this.productId = this.$container.data('store-availability-container');
      this.sectionUrl = this.$container.data('section-url');
      this.$modal;

      this.$container.addClass(initClass);
      this.transitionDurationMS = parseFloat(getComputedStyle(container).transitionDuration) * 1000;
      this.removeFixedHeightTimeout = -1;

      // Handle when a variant is selected
      $(window).on(`cc-variant-updated${this.namespace}${this.productId}`, (e, args) => {
        if (args.product.id === this.productId) {
          this.functions.updateContent.bind(this)(
          args.variant ? args.variant.id : null,
          args.product.title,
          this.$container.data('has-only-default-variant'),
          args.variant && typeof args.variant.available !== "undefined");

        }
      });

      // Handle single variant products
      if (this.$container.data('single-variant-id')) {
        this.functions.updateContent.bind(this)(
        this.$container.data('single-variant-id'),
        this.$container.data('single-variant-product-title'),
        this.$container.data('has-only-default-variant'),
        this.$container.data('single-variant-product-available'));

      }
    };

    this.onSectionUnload = function () {
      $(window).off(`cc-variant-updated${this.namespace}${this.productId}`);
      this.$container.off('click');
      if (this.$modal) {
        this.$modal.off('click');
      }
    };

    this.functions = {
      // Returns the users location data (if allowed)
      getUserLocation: function () {
        return new Promise((resolve, reject) => {
          let storedCoords;

          if (sessionStorage[storageKey]) {
            storedCoords = JSON.parse(sessionStorage[storageKey]);
          }

          if (storedCoords) {
            resolve(storedCoords);

          } else {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
              function (position) {
                const coords = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };

                //Set the localization api
                fetch('/localization.json', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(coords)
                });

                //Write to a session storage
                sessionStorage[storageKey] = JSON.stringify(coords);

                resolve(coords);
              }, function () {
                resolve(false);
              }, {
                maximumAge: 3600000, // 1 hour
                timeout: 5000
              });

            } else {
              resolve(false);
            }
          }
        });
      },

      // Requests the available stores and calls the callback
      getAvailableStores: function (variantId, cb) {
        return $.get(this.sectionUrl.replace('VARIANT_ID', variantId), cb);
      },

      // Haversine Distance
      // The haversine formula is an equation giving great-circle distances between
      // two points on a sphere from their longitudes and latitudes
      calculateDistance: function (coords1, coords2, unitSystem) {
        var dtor = Math.PI / 180;
        var radius = unitSystem === 'metric' ? 6378.14 : 3959;

        var rlat1 = coords1.latitude * dtor;
        var rlong1 = coords1.longitude * dtor;
        var rlat2 = coords2.latitude * dtor;
        var rlong2 = coords2.longitude * dtor;

        var dlon = rlong1 - rlong2;
        var dlat = rlat1 - rlat2;

        var a =
        Math.pow(Math.sin(dlat / 2), 2) +
        Math.cos(rlat1) * Math.cos(rlat2) * Math.pow(Math.sin(dlon / 2), 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return radius * c;
      },

      // Updates the existing modal pickup with locations with distances from the user
      updateLocationDistances: function (coords) {
        const unitSystem = this.$modal.find('[data-unit-system]').data('unit-system');
        const self = this;

        this.$modal.find('[data-distance="false"]').each(function () {
          const thisCoords = {
            latitude: parseFloat($(this).data('latitude')),
            longitude: parseFloat($(this).data('longitude'))
          };

          if (thisCoords.latitude && thisCoords.longitude) {
            const distance = self.functions.calculateDistance(
            coords, thisCoords, unitSystem).toFixed(1);

            $(this).html(distance);

            //Timeout to trigger animation
            setTimeout(() => {
              $(this).closest('.store-availability-list__location__distance').addClass('-in');
            }, 0);
          }

          $(this).attr('data-distance', 'true');
        });
      },

      // Requests the available stores and updates the page with info below Add to Basket, and append the modal to the page
      updateContent: function (variantId, productTitle, isSingleDefaultVariant, isVariantAvailable) {
        this.$container.off('click', '[data-store-availability-modal-open]');
        this.$container.off('click' + this.namespace, '.cc-popup-close, .cc-popup-background');
        $('.store-availabilities-modal').remove();

        if (!isVariantAvailable) {
          //If the variant is Unavailable (not the same as Out of Stock) - hide the store pickup completely
          this.$container.addClass(loadingClass);
          if (this.transitionDurationMS > 0) {
            this.$container.css('height', '0px');
          }
        } else {
          this.$container.addClass(loadingClass);
          if (this.transitionDurationMS > 0) {
            this.$container.css('height', this.$container.outerHeight() + 'px');
          }
        }

        if (isVariantAvailable) {
          this.functions.getAvailableStores.call(this, variantId, (response) => {
            if (response.trim().length > 0 && !response.includes('NO_PICKUP')) {
              this.$container.html(response);
              this.$container.html(this.$container.children().first().html()); // editor bug workaround

              this.$container.find('[data-store-availability-modal-product-title]').html(productTitle);

              if (isSingleDefaultVariant) {
                this.$container.find('.store-availabilities-modal__variant-title').remove();
              }

              this.$container.find('.cc-popup').appendTo('body');

              this.$modal = $('body').find('.store-availabilities-modal');
              const popup = new ccPopup(this.$modal, this.namespace);

              this.$container.on('click', '[data-store-availability-modal-open]', () => {
                popup.open();

                //When the modal is opened, try and get the users location
                this.functions.getUserLocation().then((coords) => {
                  if (coords && this.$modal.find('[data-distance="false"]').length) {
                    //Re-retrieve the available stores location modal contents
                    this.functions.getAvailableStores.call(this, variantId, (response) => {
                      this.$modal.find('.store-availabilities-list').html($(response).find('.store-availabilities-list').html());
                      this.functions.updateLocationDistances.bind(this)(coords);
                    });
                  }
                });

                return false;
              });

              this.$modal.on('click' + this.namespace, '.cc-popup-close, .cc-popup-background', () => {
                popup.close();
              });

              this.$container.removeClass(loadingClass);

              if (this.transitionDurationMS > 0) {
                let newHeight = this.$container.find('.store-availability-container').outerHeight();
                this.$container.css('height', newHeight > 0 ? newHeight + 'px' : '');
                clearTimeout(this.removeFixedHeightTimeout);
                this.removeFixedHeightTimeout = setTimeout(() => {
                  this.$container.css('height', '');
                }, this.transitionDurationMS);
              }
            }
          });
        }
      }
    };

    // Initialise the section when it's instantiated
    this.onSectionLoad(container);
  };

  // Register section
  cc.sections.push({
    name: 'store-availability',
    section: theme.StoreAvailability
  });


  // ensure root_url ends in a slash
  if (!/\/$/.test(theme.routes.root_url)) theme.routes.root_url += '/';

  /*================ General Barry Bits ================*/
  class LocalStorageUtil {
    static set(key, value) {
      if (theme.device.isLocalStorageAvailable()) {
        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    static get(key, isJson) {
      if (theme.device.isLocalStorageAvailable()) {
        let value = localStorage.getItem(key);
        if (isJson) {
          value = JSON.parse(value);
        }
        return value;
      } else {
        return;
      }
    }
  }
  ;

  theme.addDelegateEventListener = function (element, eventName, selector, callback) {let addEventListenerParams = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    let cb = (evt) => {
      let el = evt.target.closest(selector);
      if (!el) return;
      if (!element.contains(el)) return;
      callback.call(el, evt, el);
    };
    element.addEventListener(eventName, cb, addEventListenerParams);
  };

  theme.hideAndRemove = (el) => {
    // disable
    el.querySelectorAll('input').forEach((input) => {input.disabled = true;});

    // wrap
    const wrapper = document.createElement('div');
    wrapper.className = 'merge-remove-wrapper';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    el.classList.add('merge-remove-item');
    wrapper.style.height = `${wrapper.clientHeight}px`;

    const cs = getComputedStyle(el);
    const fadeDuration = parseFloat(cs.getPropertyValue('--fade-duration')) * 1000;
    const slideDuration = parseFloat(cs.getPropertyValue('--slide-duration')) * 1000;

    setTimeout(() => {
      wrapper.classList.add('merge-remove-wrapper--fade');

      setTimeout(() => {
        wrapper.classList.add('merge-remove-wrapper--slide');

        setTimeout(() => wrapper.remove(), slideDuration);
      }, fadeDuration);
    }, 10);
  };

  theme.insertAndReveal = (el, target, iaeCmd, delay) => {
    const initialDelay = delay || 10;
    el.classList.add('merge-add-wrapper');
    target.insertAdjacentElement(iaeCmd, el);
    el.style.height = `${el.firstElementChild.clientHeight}px`;

    const cs = getComputedStyle(el);
    const fadeDuration = parseFloat(cs.getPropertyValue('--fade-duration')) * 1000;
    const slideDuration = parseFloat(cs.getPropertyValue('--slide-duration')) * 1000;

    setTimeout(() => {
      el.classList.add('merge-add-wrapper--slide');

      setTimeout(() => {
        el.classList.add('merge-add-wrapper--fade');

        setTimeout(() => {
          // tidy up
          el.style.height = '';
          el.classList.remove('merge-add-wrapper', 'merge-add-wrapper--slide', 'merge-add-wrapper--fade');
        }, fadeDuration);
      }, slideDuration);
    }, initialDelay);
  };

  theme.mergeNodes = (newContent, targetContainer) => {
    try {
      // merge: replace content if changed
      newContent.querySelectorAll('[data-merge]').forEach((newEl) => {
        const targetEl = targetContainer.querySelector(`[data-merge="${newEl.dataset.merge}"]`);
        if (!newEl.dataset.mergeCache || !targetEl.dataset.mergeCache || newEl.dataset.mergeCache !== targetEl.dataset.mergeCache) {
          targetEl.innerHTML = newEl.innerHTML;
          if (newEl.dataset.mergeCache || targetEl.dataset.mergeCache) {
            targetEl.dataset.mergeCache = newEl.dataset.mergeCache;
          }
        }
      });
      // merge: attributes only
      newContent.querySelectorAll('[data-merge-attributes]').forEach((newEl) => {
        const targetEl = targetContainer.querySelector(`[data-merge-attributes="${newEl.dataset.mergeAttributes}"]`);
        for (const attr of newEl.attributes) {
          targetEl.setAttribute(attr.localName, attr.value);
        }
      });
      // merge: insert/remove/replace in list
      newContent.querySelectorAll('[data-merge-list]').forEach((newList) => {
        const targetList = targetContainer.querySelector(`[data-merge-list="${newList.dataset.mergeList}"]`);
        let targetListItems = Array.from(targetList.querySelectorAll('[data-merge-list-item]'));
        const newListItems = Array.from(newList.querySelectorAll('[data-merge-list-item]'));

        // remove
        targetListItems.forEach((targetListItem) => {
          let matchedItem = newListItems.find((item) => item.dataset.mergeListItem == targetListItem.dataset.mergeListItem);
          if (!matchedItem) {
            theme.hideAndRemove(targetListItem);
          }
        });

        // rebuild target list excluding removed items
        targetListItems = Array.from(targetList.querySelectorAll('[data-merge-list-item]:not(.merge-remove-item)'));

        for (let i = 0; i < newListItems.length; i++) {
          let newListItem = newListItems[i];
          let matchedItem = targetListItems.find((item) => item.dataset.mergeListItem == newListItem.dataset.mergeListItem);
          if (matchedItem) {
            // replace if changed
            if (!newListItem.dataset.mergeCache || !matchedItem.dataset.mergeCache || newListItem.dataset.mergeCache !== matchedItem.dataset.mergeCache) {
              matchedItem.innerHTML = newListItem.innerHTML;
              if (newListItem.dataset.mergeCache) {
                matchedItem.dataset.mergeCache = newListItem.dataset.mergeCache;
              }
            }
          } else {
            // add
            if (i === 0) {
              // first place
              theme.insertAndReveal(newListItem, targetList, 'afterbegin', 500);
            } else if (i >= targetListItems.length) {
              // at end
              theme.insertAndReveal(newListItem, targetList, 'beforeend', 500);
            } else {
              // before element currently at that index
              theme.insertAndReveal(newListItem, targetListItems[i], 'beforebegin', 500);
            }
            // update target list
            targetListItems.splice(i, 0, newListItem);
          }
        }
      });
    } catch {
      location.reload();
    }
  };
  ;
  theme.icons = {
    left: '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
    right: '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>',
    close: '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/><path d="M0 0h24v24H0z" fill="none"/></svg>',
    chevronLightLeft: '<svg fill="#000000" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M 14.51,6.51 14,6 8,12 14,18 14.51,17.49 9.03,12 Z"></path></svg>',
    chevronLightRight: '<svg fill="#000000" viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M 10,6 9.49,6.51 14.97,12 9.49,17.49 10,18 16,12 Z"></path></svg>',
    chevronDown: '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 7.84L12 12.42l4.59-4.58L18 9.25l-6 6-6-6z"/><path d="M0-.75h24v24H0z" fill="none"/></svg>',
    tick: '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    add: '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/><path d="M0 0h24v24H0z" fill="none"/></svg>',
    loading: '<svg xmlns="http://www.w3.org/2000/svg" style="margin: auto; background: transparent; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" fill="none" stroke="currentColor" stroke-width="5" r="35" stroke-dasharray="164.93361431346415 56.97787143782138" transform="rotate(263.279 50 50)"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform></circle></svg>',
    chevronRight: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0-.25H24v24H0Z" transform="translate(0 0.25)" style="fill:none"></path><polyline points="10 17.83 15.4 12.43 10 7.03" style="fill:none;stroke:currentColor;stroke-linecap:round;stroke-miterlimit:8;stroke-width:1.5px"></polyline></svg>',
    chevronLeft: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0-.25H24v24H0Z" transform="translate(0 0.25)" style="fill:none"/> <polyline points="14.4 7.03 9 12.43 14.4 17.83" style="fill:none;stroke:currentColor;stroke-linecap:round;stroke-miterlimit:8;stroke-width:1.5px"/></svg>'
  };

  theme.swipers = {};

  theme.productData = {};

  theme.viewport = {
    isXs: () => {
      return $(window).outerWidth() < 768;
    },
    isSm: () => {
      return $(window).outerWidth() >= 768;
    },
    isMd: () => {
      return $(window).outerWidth() >= 992;
    },
    isLg: () => {
      return $(window).outerWidth() >= 1200;
    },
    isXlg: () => {
      return $(window).outerWidth() >= 1441;
    },
    scroll: {
      currentScrollTop: -1,

      to: function ($elem) {let scrollTop = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;let offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;let cb = arguments.length > 3 ? arguments[3] : undefined;
        if ($elem && typeof $elem === 'string') {
          $elem = $($elem);
        }

        if (scrollTop === -1 && $elem && $elem.length) {
          const navHeight = theme.Nav().bar.isInline() ? 0 : theme.Nav().bar.height();
          scrollTop = $elem.offset().top - navHeight - offset;
        }

        $('html,body').animate({ scrollTop }, 700, () => {
          if (cb) {
            cb();
          }
        });
      },

      // Locks scrolling on the body in place
      lock: () => {
        theme.viewport.scroll.currentScrollTop = window.scrollY;

        //Set the body top to the current scroll position so we dont get jumped to the top
        document.body.style.top = -window.scrollY + 'px';
        document.body.style.width = '100%';
        document.body.style.position = 'fixed';

        if (document.body.scrollHeight > window.outerHeight) {
          //There is a vertical scrollbar, compensate for that
          document.body.style.overflowY = 'scroll';
        }
      },

      unlock: () => {
        document.body.style.top = null;
        document.body.style.overflowY = null;
        document.body.style.width = null;
        document.body.style.position = null;
        window.scrollTo({ top: theme.viewport.scroll.currentScrollTop, behavior: 'instant' });
      }
    }
    // ,
    // isElementInView: (el) => {
    //   // Special bonus for those using jQuery
    //   if (typeof jQuery === "function" && el instanceof jQuery) {
    //     el = el[0];
    //   }
    //
    //   var rect = el.getBoundingClientRect();
    //
    //   return (
    //     rect.top >= 0 &&
    //     rect.left >= 0 &&
    //     rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    //     rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    //   );
    // },
  };

  theme.device = {
    cache: {
      isTouch: null,
      isRetinaDisplay: null
    },
    isTouch: () => {
      if (theme.device.cache.isTouch !== null) {
        return theme.device.cache.isTouch;
      } else {
        try {
          document.createEvent("TouchEvent");
          theme.device.cache.isTouch = true;
        } catch (e) {
          theme.device.cache.isTouch = false;
        } finally {
          return theme.device.cache.isTouch;
        }
      }
    },
    isRetinaDisplay() {
      if (theme.device.cache.isRetinaDisplay !== null) {
        return theme.device.cache.isRetinaDisplay;
      } else {
        if (window.matchMedia) {
          const mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
          theme.device.cache.isRetinaDisplay = mq && mq.matches || window.devicePixelRatio > 1;
        } else {
          theme.device.cache.isRetinaDisplay = false;
        }
        return theme.device.cache.isRetinaDisplay;
      }
    },
    isLocalStorageAvailable() {
      try {
        localStorage.setItem('a', 'a');
        localStorage.removeItem('a');
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest =
    function (s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
        i,
        el = this;
      do {
        i = matches.length;
        while (--i >= 0 && matches.item(i) !== el) {};
      } while (i < 0 && (el = el.parentElement));
      return el;
    };
  }
  ;

  /*================ Components ================*/
  const CartForm = class extends HTMLElement {
    connectedCallback() {
      theme.cartNoteMonitor.load($('[name="note"]', this));
      this.enableAjaxUpdate = this.dataset.ajaxUpdate;

      if (this.enableAjaxUpdate) {
        this.sectionId = this.dataset.sectionId;

        this.boundRefresh = (evt) => {
          this.refresh(evt.detail);
        };

        document.addEventListener('theme:cartchanged', this.boundRefresh);

        theme.addDelegateEventListener(this, 'click', '.cart-item__remove', (evt) => {
          evt.preventDefault();
          this.adjustItemQuantity(evt.target.closest('.cart-item'), { to: 0 });
        });

        theme.addDelegateEventListener(this, 'click', '.quantity-down', (evt) => {
          evt.preventDefault();
          this.adjustItemQuantity(evt.target.closest('.cart-item'), { decrease: true });
        });

        theme.addDelegateEventListener(this, 'click', '.quantity-up', (evt) => {
          evt.preventDefault();
          this.adjustItemQuantity(evt.target.closest('.cart-item'), { increase: true });
        });

        theme.addDelegateEventListener(this, 'change', '.cart-item__quantity-input', (evt) => {
          this.adjustItemQuantity(evt.target.closest('.cart-item'), { currentValue: true });
        });
      }
    }

    disconnectedCallback() {
      theme.cartNoteMonitor.unload($('[name="note"]', this));

      if (this.enableAjaxUpdate) {
        document.removeEventListener('theme:cartchanged', this.boundRefresh);
      }
    }

    refresh() {
      this.classList.add('cart-form--refreshing');
      fetch(`${window.Shopify.routes.root}?section_id=${this.sectionId}`).
      then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      }).
      then((response) => {
        let frag = document.createDocumentFragment(),
          newContent = document.createElement('div');

        frag.appendChild(newContent);
        newContent.innerHTML = response;

        newContent.querySelectorAll('[data-cc-animate]').forEach((el) => el.removeAttribute('data-cc-animate'));

        theme.mergeNodes(newContent, this);

        // correct line indexes
        Array.from(this.querySelectorAll('.cart-item__quantity-input')).
        filter((el) => !el.closest('.merge-remove-item')).
        forEach((el, index) => {
          el.dataset.lineIndex = index + 1;
          el.closest('.cart-item').dataset.index = index + 1;
        });

        this.classList.remove('cart-form--refreshing');
        this.querySelectorAll('.merge-item-refreshing').forEach((el) => el.classList.remove('merge-item-refreshing'));

        theme.cartNoteMonitor.load($('[name="note"]', this));
      });
    }

    adjustItemQuantity(item, change) {
      const quantityInput = item.querySelector('.cart-item__quantity-input');
      let newQuantity = parseInt(quantityInput.value);

      if (typeof change.to !== 'undefined') {
        newQuantity = change.to;
      } else if (change.increase) {
        newQuantity += quantityInput.step || 1;
      } else if (change.decrease) {
        newQuantity -= quantityInput.step || 1;
      }

      if (quantityInput.max && newQuantity > parseInt(quantityInput.max)) {
        newQuantity = parseInt(quantityInput.max);
      }

      // Set new quantity, then check if inventory quantity allows it. If not, set it back to its initial value
      quantityInput.value = newQuantity;

      clearTimeout(this.adjustItemQuantityTimeout);
      this.adjustItemQuantityTimeout = setTimeout(() => {var _this$querySelector;
        this.querySelectorAll('.cart-item__quantity-input:not([disabled])').forEach((el) => {
          if (el.value != el.dataset.initialValue) {
            el.closest('[data-merge-list-item]').classList.add('merge-item-refreshing');
          }
        });

        (_this$querySelector = this.querySelector('.cart-list')) === null || _this$querySelector === void 0 ? void 0 : _this$querySelector.classList.add('cart-list--loading');

        fetch(`${window.Shopify.routes.root}cart/change.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ line: quantityInput.dataset.lineIndex, quantity: newQuantity })
        }).
        then((response) => {
          if (!response.ok) {
            throw response;
          }
          document.dispatchEvent(
          new CustomEvent('theme:cartchanged', { bubbles: true, cancelable: false }));


          // Update cart icon
          $.get(theme.routes.cart_url, function (data) {
            var cartUpdateSelector = '#site-control .cart:not(.nav-search)';
            var $newCartObj = $($.parseHTML('<div>' + data + '</div>')).find(cartUpdateSelector);
            $(cartUpdateSelector).each(function (index) {
              $($newCartObj[index]).find('[data-cc-animate]').removeAttr('data-cc-animate');
              $(this).replaceWith($newCartObj[index]);
            });
          });
        }).
        catch((error) => {
          if (error instanceof Response) {
            error.text().then((errorText) => {
              try {
                quantityInput.value = quantityInput.dataset.initialValue;

                const errorMessage = JSON.parse(errorText).message;
                const errorContainer = item.querySelector('.error-message');
                errorContainer.innerText = errorMessage;

                const slideDownAndFadeIn = () => {
                  errorContainer.style.display = 'block';
                  errorContainer.style.transition = 'height 0.5s ease-out, opacity 0.5s ease-out';
                  errorContainer.offsetHeight;
                  errorContainer.style.height = errorContainer.scrollHeight + 'px';
                  errorContainer.style.opacity = '1';
                };

                slideDownAndFadeIn();

                setTimeout(() => {
                  errorContainer.style.height = '0';
                  errorContainer.style.opacity = '0';

                  setTimeout(() => {
                    errorContainer.style.display = 'none';
                  }, 500);

                }, 8000);
              } catch (parseError) {
                console.log('Error parsing JSON:', parseError);
              }
            });
          }
        }).
        finally(() => {var _this$querySelector2;
          this.querySelectorAll('.merge-item-refreshing').forEach((el) => {
            el.classList.remove('merge-item-refreshing');
          });
          (_this$querySelector2 = this.querySelector('.cart-list')) === null || _this$querySelector2 === void 0 ? void 0 : _this$querySelector2.classList.remove('cart-list--loading');
        });
      }, newQuantity === 0 ? 10 : 700);
    }
  };

  window.customElements.define('cart-form', CartForm);
  ;
  const CCFetchedContent = class extends HTMLElement {
    connectedCallback() {
      fetch(this.dataset.url).
      then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      }).
      then((response) => {
        let frag = document.createDocumentFragment(),
          fetchedContent = document.createElement('div');
        frag.appendChild(fetchedContent);
        fetchedContent.innerHTML = response;

        let replacementContent = fetchedContent.querySelector(`[data-id="${CSS.escape(this.dataset.id)}"]`);
        if (replacementContent) {
          this.innerHTML = replacementContent.innerHTML;

          if (this.hasAttribute('contains-product-blocks')) {
            const swiperCont = this.querySelector('.swiper-container');
            if (swiperCont) {
              theme.initProductSlider($(swiperCont));
            }
          }
        }
      });
    }
  };

  window.customElements.define('cc-fetched-content', CCFetchedContent);
  ;
  theme.Nav = function () {let $navBar = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : $('#site-control');
    return {
      bar: {
        //Actions
        turnOpaque: (turnOpaque) => {
          if (turnOpaque) {
            $navBar.addClass('nav-opaque');
          } else {
            $navBar.removeClass('nav-opaque');
          }
        },
        hide: (hide) => {
          if (hide) {
            $navBar.addClass('nav-hidden');
          } else {
            $navBar.removeClass('nav-hidden');
          }
        },
        fadeOut: (fadeOut) => {
          if (fadeOut) {
            $navBar.addClass('nav-fade-out');
          } else {
            $navBar.removeClass('nav-fade-out');
          }
        },
        hideAnnouncement: (hide) => {
          if (hide) {
            $navBar.addClass('announcement-hidden');
          } else {
            $navBar.removeClass('announcement-hidden');
          }
        },

        //Note: Don't reference $navBar below as the object may have changed (if in theme editor)

        //Settings
        hasOpaqueSetting: () => {
          return $('#site-control').data('opacity').includes('opaque');
        },
        hasStickySetting: () => {
          return $('#site-control').data('positioning') === "sticky";
        },
        isInline: () => {
          return $('#site-control').data('positioning') === "inline";
        },
        hasInlineLinks: () => {
          return $('#site-control.nav-inline-desktop').length === 1;
        },
        getPositionSetting: () => {
          return $('#site-control').data('positioning');
        },
        getOpacitySetting: () => {
          return $('#site-control').data('opacity');
        },

        //Current state
        isCurrentlyOpaque: () => {
          return $('#site-control').hasClass('nav-opaque');
        },
        isAnnouncementBar: () => {
          return $('#site-control').find('.cc-announcement__inner').length === 1;
        },
        hasLocalization: () => {
          return $('#site-control').hasClass('has-localization');
        },
        heightExcludingAnnouncementBar: () => {
          return Math.round($('#site-control').find('.site-control__inner').outerHeight());
        },
        heightOfAnnouncementBar: () => {
          return Math.round($('#site-control').find('.announcement').outerHeight());
        },
        height: () => {
          //Returns the height including the announcement bar
          const $nav = $('#site-control');
          let height;
          if ($nav.hasClass('announcement-hidden') && $nav.find('.cc-announcement__inner').length) {
            height = Math.round($nav.find('.cc-announcement__inner').outerHeight() + $nav.find('.site-control__inner').outerHeight());
          } else {
            height = Math.round($nav.outerHeight());
          }
          return height;
        }
      }
    };
  };

  theme.ProductMediaGallery = function ($gallery, $thumbs, isFeaturedProduct, isQuickbuy, galleryId) {
    var _this = this;
    var currentMedia;
    var initialisedMedia = {};
    var $viewInSpaceButton = $gallery.find('.view-in-space');
    var $swiperCont = $gallery.find('.swiper-container');
    var swiper;
    var preventSizeRedraw = false;
    var vimeoApiReady = false;
    var isFirstRun = true;
    var mediaCount = $gallery.find('.theme-img:visible').length;
    var isCarouselLayout = $gallery.data('layout') === 'carousel';
    var isGalleryNarrow = $gallery.closest('.product-area').hasClass('product-area--restrict-width');
    var $productThumbnails = $gallery.closest('.product-area').find('.product-area__thumbs');
    var isMediaGroupingEnabled = $gallery.data('variant-image-grouping');
    var underlineSelectedMedia = $gallery.data('underline-selected-media');

    const nav = theme.Nav();

    this.Image = function ($elem, autoplay) {
      this.show = function () {
        $elem.addClass('product-media--activated');
        $elem.show();
      };

      this.play = function () {
        $gallery.find('.product-media--current').removeClass('product-media--current');
        $elem.addClass('product-media--current');
      };

      this.destroy = function () {};
      this.pause = function () {
        $elem.removeClass('product-media--activated');
      };

      this.hide = function () {
        $elem.hide();
      };

      //Init the image
      this.show();
    };

    this.Video = function ($elem, autoplay) {
      var _video = this;
      var playerObj = {
        play: function () {},
        pause: function () {},
        destroy: function () {}
      };
      var videoElement = $elem.find('video')[0];

      this.show = function () {
        $elem.addClass('product-media--activated');
        $elem.show();
        _this.slideshowTabFix();
      };

      this.play = function () {
        $gallery.find('.product-media--current').removeClass('product-media--current');
        $elem.addClass('product-media--current');
        _video.show();
        playerObj.play();
      };

      this.pause = function () {
        playerObj.pause();
        $elem.removeClass('product-media--activated');
      };

      this.hide = function () {
        playerObj.pause();
        $elem.hide();
      };

      this.destroy = function () {
        playerObj.destroy();
        $(videoElement).off('playing', handlePlay);
        $(document).off('fullscreenchange', delayedSwiperResize);
      };

      //Init the video
      theme.loadStyleOnce('https://cdn.shopify.com/shopifycloud/shopify-plyr/v1.0/shopify-plyr.css');

      // set up a controller for Plyr video
      window.Shopify.loadFeatures([{
        name: 'video-ui',
        version: '1.0',
        onLoad: function () {
          playerObj = {
            playerType: 'html5',
            element: videoElement,
            plyr: new Shopify.Plyr(videoElement, {
              controls: [
              'play',
              'progress',
              'mute',
              'volume',
              'play-large',
              'fullscreen'],

              loop: {
                active: $elem.data('enable-video-looping')
              },
              autoplay: theme.viewport.isSm() && autoplay,
              hideControlsOnPause: true,
              iconUrl: '//cdn.shopify.com/shopifycloud/shopify-plyr/v1.0/shopify-plyr.svg',
              tooltips: {
                controls: false,
                seek: true
              }
            }),
            play: function () {
              this.plyr.play();
            },
            pause: function () {
              this.plyr.pause();
            },
            destroy: function () {
              this.plyr.destroy();
            }
          };
          $elem.addClass('product-media--video-loaded');

          // Disable swipe on the model
          $elem.find('.plyr__controls').addClass('swiper-no-swiping');

          initialisedMedia[$elem.data('media-id')] = _video;
        }.bind(this)
      }]);

      function handlePlay() {
        _this.pauseAllMedia($elem.data('media-id'));
      }

      $(videoElement).on('playing', handlePlay);

      function delayedSwiperResize(event) {
        preventSizeRedraw = true;

        // If not fullscreen
        if (window.innerHeight !== screen.height) {
          setTimeout(function () {
            preventSizeRedraw = true;
          }, 200);
        }
      }

      //When fullscreen ends, trigger a delayed resize to ensure swiper resets correctly
      $(document).on('fullscreenchange', delayedSwiperResize);

      _video.show();
    };

    this.ExternalVideo = function ($elem, autoplay) {
      var isPlaying = false;
      var _video = this;
      var playerObj = {
        play: function () {},
        pause: function () {},
        destroy: function () {}
      };
      var iframeElement = $elem.find('iframe')[0];

      this.play = function () {
        $gallery.find('.product-media--current').removeClass('product-media--current');
        $elem.addClass('product-media--current');
        _video.show();
        playerObj.play();
      };

      this.togglePlayPause = function () {
        if (isPlaying) {
          _video.pause();
        } else {
          _video.play();
        }
      };

      this.pause = function () {
        playerObj.pause();
        $elem.removeClass('product-media--activated');
      };

      this.show = function () {
        $elem.addClass('product-media--activated');
        $elem.show();
        _this.slideshowTabFix();
      };

      this.hide = function () {
        playerObj.pause();
        $elem.hide();
      };

      this.destroy = function () {
        playerObj.destroy();
        $elem.off('click', '.product-media--video-mask', _video.togglePlayPause);
      };

      //Init the external videoSingle 3d model only
      if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.?be)\/.+$/.test(iframeElement.src)) {
        var loadYoutubeVideo = function () {
          playerObj = {
            playerType: 'youtube',
            element: iframeElement,
            player: new YT.Player(iframeElement, {
              videoId: $elem.data('video-id'),
              events: {
                onReady: function () {
                  initialisedMedia[$elem.data('media-id')] = _video;

                  $elem.addClass('product-media--video-loaded');

                  if (autoplay && theme.viewport.isSm()) {
                    _video.play();
                  }
                },
                onStateChange: function (event) {
                  if (event.data === 1) {
                    _this.pauseAllMedia($elem.data('media-id'));
                  }
                  isPlaying = event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING || event.data === YT.PlayerState.UNSTARTED;

                  if (event.data === 0 && $elem.data('enable-video-looping')) {
                    event.target.seekTo(0);
                  }
                }
              }
            }),
            play: function () {
              this.player.playVideo();
            },
            pause: function () {
              this.player.pauseVideo();
            },
            destroy: function () {
              this.player.destroy();
            }
          };
        };

        if (window.YT && window.YT.Player) {
          loadYoutubeVideo();
        } else {
          // set up a controller for YouTube video
          var temp = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = function () {
            if (temp) {
              temp();
            }
            loadYoutubeVideo();
          };

          theme.loadScriptOnce('https://www.youtube.com/iframe_api');
        }
      } else if (/vimeo\.com/.test(iframeElement.src)) {
        let loadVimeoVideos = function () {
          if (vimeoApiReady) {
            if ($elem.data('enable-video-looping')) {
              iframeElement.setAttribute('src', iframeElement.getAttribute('src') + '&loop=1');
            }

            if (autoplay && $(window).width() >= 768) {
              iframeElement.setAttribute('src', iframeElement.getAttribute('src') + '&autoplay=1&muted=1');
            }

            playerObj = {
              playerType: 'vimeo',
              element: iframeElement,
              player: new Vimeo.Player(iframeElement),
              play: function () {
                this.player.play();
              },
              pause: function () {
                this.player.pause();
              },
              destroy: function () {
                this.player.destroy();
              }
            };

            playerObj.player.ready().then(function () {
              initialisedMedia[$elem.data('media-id')] = _video;
              $elem.addClass('product-media--video-loaded');
            });

          } else {
            theme.loadScriptOnce('https://player.vimeo.com/api/player.js', function () {
              vimeoApiReady = true;
              loadVimeoVideos();
            });
          }
        };
        loadVimeoVideos();
      }

      $elem.on('click', '.product-media--video-mask', _video.togglePlayPause);

      _video.show();
    };

    this.Model = function ($elem, autoplay) {
      var _model = this;
      var playerObj = {
        play: function () {},
        pause: function () {},
        destroy: function () {}
      };
      var modelElement = $elem.find('model-viewer')[0];

      this.show = function () {
        $elem.show();
        $elem.addClass('product-media--activated');
        _this.slideshowTabFix();
        _model.updateViewInSpaceButton();
      };

      this.updateViewInSpaceButton = function () {
        if (window.ShopifyXR && $viewInSpaceButton.length) {
          //Change the view in space button to launch this model
          $viewInSpaceButton.attr('data-shopify-model3d-id', $elem.data('media-id'));
          window.ShopifyXR.setupXRElements();
        }
      };

      this.play = function () {
        $gallery.find('.product-media--current').removeClass('product-media--current');
        $elem.addClass('product-media--current');
        _model.show();
        playerObj.play();
      };

      this.pause = function () {
        $elem.removeClass('product-media--activated');
        playerObj.pause();
      };

      this.hide = function () {
        playerObj.pause();
        $elem.hide();

        if (window.ShopifyXR && $viewInSpaceButton.length) {
          //Reset the view in space button to launch the first model
          $viewInSpaceButton.attr('data-shopify-model3d-id', $viewInSpaceButton.data('shopify-model3d-first-id'));
          $viewInSpaceButton.attr('data-shopify-title', $viewInSpaceButton.data('shopify-first-title'));
          window.ShopifyXR.setupXRElements();
        }
      };

      this.destroy = function () {

        //Nothing needed
      };
      this.initAugmentedReality = function () {
        if ($('.model-json', $gallery).length) {
          var doInit = function () {
            if (!window.ShopifyXR) {
              document.addEventListener('shopify_xr_initialized', function shopifyXrEventListener(event) {
                doInit();

                //Ensure this only fires once
                event.target.removeEventListener(event.type, shopifyXrEventListener);
              });

              return;
            }

            window.ShopifyXR.addModels(JSON.parse($('.model-json', $gallery).html()));
            window.ShopifyXR.setupXRElements();
          };

          window.Shopify.loadFeatures([{
            name: 'shopify-xr',
            version: '1.0',
            onLoad: doInit
          }]);
        }
      };

      //Init the model
      theme.loadStyleOnce('https://cdn.shopify.com/shopifycloud/model-viewer-ui/assets/v1.0/model-viewer-ui.css');

      window.Shopify.loadFeatures([
      {
        name: 'model-viewer-ui',
        version: '1.0',
        onLoad: function () {
          playerObj = new Shopify.ModelViewerUI(modelElement);
          $elem.addClass('product-media--model-loaded');

          if (autoplay && theme.viewport.isSm()) {
            _model.play();
          }

          // add mouseup event proxy to fix carousel swipe gestures
          $('<div class="theme-event-proxy">').on('mouseup', function (e) {
            e.stopPropagation();
            e.preventDefault();
            document.dispatchEvent(new MouseEvent('mouseup'));
          }).appendTo(
          $(this).find('.shopify-model-viewer-ui__controls-overlay'));


          // Prevent the buttons from submitting the form
          $elem.find('button').attr('type', 'button');

          // Disable swipe on the model
          $elem.find('.shopify-model-viewer-ui').addClass('swiper-no-swiping');

        }.bind(this)
      }]);


      $elem.find('model-viewer').on('shopify_model_viewer_ui_toggle_play', function () {
        _this.pauseAllMedia($elem.data('media-id'));
        $elem.addClass('product-media-model--playing');
        $gallery.on('click', '.product-media:not([data-media-type="model"])', _model.pause);
      });

      $elem.find('model-viewer').on('shopify_model_viewer_ui_toggle_pause', function () {
        $elem.removeClass('product-media-model--playing');
        $gallery.off('click', '.product-media:not([data-media-type="model"])', _model.pause);
      });

      $elem.on('click', '.product-media--model-mask', function () {
        if (isCarouselLayout) {
          //If we're on a featured product, delay the initialisation of the model until the current slide has changed
          _this.swipeToSlideIfNotCurrent($elem);
          setTimeout(_model.play, 500);
        } else {
          _model.play();
        }
      });

      initialisedMedia[$elem.data('media-id')] = _model;

      _model.show();

      if (!window.ShopifyXR) {
        _model.initAugmentedReality();
      }
    };

    this.pauseAllMedia = function (ignoreKey) {
      for (var key in initialisedMedia) {
        if (initialisedMedia.hasOwnProperty(key) && (!ignoreKey || key != ignoreKey)) {
          initialisedMedia[key].pause();
        }
      }
    };

    this.showMedia = function ($mediaToShow, autoplay, preventHide) {
      //In with the new
      if ($mediaToShow.length) {
        //Out with the old
        if (currentMedia && !preventHide) {
          currentMedia.pause();
        }

        //Function to instantiate and return the relevant media
        var getMedia = function (MediaType) {
          var media;

          if (initialisedMedia.hasOwnProperty($mediaToShow.data('media-id'))) {
            media = initialisedMedia[$mediaToShow.data('media-id')];

            if (autoplay && theme.viewport.isSm()) {
              media.show();
              //Delay play so its easier for users to understand that it paused
              setTimeout(media.play, 250);
            } else {
              media.show();
            }
          } else {
            media = new MediaType($mediaToShow, autoplay);
          }

          return media;
        };

        //Initialise the media
        if ($mediaToShow.data('media-type') === "image") {
          currentMedia = getMedia(_this.Image);
        } else if ($mediaToShow.data('media-type') === "video") {
          currentMedia = getMedia(_this.Video);
        } else if ($mediaToShow.data('media-type') === "external_video") {
          currentMedia = getMedia(_this.ExternalVideo);
        } else if ($mediaToShow.data('media-type') === "model") {
          currentMedia = getMedia(_this.Model);
        } else {
          console.warn('Media is unknown', $mediaToShow);
          $gallery.find('.product-media:visible').hide();
          $mediaToShow.show();
        }
      }
    };

    this.swipeToSlideIfNotCurrent = function ($elem) {
      var $slide = $elem.closest('.swiper-slide');
      swiper.slideTo($slide.index(), 500);
    };

    this.destroy = function () {
      for (var i = 0; i < initialisedMedia.length; i++) {
        initialisedMedia[i].destroy();
      }

      if (!isCarouselLayout) {
        $(window).off(`load.productTemplateGallery${galleryId} scroll.productTemplateGallery${galleryId}`, detectHeaderOverGallery);
      }

      $gallery.closest('.product-area').off('click', '.product-area__thumbs__thumb a', handleThumbnailClick);
      $gallery.off('click', '[data-full-size]', handleImageClick);

      $gallery.off('variantImageSelected', _this.pauseAllMedia);
      $(window).off(`ccScrollToMedia.productTemplateGallery${galleryId}`);
      $(window).off(`.${galleryId}`);

      if ($thumbs && $thumbs.length) {
        $thumbs.off('click');
      }

      destroySwiper();
      destroyColumns();

      if ($productThumbnails.length) {
        destroyThumbnails();
      }
    };

    this.slideshowTabFix = function () {
      if (swiper) {
        // which slide are we going to?
        var $activeMedia = $swiperCont.find('.product-media--current'),
          $activeSlide = null;

        if ($activeMedia.length) {
          $activeSlide = $activeMedia.closest('.swiper-slide');
        } else {
          $activeSlide = $swiperCont.find('.swiper-slide.swiper-slide-active');
        }

        // tabindex everything to prevent tabbing into hidden slides
        $activeSlide.find('a, input, button, select, iframe, video, model-viewer, [tabindex]').each(function () {
          if (typeof $(this).data('theme-slideshow-original-tabindex') !== 'undefined') {
            if ($(this).data('theme-slideshow-original-tabindex') === false) {
              $(this).removeAttr('tabindex');
            } else {
              $(this).attr('tabindex', $(this).data('theme-slideshow-original-tabindex'));
            }
          } else {
            $(this).removeAttr('tabindex');
          }
        });
        $($swiperCont.find('.swiper-slide')).not($activeSlide).find('a, input, button, select, iframe, video, model-viewer, [tabindex]').each(function () {
          if (typeof $(this).data('theme-slideshow-original-tabindex') === 'undefined') {
            $(this).data('theme-slideshow-original-tabindex',
            typeof $(this).attr('tabindex') !== 'undefined' ?
            $(this).attr('tabindex') :
            false);

          }
          $(this).attr('tabindex', '-1');
        });
      }
    };

    this.scrollToMedia = function (mediaId) {
      const $variantImage = $(`[data-media-id="${mediaId}"]`);

      //Scroll to that variant image
      if ($variantImage.length && ($('body').hasClass('template-product') || isQuickbuy) && theme.viewport.isSm()) {
        let offset = parseInt($gallery.find('.theme-images').css('padding-top').replace('px', ''));
        let scrollAmount;

        if (!isQuickbuy) {
          scrollAmount = $variantImage.offset().top - offset + 1;

          //If the nav is opaque and sticky, compensate for the nav when scrolling
          if (nav.bar.hasOpaqueSetting() && nav.bar.hasStickySetting() ||
          isGalleryNarrow && nav.bar.hasStickySetting() ||
          $gallery.data('column-count') > 1 && $(window).outerWidth() >= 1100) {
            scrollAmount -= nav.bar.heightExcludingAnnouncementBar();
          }

          //If scrolling up and the nav is set hide on scroll down, subtract the nav from the new position
          if (scrollAmount < $(window).scrollTop() && nav.bar.getPositionSetting() === 'peek' && nav.bar.hasOpaqueSetting()) {
            scrollAmount -= nav.bar.heightExcludingAnnouncementBar();
          }

          scrollAmount = scrollAmount < 200 ? 0 : scrollAmount;
        } else {
          scrollAmount = $variantImage.offset().top - $(window).scrollTop() + $('#quick-buy-modal').scrollTop();
        }

        if ($gallery.data('column-count') === 1 && $(window).outerWidth() >= 1100 && isQuickbuy) {
          scrollAmount -= isGalleryNarrow ? 60 : -1; //The distance from the top of the viewport
        }

        if (isQuickbuy) {
          $('#quick-buy-modal').animate({
            scrollTop: scrollAmount
          }, 800);
        } else {
          $('html,body').animate({
            scrollTop: scrollAmount
          }, 800);
        }
      }
    };

    function detectHeaderOverGallery() {
      const nav = theme.Nav();
      $('body').toggleClass('header-over-gallery', $(window).scrollTop() < $gallery.height() - nav.bar.height());
    }

    function initColumns() {
      const columns = $gallery.data('column-count');
      const isCollage = $gallery.data('layout') === 'collage';

      if (isCollage) {
        const $collageImages = $gallery.find('.theme-img:visible');
        $collageImages.first().addClass('theme-img--collage-full');
        // $collageImages.last().addClass('theme-img--collage-last');
      }

      let $elements = $gallery.find('.theme-img:visible:not(.theme-img--collage-full)');

      let $finalImage,offset = 0;
      if ($elements.length % 2 > 0 && isCollage) {
        $finalImage = $elements.children().last();
        offset = 1;
      }

      let elementsPerCol = Math.ceil(($elements.length - offset) / columns);
      const $colContainer = $gallery.find('.theme-images');
      let currentCol = -1;
      let $colWrapper;

      if (columns > 1 && $elements.length - offset > 1) {
        $elements.each(function (i) {
          if (offset === 0 || i < $elements.length - offset) {
            if (currentCol < Math.floor(i / elementsPerCol)) {
              $colWrapper = $(`<div class="media-column"></div>`).appendTo($colContainer);
              currentCol++;
            }

            $(this).appendTo($colWrapper);
          }
        });
      }

      if ($finalImage) {
        $finalImage.parent().addClass('theme-img--collage-full').addClass('theme-img--collage-last').appendTo($colContainer);
      }
    }

    function destroyColumns() {
      let $colContainer = $gallery.find('.theme-images');
      $colContainer.find('.theme-img').each(function () {
        $(this).appendTo($colContainer).removeClass('theme-img--collage-full').removeClass('theme-img--collage-last');
      });
      $(window).off('debouncedresize.columnheights');

      $colContainer.find('.media-column').remove();
    }

    //Check if media should be displayed in columns
    if (theme.viewport.isSm() && $gallery.data('column-count') === 2) {
      setTimeout(initColumns, 0);
    }

    //Init all media
    $gallery.find('.product-media').each(function (index) {
      _this.showMedia($(this), false, true);
    });

    //Init swiper
    var $swiperExternalVideos = $swiperCont.find('[data-media-type="external_video"]');

    //Scrolls to the media of the clicked thumbnail
    function handleThumbnailClick(e) {
      e.preventDefault();
      const mediaId = $(this).closest('[data-media-thumb-id]').data('media-thumb-id');
      var $media = $gallery.find(`.product-media[data-media-id="${mediaId}"]`);
      //Scroll to that variant image
      if ($media.length) {
        //fixed and not data-opacity="transparent"
        $gallery.closest('.product-area').find('.thumb-active').removeClass('thumb-active');
        $(this).addClass('thumb-active');
        setTimeout(() => {_this.scrollToMedia(mediaId);}, 0);
      }

      return false;
    }

    //Opens the zoom modal
    function handleImageClick() {
      const nav = theme.Nav();

      if (theme.viewport.isSm()) {
        let thisSmallSizeImageUrl = $(this).find('.rimage-wrapper > img')[0].currentSrc;
        const $allImages = $(this).closest('.theme-images').find('[data-full-size]:visible');
        let imageHtml = `<a href="#" data-modal-close class="modal-close">&times;</a>`;

        $allImages.each(function () {
          let smallSizeImageUrl = $(this).find('.rimage-wrapper > img')[0].currentSrc;
          let fullSizeImageUrl = $(this).data('full-size');
          let extraAttrs = thisSmallSizeImageUrl === smallSizeImageUrl ? "id='zoom-image'" : "";

          //Build the html for the images within the modal
          imageHtml += `<img class="zoom-image" ${extraAttrs} src="${smallSizeImageUrl}" data-full-size="${fullSizeImageUrl}"/>`;
        });

        showThemeModal($('<div class="theme-modal theme-modal--fullscreen temp -light"  role="dialog" aria-modal="true"/>').append(`
           <div class='inner-scroller -out'>${imageHtml}</div>`), 'product-image', function ($modal) {

          const $mainImage = $('#zoom-image');
          $mainImage.attr('src', $mainImage.data('full-size'));

          setTimeout(() => {
            //Set full resolution of the other images
            $modal.find('[data-full-size]').each(function () {
              $(this).attr('src', $(this).data('full-size'));
            });
          }, 100);

          setTimeout(() => {
            //Scroll to the middle of the image
            $modal.scrollTop($mainImage.position().top + ($mainImage.outerHeight() / 2 - $modal.outerHeight() / 2));

            //Scroll to the top of the image
            $modal.find('.inner-scroller').removeClass('-out');
          }, 1000);
        });
      }
    }

    // Bind listeners
    if ($gallery.hasClass('theme-gallery--thumbs-enabled')) {
      $gallery.closest('.product-area').on('click', '.product-area__thumbs__thumb a', handleThumbnailClick);
    }

    if ($gallery.hasClass('theme-gallery--zoom-enabled')) {
      $gallery.on('click', '[data-full-size]', handleImageClick);
    }

    $(window).off(`ccScrollToMedia.productTemplateGallery${galleryId}`).on(
    `ccScrollToMedia.productTemplateGallery${galleryId}`, function (e, mediaId) {
      if ($gallery.data('scroll-to-variant-media') !== false || theme.viewport.isXs()) {
        setTimeout(() => {_this.scrollToMedia(mediaId);}, 0);
      }
    });

    if (!isCarouselLayout) {
      $(detectHeaderOverGallery);
      // indicate if header over the gallery
      $(window).on(`scroll.productTemplateGallery${galleryId}`, detectHeaderOverGallery);
    } else {
      // set external video dimensions for featured products
      $swiperExternalVideos.each(function () {
        $(this).width($gallery.outerHeight() * $(this).data('aspectratio'));
      });
    }

    function initThumbnails() {
      $('.carousel-wrapper .carousel:not(.slick-initialized)', $productThumbnails).each(function ($slick) {
        $(this).on('init reInit setPosition', function () {
          var lastSlide = $(this).find('.slick-slide:last');
          if (lastSlide.length > 0) {
            var slideInnerWidth = lastSlide.position().left + lastSlide.outerWidth(true);
            var $carouselWrapper = $(this).parent();
            var carouselWidth = $carouselWrapper.outerWidth(true);

            if (carouselWidth > slideInnerWidth) {
              $(this).find('.slick-next, .slick-prev').addClass('theme-unnecessary').attr('tabindex', '-1');
            } else {
              $(this).find('.slick-next, .slick-prev').removeClass('theme-unnecessary').attr('tabindex', '0');
            }
          }
        }).on('init reInit setPosition', function ($slick) {
          $('.lazyload--manual', this).removeClass('lazyload--manual').addClass('lazyload');
          setTimeout(function () {
            $($slick.target).find('.slick-slide a').attr('tabindex', '0');
          });
        }).slick({
          autoplay: false,
          fade: false,
          infinite: false,
          useTransform: true,
          arrows: true,
          dots: false,
          slidesToShow: 5,
          slidesToScroll: 5,
          centerMode: false,
          verticalSwiping: true,
          vertical: true,
          prevArrow: '<button type="button" class="slick-prev" aria-label="' + theme.strings.previous + '">' + theme.icons.chevronDown + '</button>',
          nextArrow: '<button type="button" class="slick-next" aria-label="' + theme.strings.next + '">' + theme.icons.chevronDown + '</button>',
          responsive: [
          {
            breakpoint: 1100,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3
            }
          },
          {
            breakpoint: 1400,
            settings: {
              slidesToShow: 4,
              slidesToScroll: 4
            }
          }]

        });
      });

      if (theme.viewport.isMd()) {
        _this.adjustGalleryMargin = () => {
          $gallery.css('margin-top', `-${$productThumbnails.outerHeight()}px`);
        };
        _this.adjustGalleryMargin();
        $(window).on('resize.thumbHeight', _this.adjustGalleryMargin);
        $(window).on('debouncedresizewidth.thumbHeight', _this.adjustGalleryMargin);
      }
    }

    function destroyThumbnails() {
      $('.carousel-wrapper .carousel', $productThumbnails).off('init reInit setPosition');
      $('.slick-slider', $productThumbnails).slick('unslick');
      $(window).off('resize.thumbHeight');
      $(window).off('debouncedresizewidth.thumbHeight');
    }

    function toggleThumbnailVisibility() {
      $('.slick-slider', $productThumbnails).slick('slickFilter', '[data-cc-hidden="false"]');
    }
    // Hides the irrelevant variant media
    function initVariantImageGrouping() {
      const productData = theme.OptionManager.getProductData(null, $gallery.data('product-id'));

      if (productData.media && productData.media.length > 1 &&
      productData.variants && productData.variants.length > 1 &&
      productData.options && productData.options.length > 0) {

        const getFirstMatchingOptionIndex = function (productOptions) {
          productOptions = productOptions.map((option) => option.toLowerCase());

          const colorOptions = $gallery.data('variant-image-grouping-option').split(',');

          for (let colorOption of colorOptions) {
            const index = productOptions.indexOf(colorOption.trim());
            if (index > -1) {
              return index;
            }
          }

          return -1;
        };

        const colorOptionIndex = getFirstMatchingOptionIndex(productData.options);

        //If this product contains a grouping field (eg Color)
        if (colorOptionIndex > -1) {
          const mediaByVariantColor = [];
          productData.variants.forEach((variant) => {
            if (variant.featured_media) {
              if (!mediaByVariantColor[variant.featured_media.id]) {
                mediaByVariantColor[variant.featured_media.id] = [];
              }
              mediaByVariantColor[variant.featured_media.id].push(variant.options[colorOptionIndex]);
            }
          });

          let previousColor;
          const slideContainer = $gallery[0].querySelector('.theme-images');
          const allSlides = $gallery[0].querySelectorAll('.theme-img');

          $gallery.on('variantImageSelected', (e, variant) => {
            const targetColor = variant.options[colorOptionIndex];
            let currentColor,newMediaVisible = false;

            //Only update the thumbnails when the color changes
            if (previousColor != targetColor) {
              if (isCarouselLayout || theme.viewport.isXs()) {
                slideContainer.innerHTML = "";
                slideContainer.append(...allSlides);
              }

              if ($productThumbnails.length) {
                $('.slick-slider', $productThumbnails).slick('slickUnfilter');
              }

              productData.media.forEach((media) => {
                if (mediaByVariantColor[media.id]) {
                  currentColor = mediaByVariantColor[media.id];
                }

                const mediaElement = $gallery[0].querySelector(`[data-media-id="${media.id}"]`);
                if (mediaElement) {
                  const showMedia = !!(currentColor && currentColor.includes(targetColor));
                  if (mediaElement.parentElement.getAttribute('aria-hidden') == showMedia.toString()) {
                    newMediaVisible = true;
                  }

                  //Remove images which precede any variant image
                  if (!currentColor) {
                    mediaElement.parentElement.remove();
                  }

                  mediaElement.parentElement.setAttribute('aria-hidden', !showMedia);

                  if (isCarouselLayout || theme.viewport.isXs()) {
                    if (showMedia) {
                      // Lazy load any media that needs it
                      const lazyImage = mediaElement.querySelector('.lazyload--manual');
                      if (lazyImage) {
                        lazyImage.classList.remove('lazyload--manual');
                        lazyImage.classList.add('lazyload');
                      }
                    } else {
                      mediaElement.parentElement.remove();
                    }
                  }

                  if ($productThumbnails.length) {
                    const thumbnailElement = $productThumbnails[0].querySelector(`[data-media-thumb-id="${media.id}"]`);
                    if (thumbnailElement) {
                      thumbnailElement.setAttribute('data-cc-hidden', !showMedia);
                    }
                  }
                }
              });

              if (isCarouselLayout && newMediaVisible) {
                updateSwiperSlidesPerView();
              }

              if (theme.viewport.isSm() && $gallery.data('column-count') === 2 && !isFirstRun && newMediaVisible) {
                //Reinit columns/collage
                setTimeout(() => {
                  destroyColumns();
                  initColumns();
                }, 0);
              }

              if ($productThumbnails.length) {
                setTimeout(toggleThumbnailVisibility, 0);
              }

              isFirstRun = false;
              previousColor = targetColor;
            }
          });
        }
      }
    }

    // Check the number of visible media and update the carousel options accordingly
    function updateSwiperSlidesPerView() {
      const visibleSlides = $gallery[0].querySelectorAll('.theme-img:not([aria-hidden="true"])');
      const swiperId = $gallery.find('.swiper-container:first').attr('data-swiper-id');
      if (swiperId) {
        const thisSwiper = theme.swipers[swiperId];
        if (thisSwiper && thisSwiper.params) {
          thisSwiper.params.breakpoints[10000].slidesPerView = visibleSlides.length < 2 ? 1 : 2;
          $gallery.attr('data-media-count', visibleSlides.length);
          thisSwiper.currentBreakpoint = false;
          thisSwiper.update();
        }
      }
    }

    if (isMediaGroupingEnabled) {
      initVariantImageGrouping();
    }

    let initialisedSectionVariants = [];
    $gallery.on('variantImageSelected', function (e, args) {
      _this.pauseAllMedia();

      const $container = $(this);
      const sectionId = $container.closest('[data-section-id]').data('section-id');

      if ($(this).find('.swiper-container-horizontal').length) {
        var swiperId = $('.swiper-container:first', this).attr('data-swiper-id');
        var swiper = theme.swipers[swiperId];
        var $swiperContainer = this;

        setTimeout(function () {
          var matchIndex = 0,$match;
          $('.swiper-container:first .swiper-slide:not([aria-hidden="true"]) .product-media', $swiperContainer).each(function (index) {
            if ($(this).data('media-id') == args.featured_media.id) {
              matchIndex = index;
              $match = $(this);
            }
          });

          swiper.update();
          swiper.slideTo(matchIndex, theme.viewport.isXs() ? 500 : 800);

          if (underlineSelectedMedia) {
            $container.find('.product-media--active-variant').removeClass('product-media--active-variant');

            if ($match) {
              $match.closest('.product-media').addClass('product-media--active-variant');
            }
          }
        }, args.eventType === 'firstrun' ? 1500 : 0);
        //Above: If its the first page load, wait 1.5s for media to load

      } else if (!$(this).hasClass('featured-product__gallery')) {
        let isFirstSection = $container.closest('.shopify-section').index() === 0;
        if (isFirstSection || initialisedSectionVariants.includes(sectionId)) {
          $(window).trigger('ccScrollToMedia', args.featured_media.id);
        }
        initialisedSectionVariants.push(sectionId);

        if ($gallery.data('column-count') > 1 && underlineSelectedMedia) {
          $gallery.find('.product-media--active-variant').removeClass('product-media--active-variant');
          $gallery.find(`[data-media-id="${args.featured_media.id}"]`).addClass('product-media--active-variant');
        }
      }

      setTimeout(() => {
        //If thumbs, scroll to the active one and add a class to it
        const $thumbSlider = $(`[data-section-id="${sectionId}"] .product-area__thumbs .carousel.slick-initialized`);
        if ($thumbSlider.length === 1 && ($container.data('scroll-to-variant-media') !== false || theme.viewport.isXs())) {
          const $activeSlide = $thumbSlider.find(`[data-media-thumb-id="${args.featured_media.id}"]:first`);
          if ($activeSlide.length) {
            $thumbSlider.find('.thumb-active').removeClass('thumb-active');
            $activeSlide.find('a').addClass('thumb-active');
            $thumbSlider.slick('slickGoTo', $activeSlide.data('slick-index'));
          }
        }
      }, 0);
    });

    function initSwiper() {
      destroyColumns();

      let extraSwiperOpts = {};

      if ($swiperCont.data('swiper-nav-style') === 'dots') {
        extraSwiperOpts = {
          dynamicBullets: true,
          pagination: {
            el: $swiperCont.find('.swiper-pagination')[0],
            dynamicBullets: true
          }
        };
      } else {
        extraSwiperOpts = {
          navigation: {
            nextEl: $swiperCont.find('.swiper-button-next')[0],
            prevEl: $swiperCont.find('.swiper-button-prev')[0]
          }
        };
      }

      //Init swiper
      var swiperOpts = {
        mode: 'horizontal',
        loop: false,
        resizeReInit: true,
        autoHeight: false,
        scrollContainer: true,
        grabCursor: true,
        createPagination: false,
        preventClicks: false,
        freeMode: false,
        freeModeFluid: false,
        slidesPerView: mediaCount > 1 ? 2 : 1,
        spaceBetween: isCarouselLayout && isGalleryNarrow || isFeaturedProduct ? 20 : 0,
        dynamicBullets: false,
        mousewheel: {
          invert: true,
          forceToAxis: true
        },
        scrollbar: {
          el: $swiperCont.find('.swiper-scrollbar')[0],
          draggable: true
        },
        ...extraSwiperOpts,
        breakpoints: {
          767: {
            autoHeight: true,
            slidesPerView: 1,
            spaceBetween: 0,
            freeMode: false,
            freeModeFluid: false,
            ...extraSwiperOpts
          },
          1199: {
            slidesPerView: 1
          },
          10000: {
            slidesPerView: mediaCount > 1 ? 2 : 1
          }
        },
        on: {
          init: function () {
            lazySizes.autoSizer.checkElems();
            $swiperCont.find('.swiper-slide-active .lazyload--manual').removeClass('lazyload--manual').addClass('lazyload');

            let lazyLoadDelay = 500;

            if (theme.viewport.isXs()) {
              lazyLoadDelay = LocalStorageUtil.get('is_first_visit') === null ? 6000 : 2000;
            }

            //Lazy load all slider images
            setTimeout(function () {
              $swiperCont.find('.lazyload--manual').removeClass('lazyload--manual').addClass('lazyload');
            }, lazyLoadDelay);

            //Hack for iPhone X - where loading the page on slower connection sometimes causes Swiper to steal focus
            if (theme.viewport.isXs() && $('.product-detail__form__options a:not(.size-chart-link)').length && !isCarouselLayout) {
              $('.product-detail__form__options a:not(.size-chart-link):first').focus();
              setTimeout(() => {
                $(window).scrollTop(0);
              }, 500);
            }

            //Hack for Safari (2021/08) - where images don't always draw on mobile screens - switching display mode forces it to redraw correctly
            if (theme.viewport.isXs() && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
              setTimeout(function () {
                $swiperCont.find('.swiper-wrapper').css('display', 'inline-flex').css('vertical-align', 'bottom');
              }, 500);
              setTimeout(function () {
                $swiperCont.find('.swiper-wrapper').css('display', '').css('vertical-align', '');
              }, 1000);
            }
          },
          slideChangeTransitionStart: function () {
            //Load the next image if not already
            $swiperCont.find('.swiper-slide-active .lazyload--manual').removeClass('lazyload--manual').addClass('lazyload');
          },
          slideChangeTransitionEnd: function (e) {
            // Pause any media after changing slide
            _this.pauseAllMedia();

            // Update the view in space button on swipe
            if (theme.viewport.isXs() || isCarouselLayout) {
              var $activeMedia = $gallery.find('.swiper-slide-active .product-media');
              var activeMediaObj = initialisedMedia[$activeMedia.data('media-id')];

              if (activeMediaObj) {
                if ($activeMedia.data('media-type') === 'model') {
                  activeMediaObj.updateViewInSpaceButton();
                } else if (window.ShopifyXR && $viewInSpaceButton.length) {
                  //Reset the view in space button to launch the first model
                  $viewInSpaceButton.attr('data-shopify-model3d-id', $viewInSpaceButton.data('shopify-model3d-first-id'));
                  $viewInSpaceButton.attr('data-shopify-title', $viewInSpaceButton.data('shopify-first-title'));
                  window.ShopifyXR.setupXRElements();
                }
              }
            }

            _this.slideshowTabFix();
          }
        }
      };

      swiper = new Swiper($swiperCont, swiperOpts);

      var randomId = new Date().getTime();
      theme.swipers[randomId] = swiper;
      $swiperCont.attr('data-swiper-id', randomId);

      var startIndex = $gallery.find('.current-img').index();
      swiper.slideTo(startIndex, 0);

      if (isCarouselLayout) {
        if (underlineSelectedMedia) {
          $gallery.find('.current-img .product-media').addClass('product-media--active-variant');
        }

        if (isMediaGroupingEnabled) {
          updateSwiperSlidesPerView();
        }
      }

      //Disable swipe on single products within the featured product slider
      if ($gallery.hasClass('featured-product__gallery--single')) {
        $swiperCont.addClass('swiper-no-swiping');
      }

      //Fixes bug where the last slide gets cut off if its a model
      setTimeout(function () {
        $(window).trigger('resize');

        //Load lazy images
        lazySizes.autoSizer.checkElems();

        if (swiper) {
          swiper.update();
        }

        //Autoplay the active slide on desktop
        if (theme.viewport.isSm() && !isCarouselLayout) {
          _this.showMedia($swiperCont.find('.swiper-slide.swiper-slide-active .product-media'), false, true);
        }

        if (isCarouselLayout) {
          _this.slideshowTabFix();
        }
      }, isCarouselLayout ? 3000 : 1000);
    }

    function destroySwiper() {
      $swiperCont.removeClass('swiper-no-swiping');
      if (swiper) {
        swiper.destroy(true);
      }
      initColumns();

      if ($productThumbnails.length && theme.viewport.isMd()) {
        initThumbnails();
      }
    }

    var swiperEnabled = false;
    function toggleSwiper() {
      if (theme.viewport.isXs() && !swiperEnabled) {
        swiperEnabled = true;
        initSwiper();
      } else if (theme.viewport.isSm() && swiperEnabled) {
        swiperEnabled = false;
        destroySwiper();
        $swiperCont.find('.lazyload--manual').removeClass('lazyload--manual').addClass('lazyload');
      } else if (theme.viewport.isSm()) {
        $swiperCont.find('.lazyload--manual').removeClass('lazyload--manual').addClass('lazyload');
      }
    }

    $(function () {
      if (isCarouselLayout) {
        initSwiper();
        $(window).on('cc-mobile-viewport-size-change.swiper', () => {
          destroySwiper();
          initSwiper();
        });

      } else {
        toggleSwiper();
        $(window).on('debouncedresize.swiper', toggleSwiper);
      }

      if ($productThumbnails.length) {
        if (theme.viewport.isMd()) {
          initThumbnails();
        }
      }
    });
  };
  ;
  theme.initContentSlider = function (target, afterChange) {
    $('.slideshow', target).each(function () {
      const autoplaySpeed = $(this).data('autoplay-speed') * 1000;
      let speed = $(this).data('transition') == 'instant' ? 0 : 600;

      $(this).on('init', function () {
        $('.slick-current .lazyload--manual', this).removeClass('lazyload--manual').addClass('lazyload');

        //Lazyload all slide images after a few seconds
        $(function () {
          setTimeout(() => {
            $('.lazyload--manual', this).removeClass('lazyload--manual').addClass('lazyload');
          }, LocalStorageUtil.get('is_first_visit') === null ? 5000 : 2000);
        });

      }).slick({
        autoplay: $(this).data('autoplay'),
        fade: $(this).data('transition') === 'slide' && theme.viewport.isXs() ? false : true,
        speed: speed,
        autoplaySpeed: autoplaySpeed,
        arrows: $(this).data('navigation') == 'arrows',
        dots: $(this).data('navigation') == 'dots',
        // pauseOnHover: $(this).data('transition') != 'instant' || $(this).data('autoplay-speed') > 2, // no pause when quick & instant
        infinite: true,
        useTransform: true,
        prevArrow: '<button type="button" class="slick-prev" aria-label="' + theme.strings.previous + '">' + theme.icons.chevronLeft + '</button>',
        nextArrow: '<button type="button" class="slick-next" aria-label="' + theme.strings.next + '">' + theme.icons.chevronRight + '</button>',
        pauseOnHover: false,
        cssEase: 'cubic-bezier(0.25, 1, 0.5, 1)',
        lazyLoad: $(this).find('[data-lazy]').length > 0 ? 'ondemand' : null,
        customPaging: function (slider, i) {
          return `<button class="custom-dot" type="button" data-role="none" role="button" tabindex="0">` +
          `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 30 30" xml:space="preserve">` +
          `<circle class="circle-one" cx="15" cy="15" r="13" />` +
          `<circle class="circle-two" cx="15" cy="15" r="13" style="animation-duration: ${autoplaySpeed + speed}ms" />` +
          `</svg>` +
          `</button>`;
        },
        responsive: [
        {
          breakpoint: 768,
          settings: {
            arrows: false, //$(this).data('navigation') == 'arrows',
            dots: $(this).data('navigation') != 'none', // $(this).data('navigation') == 'none' || $(this).data('navigation') == 'dots',
            lazyLoad: $(this).find('[data-lazy]').length > 0 ? 'progressive' : null
          }
        }]

      }).on('beforeChange', function (event, slick, currentSlide, nextSlide) {
        $(slick.$slides).filter('.slick--out').removeClass('slick--out');

        //Lazy load the next slide image if not already loaded
        const $unloadedImage = $(slick.$slides.get(nextSlide)).find('.lazyload--manual');
        if ($unloadedImage.length) {
          $unloadedImage.removeClass('lazyload--manual').addClass('lazyload');
        }

        if ($(this).data('transition') === 'slide' || $(this).data('transition') === 'zoom') {
          let $outgoingSlide = $(slick.$slides.get(currentSlide));
          $outgoingSlide.addClass('slick--leaving');
        }
      }).on('afterChange', function (event, slick, currentSlide) {
        $(slick.$slides).filter('.slick--leaving').addClass('slick--out').removeClass('slick--leaving');

        if (afterChange) {
          afterChange(currentSlide);
        }
      });
    });
  };

  theme.initProductSlider = function ($swiperCont) {let isBlog = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    const slidesInView = $swiperCont.data('products-in-view');

    let breakpoints = {
      767: {
        slidesPerView: 1.2,
        spaceBetween: 10
      },
      900: {
        slidesPerView: slidesInView === 4 || slidesInView === 3 ? 2 : slidesInView
      },
      1439: {
        slidesPerView: slidesInView === 4 || slidesInView === 3 ? 3 : slidesInView
      },
      3000: {
        slidesPerView: slidesInView,
        spaceBetween: 20
      }
    };

    if (isBlog) {
      const isFirstPostBig = $swiperCont.data('first-post-big');

      if (isFirstPostBig) {
        breakpoints = {
          767: {
            slidesPerView: 1.2,
            spaceBetween: 10
          },
          1024: {
            slidesPerView: 'auto'
          },
          1600: {
            slidesPerView: 'auto'
          },
          3000: {
            slidesPerView: 'auto',
            spaceBetween: 20
          }
        };
      } else {
        breakpoints = {
          767: {
            slidesPerView: 1.2,
            spaceBetween: 10
          },
          1024: {
            slidesPerView: 2
          },
          1600: {
            slidesPerView: 3
          },
          3000: {
            slidesPerView: 4,
            spaceBetween: 20
          }
        };
      }
    }

    //Init swiper
    new Swiper($swiperCont, {
      mode: 'horizontal',
      loop: false,
      resizeReInit: true,
      freeMode: true,
      freeModeFluid: true,
      scrollContainer: true,
      grabCursor: true,
      createPagination: false,
      slidesPerView: slidesInView,
      spaceBetween: 20,
      mousewheel: {
        invert: true,
        forceToAxis: true
      },
      scrollbar: {
        el: $swiperCont.find('.swiper-scrollbar')[0],
        draggable: true
      },
      navigation: {
        nextEl: $swiperCont.find('.js-swiper-button-next')[0],
        prevEl: $swiperCont.find('.js-swiper-button-prev')[0]
      },
      breakpoints: breakpoints,
      on: {
        init: function () {
          lazySizes.autoSizer.checkElems();
        }
      }
    });
  };

  theme.convertOptionsToBoxes = function (container) {
    // show box-style options
    var $clickies = $(container).find('select[data-make-box]').each(function () {
      $(this).find('option[value=""]').remove(); //Remove 'Pick a' option, if exists
    }).clickyBoxes().parent().addClass('has-clickyboxes');
    $('.selector-wrapper:not(.cc-swatches) .clickyboxes').ccHoverLine({
      lineCss: {
        height: '2px'
      }
    });


    // If we have clicky boxes, add the disabled-state to options that have no valid variants
    if ($clickies.length > 0) {
      var productData = theme.OptionManager.getProductData($(container));

      // each option
      for (var optionIndex = 0; optionIndex < productData.options.length; optionIndex++) {
        // list each value for this option
        var optionValues = {};
        for (var variantIndex = 0; variantIndex < productData.variants.length; variantIndex++) {
          var variant = productData.variants[variantIndex];
          if (typeof optionValues[variant.options[optionIndex]] === 'undefined') {
            optionValues[variant.options[optionIndex]] = false;
          }
          // mark true if an option is available
          if (variant.available) {
            optionValues[variant.options[optionIndex]] = true;
          }
        }
        // mark any completely unavailable options
        for (var key in optionValues) {
          if (!optionValues[key]) {
            $('.selector-wrapper:eq(' + optionIndex + ') .clickyboxes li a', container).filter(function () {
              return $(this).attr('data-value') == key;
            }).addClass('unavailable');
          }
        }
      }
    }
  };


  theme.loadInfiniteScroll = function (container, cb) {
    let infiniteLoadCount = 1;

    /// Pagination-replacement
    $('[data-infinite-scroll-container] .pagination.infiniscroll:not(.infinit)', container).addClass('infinit').each(function () {
      var waitForTrigger = $(this).hasClass('wait-for-trigger');
      var $pager = $('<div class="pager-button"><a href="#" aria-label="' + theme.strings.loadMore + '">' + theme.icons.loading + '</a></div>');
      $(this).replaceWith($pager);
      $pager.find('a').attr('href', $(this).find('.next a').attr('href'));

      $pager.on('click', 'a', function (e) {
        if ($(this).hasClass('loading')) {
          return false;
        }
        //Show spinner
        $(this).addClass('loading');
        //Load next page
        var $link = $(this);
        $.get($(this).attr('href'), function (data) {
          infiniteLoadCount++;
          let isCollage = false;
          // var $data = $($.parseHTML(data));
          // //Grab products & insert into page
          // var indexOffset = $('.product-list .product-block').length;
          // var $newProducts = $data.find('.product-list .product-block').hide().appendTo('.product-list').filter('.product-block').each(function(index){
          //   $(this).removeAttr('data-loop-index').data('loop-index', indexOffset + index);
          // });

          var $data = $($.parseHTML(data));
          //Grab products & insert into page
          if ($('[data-infinite-scroll-results].product-list--columns', container).length) {
            //Collage
            isCollage = true;
            var $newProducts = $data.find('[data-infinite-scroll-results]').hide();
            $newProducts.prepend('<h2>' + theme.strings.page.replace('{{ page }}', infiniteLoadCount) + '</h2>');

            var $newProducts = $newProducts.insertBefore('[data-infinite-scroll-container] .pager-button');
          } else {
            //Not collage
            var $newProducts = $data.find('[data-infinite-scroll-results] .product-block').hide().appendTo('[data-infinite-scroll-results]');
          }

          $('[data-infinite-scroll-container]', container).filter('.product-block').each(function (index) {
            $(this).removeAttr('data-loop-index').data('loop-index', index);
            i++;
          });

          //Sort by offset from the top
          //Fix height
          if (!isCollage) {
            $('[data-infinite-scroll-results]', container).height($('[data-infinite-scroll-results]', container).height());

            //Prep entry transitions
            $newProducts.addClass('pre-trans').css('display', '');

            //Find total height to slide to
            var newHeight = 0;
            $('[data-infinite-scroll-results]', container).children().each(function () {
              var h = $(this).position().top + $(this).height();
              if (h > newHeight) newHeight = h;
            });

            //Slide down, reveal & prep for more
            $('[data-infinite-scroll-results]', container).animate({ height: newHeight }, 500, function () {
              $(this).css('height', '');

              //At this point, we're ready to transition in & load more
              $newProducts.removeClass('pre-trans');

              theme.inlineVideos.init(container);
              theme.initAnimateOnScroll();
              new ProductBlock();
              lazySizes.autoSizer.checkElems();
              if (cb) {
                cb();
              }
            });
          } else {
            setTimeout(function () {
              $newProducts.fadeIn();
              theme.inlineVideos.init(container);
              theme.initAnimateOnScroll();
              lazySizes.autoSizer.checkElems();
              if (cb) {
                cb();
              }
            }, 300);
          }

          //Spin no more
          var $next = $data.find('[data-infinite-scroll-container] .pagination .next a');

          if ($next.length == 0) {
            //We are out of products
            $pager.slideUp();
          } else {
            //More to show
            $link.attr('href', $next.attr('href')).removeClass('loading');
          }
        });

        return false;
      });
      if (!waitForTrigger) {
        //Infiniscroll
        $(window).on('throttled-scroll.infiniscroll', function () {
          if ($(window).scrollTop() + $(window).height() > $pager.offset().top - 500) {
            $pager.find('a').trigger('click');
          }
        });
      }
    });
  };

  theme.unloadInfiniteScroll = function (container) {
    if (container) {
      $('.pagination.infiniscroll.infinit', container).removeClass('infinit');
    }

    $(window).off('throttled-scroll.infiniscroll');
  };

  theme.applyAjaxToProductForm = function ($formContainer) {
    var shopifyAjaxAddURL = theme.routes.cart_add_url + '.js';

    $formContainer.filter('[data-ajax-add-to-cart="true"]:not(.feedback-go_to_cart)').find('.product-purchase-form').on('submit', function (e) {
      e.preventDefault();
      var $form = $(this);

      // Disable add button
      var $btn = $(this).find('[type=submit]').attr('disabled', 'disabled').addClass('confirmation adding');
      $btn.data('originalHtml', $btn.html()).html(theme.strings.productAddingToCart);

      const $stickyBtn = $('.product-area__add-to-cart-xs button');
      const updateStickyButton = theme.viewport.isXs() && $stickyBtn.length;
      if (updateStickyButton) {
        $stickyBtn.attr('disabled', 'disabled');
        $stickyBtn.data('originalHtml', $stickyBtn.html()).html(theme.strings.productAddingToCart);
      }

      // Add to cart
      $.post(shopifyAjaxAddURL, $form.serialize(), function (itemData) {
        // Enable add button
        $btn.html(theme.icons.tick + ' ' + theme.strings.productAddedToCart);

        if (updateStickyButton) {
          $stickyBtn.html(theme.icons.tick + ' ' + theme.strings.productAddedToCart);
        }

        setTimeout(function () {
          $btn.removeAttr('disabled').removeClass('confirmation').html($btn.data('originalHtml'));
          if (updateStickyButton) {
            $stickyBtn.removeAttr('disabled').removeClass('confirmation').html($stickyBtn.data('originalHtml'));
          }
        }, 4000);

        if ($form.hasClass('feedback-add_in_modal') || $form.hasClass('feedback-add_in_modal_no_checkout')) {
          const product = $.parseJSON(itemData);
          const noCheckoutButton = $form.hasClass('feedback-add_in_modal_no_checkout');

          //Preload the thumbnail image
          const thumbUrl = theme.Shopify.formatImage(product.image, '300x');
          const img = new Image();
          img.src = thumbUrl;

          $btn.removeClass('adding');

          let variantHtml = "";

          let $priceElem = $form.closest('.product-area__details__inner').find('.price-area');
          if ($priceElem.length) {
            variantHtml += `<p class="cart-product__content__price">${$priceElem.html()}</p>`;
          }

          if (product.selling_plan_allocation && product.selling_plan_allocation.selling_plan.name) {
            variantHtml += `<p class="cart-product__content__meta">${product.selling_plan_allocation.selling_plan.name}</p>`;
          }

          if (product.options_with_values && product.options_with_values.length) {
            for (let i = 0; i < product.options_with_values.length; i++) {
              let option = product.options_with_values[i];
              if (option.name !== "Title" && option.value !== "Default Title") {
                variantHtml += `<p class="cart-product__content__meta">${option.name}: ${option.value}</p>`;
              }
            }
          }

          // Get line items from the form
          let productLineItems = {};
          const formData = new FormData($form[0]);

          for (const [key, value] of formData) {
            if (key.indexOf('properties[') === 0 && value) {
              const name = key.split('[')[1].split(']')[0];
              if (name[0] !== '_') {
                productLineItems[name] = value;
              }
            }
          }

          if (Object.keys(productLineItems).length > 0) {
            for (const key of Object.keys(productLineItems)) {
              let value = productLineItems[key];
              let firstChar = key.charAt(0);

              // Escape for HTML
              const tempSpan = document.createElement('span');
              tempSpan.innerText = value;
              value = tempSpan.innerHTML;

              if (key.startsWith('Recipient') && value !== '') {
                variantHtml += `<p class="cart-product__content__meta">${key}: ${value}</p>`;
              } else
              if (value !== '' && firstChar !== '_') {
                if (value.includes('/uploads/')) {
                  let lastPart = value.split('/').pop();
                  variantHtml += `
                  <span class="cart-product__content__meta">${key}: </span>
                  <a data-cc-animate-click href="${value}">${lastPart}</a>`;
                } else {
                  variantHtml += `
                  <p class="cart-product__content__meta">${key}: ${value}</p>`;
                }
              }
            }
          }

          let offset = 25;
          const nav = theme.Nav();
          if (nav.bar.getPositionSetting() !== "inline") {
            offset = nav.bar.height();
          }

          let imgAlt = '';
          if (product.featured_image && product.featured_image.alt) {
            imgAlt = product.featured_image.alt;
          }

          showThemeModal([
          '<div id="added-to-cart" class="theme-modal theme-modal--small" role="dialog" aria-modal="true" aria-labelledby="added-to-cart-title">',
          `<div class="inner" style="top:${offset}px">`,
          '<a href="#" data-modal-close class="modal-close">&times;</a>',
          '<h4 id="added-to-cart-title">' + theme.icons.tick + theme.strings.productAddedToCart + '</h4>',
          '<div class="cart-product">',
          `<div class="cart-product__image"><img src="${thumbUrl}" alt="${imgAlt}"/></div>`,
          '<div class="cart-product__content">' +
          '<p class="cart-product__content__title">', product.product_title, '</p>' +
          `${variantHtml ? variantHtml : ''}` +
          '</div>',
          '</div>',
          `<p class="links ${noCheckoutButton ? 'links--no-checkout' : ''}">`,
          '<a href="' + theme.routes.cart_url + `" class="button ${noCheckoutButton ? '' : 'alt'}">` + theme.strings.viewCart + '</a>',
          '<a href="' + theme.routes.checkout + '" class="button button--checkout" [data-cc-checkout-button]>' + theme.strings.popupCheckout + '</a> ',
          '</p>',
          '</div>',
          '</div>'].
          join(''), "added-to-cart", null);
        } else if ($form.hasClass('feedback-add_and_redirect')) {
          window.location = theme.routes.cart_url;
          return;
        }

        // Update header (& cart if on cart)
        $.get(theme.routes.cart_url, function (data) {
          var cartUpdateSelector = '#site-control .cart:not(.nav-search), [data-section-type="cart-template"]';
          var $newCartObj = $($.parseHTML('<div>' + data + '</div>')).find(cartUpdateSelector);
          $(cartUpdateSelector).each(function (index) {
            $($newCartObj[index]).find('[data-cc-animate]').removeAttr('data-cc-animate');
            $(this).replaceWith($newCartObj[index]);
            $(this).parent().find('[data-cc-animate]').removeAttr('data-cc-animate');
          });
        });
      }, 'text').fail(function (data) {

        // Enable add button
        $btn.removeAttr('disabled').removeClass('confirmation').html($btn.data('originalHtml'));

        if (updateStickyButton) {
          $stickyBtn.removeAttr('disabled').removeClass('confirmation').html($stickyBtn.data('originalHtml'));
        }

        // Not added, show message
        if (typeof data !== 'undefined' && typeof data.status !== 'undefined') {
          const response = $.parseJSON(data.responseText);
          const $statusMessageContainer = $form.find('.error-message');
          let error = typeof response.description === 'string' ? response.description : response.message;
          if (response.errors && typeof response.errors === 'object') {
            error = Object.entries(response.errors).map((item) => item[1].join(', '));
          }

          if (error) {
            $statusMessageContainer[0].innerHTML = '';
            const errorArray = Array.isArray(error) ? error : [error];
            errorArray.forEach((err, index) => {
              if (index > 0) $statusMessageContainer[0].insertAdjacentHTML('beforeend', '<br>');
              $statusMessageContainer[0].insertAdjacentText('beforeend', err);
            });
          }

          $statusMessageContainer.slideDown().fadeIn();

          setTimeout(() => {
            $statusMessageContainer.slideUp();
          }, 8000);
        } else

        {
          // Some unknown error? Disable ajax and submit the old-fashioned way.
          $form.attr('ajax-add-to-cart', 'false').submit();
        }
      });
    });
  };

  theme.removeAjaxFromProductForm = function ($formContainer) {
    $formContainer.find('form.product-purchase-form').off('submit');
  };

  // Manage option dropdowns
  theme.OptionManager = new function () {
    var _ = this;

    _._getVariantOptionElement = function (variant, $container) {
      return $container.find('select[name="id"] option[value="' + variant.id + '"]');
    };

    _.selectors = {
      container: '.product-area',
      gallery: '.theme-gallery',
      priceArea: '.price-area',
      variantIdInputs: '[name="id"]',
      submitButton: '.product-purchase-form [type=submit], .product-area__add-to-cart-xs button',
      multiOption: '.product-detail__form__options .option-selectors'
    };

    _.strings = {
      priceNonExistent: theme.strings.priceNonExistent,
      buttonDefault: theme.strings.buttonDefault,
      buttonPreorder: theme.strings.buttonPreorder,
      buttonNoStock: theme.strings.buttonNoStock,
      buttonNoVariant: theme.strings.buttonNoVariant,
      unitPriceSeparator: theme.strings.unitPriceSeparator,
      inventoryNotice: theme.strings.onlyXLeft,
      inventoryLowStock: theme.strings.inventoryLowStock,
      inventoryInStock: theme.strings.inventoryInStock,
      priceSoldOut: theme.strings.priceSoldOut
    };

    _._getString = function (key, variant) {
      var string = _.strings[key];
      if (variant) {
        if (string) {
          string = string.replace('[PRICE]', '<span class="theme-money">' + theme.Shopify.formatMoney(variant.price, theme.money_format_with_code_preference) + '</span>');
        } else {
          console.warn(`No string for key '${key}' was found.`);
        }
      }
      return string;
    };

    _.getProductData = function ($form, productId) {
      if (!productId) {
        productId = $form.data('product-id');
      }
      var data = null;
      if (!theme.productData[productId]) {
        theme.productData[productId] = JSON.parse(document.getElementById('cc-product-json-' + productId).innerHTML);
      }
      data = theme.productData[productId];
      if (!data) {
        console.log('Product data missing (id: ' + $form.data('product-id') + ')');
      }
      return data;
    };

    _.getBaseUnit = function (variant) {
      return variant.unit_price_measurement.reference_value === 1 ?
      variant.unit_price_measurement.reference_unit :
      variant.unit_price_measurement.reference_value +
      variant.unit_price_measurement.reference_unit;
    },

    _.addVariantUrlToHistory = function (variant) {
      if (variant) {
        var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?variant=' + variant.id;
        window.history.replaceState({ path: newurl }, '', newurl);
      }
    };

    _.updateSku = function (variant, $container) {
      $container.find('.sku .sku__value').html(variant ? variant.sku : '');
      $container.find('.sku').toggleClass('sku--no-sku', !variant || !variant.sku);
    };

    _.updateBarcode = function (variant, $container) {
      $container.find('.barcode .barcode__value').html(variant ? variant.barcode : '');
      $container.find('.barcode').toggleClass('barcode--no-barcode', !variant || !variant.barcode);
    };

    _.updateInventoryNotice = function (variant, $container) {
      const $inventoryNotice = $container.find('.product-inventory-notice');
      const $inventoryNoticeText = $container.find('.product-inventory-notice__text');
      const $inventoryNoticeIndicator = $container.find('.product-inventory-notice__indicator');

      if ($inventoryNotice.length) {
        const invCount = _._getVariantOptionElement(variant, $container).data('inventory');
        const invData = $inventoryNotice[0].dataset;

        const showInventoryCount = invData.showInventoryCount === "always" ||
        invData.showInventoryCount === "low" && invCount <= invData.inventoryThreshold;

        let notice;
        if (showInventoryCount) {
          notice = _._getString('inventoryNotice').replace('[[ quantity ]]', invCount);
        } else {
          if (invCount <= parseInt(invData.inventoryThreshold)) {
            notice = _._getString('inventoryLowStock');
          } else {
            notice = _._getString('inventoryInStock');
          }
        }

        //Update the bar indicator
        if ($inventoryNoticeIndicator.length === 1) {
          const $bar = $inventoryNoticeIndicator.find('span');
          let newWidth;
          if (invCount >= invData.indicatorScale) {
            newWidth = 100;
          } else {
            newWidth = (100 / parseInt(invData.indicatorScale) * invCount).toFixed(1);
          }

          if (invCount <= parseInt(invData.inventoryThreshold)) {
            $bar.css('width', newWidth + '%').css('background-color', invData.indicatorScaleColorBelow);
          } else {
            $bar.css('width', newWidth + '%').css('background-color', invData.indicatorScaleColorAbove);
          }
        }

        if (invCount && invCount > 0 && (invData.showInventoryNotice === "always" || invCount <= parseInt(invData.inventoryThreshold))) {
          $inventoryNotice.removeClass('product-inventory-notice--no-inventory').slideDown(300);
          $inventoryNoticeText.html(notice);
        } else {
          $inventoryNotice.addClass('product-inventory-notice--no-inventory').slideUp(300);
        }
      }
    };

    _.updateBackorder = function (variant, $container) {
      var $backorder = $container.find('.backorder');
      if ($backorder.length) {
        if (variant && variant.available) {
          if (variant.inventory_management && _._getVariantOptionElement(variant, $container).data('stock') == 'out') {
            var productData = _.getProductData($container);
            $backorder.find('.backorder__variant').html(productData.title + (variant.title.indexOf('Default') >= 0 ? '' : ' - ' + variant.title));
            $backorder.show();
          } else {
            $backorder.hide();
          }
        } else {
          $backorder.hide();
        }
      }
    };

    _.updatePrice = function (variant, $container) {
      var $priceArea = $container.find(_.selectors.priceArea);
      $priceArea.removeClass('on-sale');

      if (variant) {
        var $newPriceArea = $('<div>');
        if (variant.compare_at_price > variant.price) {
          $('<span class="was-price theme-money">').html(theme.Shopify.formatMoney(variant.compare_at_price, theme.money_format_with_code_preference)).appendTo($newPriceArea);
          $newPriceArea.append(' ');
          $priceArea.addClass('on-sale');
        }
        $('<span class="current-price theme-money">').html(theme.Shopify.formatMoney(variant.price, theme.money_format_with_code_preference)).appendTo($newPriceArea);
        if (variant.unit_price_measurement) {
          var $newUnitPriceArea = $('<div class="unit-price">').appendTo($newPriceArea);
          $('<span class="unit-price__price theme-money">').html(theme.Shopify.formatMoney(variant.unit_price, theme.money_format)).appendTo($newUnitPriceArea);
          $('<span class="unit-price__separator">').html(_._getString('unitPriceSeparator')).appendTo($newUnitPriceArea);
          $('<span class="unit-price__unit">').html(_.getBaseUnit(variant)).appendTo($newUnitPriceArea);
        }
        $priceArea.html($newPriceArea.html());
      } else {
        $priceArea.html(`<span class="current-price">${_.strings.priceNonExistent}</span>`);
      }
    };

    _._updateButtonText = function ($button, string, variant) {
      $button.each(function () {
        var newVal;
        newVal = _._getString('button' + string, variant);
        if (newVal !== false) {
          if ($(this).is('input')) {
            $(this).val(newVal);
          } else {
            $(this).html(newVal);
          }
        }
      });
    };

    _.updateButtons = function (variant, $container) {
      var $button = $container.find(_.selectors.submitButton);
      if (variant && variant.available == true) {
        $button.removeAttr('disabled');


        if ($container.data('is-preorder')) {
          _._updateButtonText($button, 'Preorder', variant);
        } else {
          _._updateButtonText($button, 'Default', variant);
        }
      } else {
        $button.attr('disabled', 'disabled');
        if (variant) {
          _._updateButtonText($button, 'NoStock', variant);
        } else {
          _._updateButtonText($button, 'NoVariant', variant);
        }
      }
    };

    _.updateContainerStatusClasses = function (variant, $container) {
      $container.toggleClass('variant-status--unavailable', !variant.available);
      $container.toggleClass('variant-status--backorder', variant.available &&
      variant.inventory_management &&
      _._getVariantOptionElement(variant, $container).data('stock') == 'out');
    };

    _.updateVariantOptionStatusClasses = function (variant, $container) {
      const productData = _.getProductData($container);

      //For the given array of option values, find variants which share the same options
      function getMatchingVariants(optionValues) {
        // console.log(`Finding variants with option values: ${optionValues}`);

        let tempVariants = productData.variants;

        let matchingVariants = tempVariants.filter((thisVariant) => {
          let variantMatches = true;

          for (let j = 0; j < optionValues.length; j++) {
            if (thisVariant.options[j] !== optionValues[j]) {
              variantMatches = false;
              break;
            }
          }

          return variantMatches;
        });

        return matchingVariants;
      }

      //Returns an object of all the possible values for the given option with each option set to false
      function getAllValuesForOption(i) {
        let allOptionValues = {};

        for (var l = 0; l < productData.variants.length; l++) {
          let value = productData.variants[l].options[i];
          if (value) {
            allOptionValues[value] = false;
          }
        }

        return allOptionValues;
      }

      if (variant === false) {
        //The variant is unavailable, fabricate variant options based on the current selection
        variant = {
          options: []
        };

        $container.find('.selector-wrapper a.active[data-value]').each(function () {
          variant.options.push($(this).data('value'));
        });
      }

      if (variant && variant.options && variant.options.length > 1) {
        let optionValues = [...variant.options];
        let optionStock = {};

        //Iterate the current variant option selection from the bottom up
        for (let i = variant.options.length - 1; i >= 0; i--) {
          optionValues.pop();

          //Get an object of values for this option all with stock set to false
          let optionAvailability = getAllValuesForOption(i);

          //Get variants which have the parent options
          let matchingVariants = getMatchingVariants(optionValues);

          //Check for in stock options within matching variants
          for (let k = 0; k < matchingVariants.length; k++) {
            if (matchingVariants[k].available) {
              let value = matchingVariants[k].options[i];
              if (value) {
                optionAvailability[value] = true;
              }
            }
          }

          //Add this option value to the master object of availability for this variant
          optionStock[productData.options[i]] = optionAvailability;
        }

        //Update the UI to reflect stock
        $('.selector-wrapper', $container).each(function () {
          const optionName = $(this).data('option-name');
          for (let [option, isAvailable] of Object.entries(optionStock[optionName])) {
            option = removeDiacritics(option).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/-*$/, '');
            $(this).find(`.clickyboxes .opt--${option}`).toggleClass('unavailable', !isAvailable);
          }
        });
      }
    };

    _.initProductOptions = function ($productForm) {
      if ($productForm.hasClass('theme-init')) return;

      var productData = _.getProductData($productForm);
      $productForm.addClass('theme-init');

      // init option selectors
      $productForm.find(_.selectors.multiOption).on('change.themeProductOptions', 'select', function () {
        var selectedOptions = [];
        $(this).closest(_.selectors.multiOption).find('select').each(function () {
          selectedOptions.push($(this).val());
        });
        // find variant
        var variant = false;
        for (var i = 0; i < productData.variants.length; i++) {
          var v = productData.variants[i];
          var matchCount = 0;
          for (var j = 0; j < selectedOptions.length; j++) {
            if (v.options[j] == selectedOptions[j]) {
              matchCount++;
            }
          }
          if (matchCount == selectedOptions.length) {
            variant = v;
            break;
          }
        }
        // trigger change
        if (variant) {
          $productForm.find(_.selectors.variantIdInputs).val(variant.id);
        }
        // a jQuery event may not be picked up by all listeners
        $productForm.find(_.selectors.variantIdInputs).each(function () {
          this.dispatchEvent(
          new CustomEvent('change', { bubbles: true, cancelable: false, detail: variant }));

        });
      });

      // init custom options (mirror in purchase form for Buy Now button)
      $productForm.find(_.selectors.customOption).each(function () {
        const $input = $(this).find('input:first, textarea, select');
        $('<input type="hidden">').attr({
          name: $input.attr('name'),
          value: $input.val()
        }).appendTo($productForm.find(_.selectors.purchaseForm));
      }).on('change.themeProductOptions', function () {
        const $radios = $(this).find('input[type="radio"]'),
          $checkbox = $(this).find('input[type="checkbox"]');
        if ($radios.length) {
          // radio buttons
          $productForm.find(_.selectors.purchaseForm + ' input').filter(function () {
            return this.name === $radios[0].name;
          }).val($radios.filter(':checked').val()).trigger('change');
        } else if ($checkbox.length) {
          // checkbox
          let val = null;
          if ($checkbox.is(':checked')) {
            val = $checkbox.val();
          } else {
            val = $checkbox.siblings('[type="hidden"]').val();
          }
          $productForm.find(_.selectors.purchaseForm + ' input').filter(function () {
            return this.name === $checkbox[0].name;
          }).val(val).trigger('change');
        } else {
          // other inputs
          const $input = $(this).find('select, input, textarea');
          $productForm.find(_.selectors.purchaseForm + ' input').filter(function () {
            return this.name === $input.attr('name');
          }).val($input.val()).trigger('change');
        }
      });

      // init variant ids
      $productForm.find(_.selectors.variantIdInputs).each(function () {
        // change state for original dropdown
        $(this).on('change.themeProductOptions firstrun.themeProductOptions', function (e) {
          if ($(this).is('input[type=radio]:not(:checked)')) {
            return; // handle radios - only update for checked
          }
          var variant = e.detail;
          if (!variant && variant !== false) {
            for (var i = 0; i < productData.variants.length; i++) {
              if (productData.variants[i].id == $(this).val()) {
                variant = productData.variants[i];
              }
            }
          }
          var $container = $(this).closest(_.selectors.container);

          // string overrides
          var $addToCart = $container.find(_.selectors.submitButton).filter('[data-add-to-cart-text]');
          if ($addToCart.length) {
            _.strings.buttonDefault = $addToCart.data('add-to-cart-text');
          }

          // update price
          _.updatePrice(variant, $container);

          // update buttons
          _.updateButtons(variant, $container);

          // emit an event to broadcast the variant update
          $(window).trigger('cc-variant-updated', {
            variant: variant,
            product: productData
          });

          // retrigger stuff, eg hover line
          $(window).trigger('debouncedresizewidth');

          // variant images
          if (variant && variant.featured_media) {
            $container.find(_.selectors.gallery).trigger('variantImageSelected', variant);
          }

          // extra details
          _.updateBarcode(variant, $container);
          _.updateSku(variant, $container);
          _.updateInventoryNotice(variant, $container);
          //_.updateTransferNotice(variant, $container);
          _.updateBackorder(variant, $container);
          _.updateContainerStatusClasses(variant, $container);

          if ($productForm.find('[data-show-realtime-availability="true"]').length > 0) {
            _.updateVariantOptionStatusClasses(variant, $productForm);
          }

          // variant urls
          if ($productForm.data('enable-history-state') && e.type == 'change') {
            _.addVariantUrlToHistory(variant);
          }

          // notify quickbuy of content change
          $productForm.find('.quickbuy-container').trigger('changedsize');

          // allow other things to hook on
          $productForm.trigger('variantChanged', variant);
        });

        // first-run
        $(this).trigger('firstrun');
      });

      // ajax
      theme.applyAjaxToProductForm($productForm);
    };

    _.unloadProductOptions = function ($productForm) {
      $productForm.removeClass('theme-init').each(function () {
        $(this).trigger('unloading').off('.themeProductOptions');
        $(this).find(_.selectors.multiOption).off('.themeProductOptions');
        theme.removeAjaxFromProductForm($productForm);
      });
    };
  }();
  ;
  theme.addControlPaddingToModal = function () {
    $('.theme-modal.reveal > .inner').css('padding-top', theme.Nav().bar.height());
  };

  theme.allowRTEFullWidthImages = function (container) {
    $('.rte--allow-full-width-images p > img, .rte--allow-full-width-images div > img', container).each(function () {
      if ($(this).siblings().length == 0) {
        $(this).parent().addClass('no-side-pad');
      }
    });
    $('.rte--allow-full-width-images p > a > img, .rte--allow-full-width-images div > a > img', container).each(function () {
      if ($(this).siblings().length == 0 && $(this).parent().siblings().length == 0) {
        $(this).parent().addClass('no-side-pad');
      }
    });
  };

  theme.browserHas3DTransforms = function () {
    var el = document.createElement('p'),
      has3d,
      transforms = {
        'webkitTransform': '-webkit-transform',
        'OTransform': '-o-transform',
        'msTransform': '-ms-transform',
        'MozTransform': '-moz-transform',
        'transform': 'transform'
      };

    // Add it to the body to get the computed style.
    document.body.insertBefore(el, null);

    for (var t in transforms) {
      if (el.style[t] !== undefined) {
        el.style[t] = "translate3d(1px,1px,1px)";
        has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
      }
    }

    document.body.removeChild(el);

    return has3d !== undefined && has3d.length > 0 && has3d !== "none";
  };

  if (theme.browserHas3DTransforms()) {$('html').addClass('supports-transforms');}

  theme.namespaceFromSection = function (container) {
    return ['.', $(container).data('section-type'), $(container).data('section-id')].join('');
  };

  theme.inlineVideos = {
    init: (target) => {
      $('.section-background-video--inline', target).each(function () {
        theme.VideoManager.onSectionLoad($(this)[0]);
        $(this).addClass('cc-init');
      });
    },
    destroy: (target) => {
      $('.section-background-video--inline', target).each(function () {
        theme.VideoManager.onSectionUnload($(this)[0]);
        $(this).removeClass('cc-init');
      });
    }
  };

  //Load shopify payments button
  theme.initShopifyPaymentButtons = function ($elem) {
    if (Shopify.PaymentButton && $elem.find('.shopify-payment-button').length) {
      // resize after loading extra payment buttons
      var f = null;
      f = function () {
        document.removeEventListener('shopify:payment_button:loaded', f);
        $elem.trigger('changedsize');
      };
      document.addEventListener('shopify:payment_button:loaded', f);

      Shopify.PaymentButton.init();
    }
  };

  //Initialise any components in the passed element
  theme.initComponents = function ($elem) {
    const $components = $elem.find("[data-components]");
    if ($components.length) {
      //Init each component
      const components = $components.data('components').split(',');
      components.forEach((component) => {
        $(document).trigger('cc:component:load', [component, $elem[0]]);
      });
    }
  };

  // Check for full width sections
  theme.assessFullWidthSections = function () {
    document.querySelectorAll('#page-content .shopify-section > .use-alt-bg').forEach((elem) => elem.parentElement.classList.add('has-alt-bg'));
  };

  theme.updateNavHeight = function () {
    const nav = theme.Nav();
    document.documentElement.style.setProperty('--nav-height', nav.bar.height() + "px");
    document.querySelectorAll('[data-cc-sticky-scroll-top]').forEach((elem) => {
      elem.setAttribute('data-cc-sticky-scroll-top', nav.bar.height() + 20);
    });
  };

  // Perform common functions when the theme inits
  theme.init = function () {
    theme.checkViewportFillers();
    theme.assessAltLogo();
    theme.assessFullWidthSections();
    theme.calc100vh();
    theme.updateNavHeight();
  };

  // Perform common functions when the window resizes (debounced)
  theme.windowResize = function () {
    theme.calc100vh();
    theme.updateNavHeight();
  };

  jQuery(function ($) {
    $(document).on('click', '[data-cc-quick-buy]', function () {
      const nav = theme.Nav();
      const productUrl = $(this).attr('href');

      // Cancel current request if one exists
      if (theme.currentQuickbuyRequest) {
        theme.currentQuickbuyRequest.abort();
      }

      showThemeModal(`<div class="theme-modal theme-modal--fullscreen theme-modal--quickbuy -light" id="quick-buy-modal" role="dialog" aria-modal="true"/>
                        <a href="#" data-modal-close class="modal-close">&times;</a>
                        <div class="theme-modal__loading">${theme.icons.loading}</div>
                    </div>`, 'quick-buy', null);

      // load in content
      var ajaxUrl = productUrl;
      // ajaxUrl += ajaxUrl.indexOf('?') >= 0 ? '&view=ajax' : '?view=ajax';
      theme.currentQuickbuyRequest = $.get(ajaxUrl, function (response) {
        const $quickbuyModal = $('#quick-buy-modal');
        const $productDetail = $('<div>' + response + '</div>').find('.section-product-template');
        const $section = $productDetail.find('[data-section-type="product-template"]')[0];

        //Prepare the html
        $productDetail.find('.store-availability-container-outer').remove();
        $productDetail.find('[data-show-in-quickbuy="false"]').remove();
        $productDetail.find('.theme-gallery--zoom-enabled').removeClass('theme-gallery--zoom-enabled');
        $productDetail.find('.product-area__details__title').wrapInner($('<a>').attr('href', productUrl).attr('data-cc-animate-click', 'true'));
        $productDetail.find('.product-detail__more_details a').attr('href', productUrl);

        //Display the html
        $quickbuyModal.find('.theme-modal__loading').replaceWith($productDetail);

        //Load the section etc
        theme.initAnimateOnScroll();

        //Init the product template section
        theme.ProductTemplateSection.onSectionLoad($section, true);

        //Initialise any components
        theme.initComponents($quickbuyModal);

        //Load shopify payments button
        theme.initShopifyPaymentButtons($quickbuyModal);

        $(window).one('ccModalClosing', function () {
          theme.ProductTemplateSection.onSectionUnload($section, true);
        });

      }).always(function () {
        theme.currentQuickbuyRequest = false;
      });

      return false;
    });
  });
  ;
  class ProductBlockInstance {
    constructor(container) {
      this.productBlock = container;
      this.productBlockImageContainer = this.productBlock.querySelector('.image');
      this.imageContainer = this.productBlock.querySelector('.image-inner');
      this.swatchesContainer = this.productBlock.querySelector('.cc-swatches');

      this.slideDuration = 1000;
      this.swatchImagesPreloaded = false;
      this.imageSliderLoaded = false;
      this.widths = [460, 540, 720, 900, 1080, 1296, 1512, 1728, 2048];

      this.imageWidth;
      this.hoverTimeout;
      this.preloadedImages = [];
      this.swatches = [];

      this.bindEvents();

      if (this.productBlock.querySelector('[data-section-type="background-video"]')) {
        this.initImageSlider();
      }
    }

    /**
     * Shows the next image in the product block
     */
    showNextSlideImage() {
      this.hoverTimeout = setTimeout(() => {
        const slides = this.imageContainer.querySelectorAll('.product-block--slide');
        if (slides && slides.length > 1) {
          if (!this.imageContainer.querySelector('.product-block--slide.-in')) {
            this.imageContainer.querySelector('.image__first').classList.add('-out');
            slides[1].classList.add('-in');
          } else {
            for (let i = 0; i < slides.length; i++) {
              //Trigger the next one to be visible
              if (slides[i].classList.contains('-in')) {
                slides[i].classList.remove('-in');
                if (i === slides.length - 1) {
                  //If this is the last slide, loop round
                  this.destroyImageSliderLoadingBar();
                  slides[0].classList.add('-in');
                  this.initImageSliderLoadingBar();
                } else {
                  //Show the next image
                  slides[i + 1].classList.add('-in');
                }
                break;
              }
            }
          }
        }
        this.showNextSlideImage();
      }, this.slideDuration);
    }

    /**
     * Show a specific slide with the passed image
     * @param imageUrl
     */
    showSpecificSlideImage(imageUrl) {
      const imageUrlStart = imageUrl.substring(0, imageUrl.lastIndexOf('_'));
      const nextSlide = this.imageContainer.querySelector(`.product-block--slide[src^="${imageUrlStart}"]`);
      if (nextSlide) {
        const currentSlide = this.imageContainer.querySelector(`.product-block--slide.-in`);
        if (currentSlide) {
          currentSlide.classList.remove('-in');
        }

        this.imageContainer.querySelector('.image__first').classList.add('-out');

        nextSlide.classList.add('-in');
      } else {
        console.warn('No next slide for ', imageUrlStart);
      }
    }

    /**
     * Preload an image
     * @param imageUrl
     */
    preloadImage(imageUrl) {
      if (!this.preloadedImages.includes(imageUrl)) {
        const imageElem = new Image();
        imageElem.src = imageUrl;
        this.preloadedImages.push(imageUrl);
      }
    }

    /**
     * Resolves the image url for the passed placeholder image url
     * @param url
     * @returns {*}
     */
    getImageUrl(url) {
      //Up the image width to get a decent quality image for retina
      const imageContainerWidth = theme.device.isRetinaDisplay() ? this.productBlock.clientWidth * 2 : this.productBlock.clientWidth;
      for (let i = 0; i < this.widths.length; i++) {
        if (this.widths[i] >= imageContainerWidth) {
          this.imageWidth = this.widths[i];
          return url.replace('{width}', this.widths[i]);
        }
      }
    }

    /**
     * Initialises the image slider for this product block
     */
    initImageSlider() {
      if (this.productBlock) {
        const allImages = this.productBlock.dataset.productImages;
        if (allImages && !this.imageSliderLoaded) {
          const allImagesArr = allImages.split(',');
          let sliderHtml = "";
          allImagesArr.forEach((image) => {
            sliderHtml += `<img class="product-block--slide" tabindex="-1" src="${this.getImageUrl(image)}"/>`;
          });

          this.imageContainer.insertAdjacentHTML('beforeend', sliderHtml);
          this.imageSliderLoaded = true;
        }
      }
    }

    /**
     * Destroys the image slider
     */
    destroyImageSlider() {
      if (this.imageSliderLoaded) {
        const slides = this.imageContainer.querySelectorAll('.product-block--slide');
        if (slides) {
          slides.forEach((slide) => {
            slide.remove();
          });
        }
        this.imageSliderLoaded = false;
      }
    }

    /**
     * When the mouse hovers a swatch - replace the main image
     * @param e
     */
    handleMouseEnterSwatch(e) {
      if (e.target.dataset.variantImage) {
        if (!this.imageSliderLoaded) {
          this.initImageSlider();
        }
        const newUrl = this.getImageUrl(e.target.dataset.variantImage);
        this.showSpecificSlideImage(newUrl);
      }
    }

    /**
     * Remove focus from the image slider slides
     * @param e
     */
    handleMouseLeaveSwatch(e) {
      const currentSlide = this.imageContainer.querySelector(`.product-block--slide.-in`);
      if (currentSlide) {
        currentSlide.classList.remove('-in');
      }

      this.imageContainer.querySelector('.image__first').classList.remove('-out');
    }

    /**
     * On mobile, don't redirect the page when a swatch is clicked
     * @param e
     */
    handleClickSwatch(e) {
      e.preventDefault();
    }

    /**
     * Preload all swatch images and init the slider on mouseover the product block
     * @param e
     */
    handleMouseEnterProductBlock(e) {
      //Preload swatch images if present
      if (!this.swatchImagesPreloaded) {
        this.productBlock.querySelectorAll('.cc-swatches a').forEach((swatch) => {
          if (swatch.dataset.variantImage) {
            this.preloadImage(this.getImageUrl(swatch.dataset.variantImage));
          }
        });
        this.swatchImagesPreloaded = true;
      }

      //Init the image slider
      if (this.productBlock.dataset.productImages && !this.imageSliderLoaded) {
        if (this.productBlock.classList.contains('all-images')) {
          this.initImageSlider();
        } else {
          setTimeout(this.initImageSlider, 500);
        }
      }
    }

    /**
     * Show the next image in the slider when hovering over the image
     * @param e
     */
    handleEnterImageContainer(e) {
      if (this.productBlock.classList.contains('all-images')) {
        this.showNextSlideImage();

        //Init the loading bar
        this.initImageSliderLoadingBar();
      }
    }

    /**
     * Mouse leaves a product block
     * @param e
     */
    handleLeaveImageContainer(e) {
      clearTimeout(this.hoverTimeout);

      if (this.imageSliderLoaded) {
        const activeSlide = this.imageContainer.querySelector('.product-block--slide.-in');
        if (activeSlide) {
          activeSlide.classList.remove('-in');
          this.imageContainer.querySelector('.image__first').classList.remove('-out');
        }

        this.destroyImageSliderLoadingBar();
      }
    }

    /**
     * Creates and starts the image slider loading bar
     */
    initImageSliderLoadingBar() {
      const loadingBarAnimateDelay = 100;
      const slides = this.imageContainer.querySelectorAll('.product-block--slide');
      let transitionDuration = slides.length * this.slideDuration - loadingBarAnimateDelay;
      const loadingBar = document.createElement('div');
      loadingBar.classList.add('loading-bar');
      loadingBar.style.transitionDuration = transitionDuration + 'ms';
      this.productBlockImageContainer.append(loadingBar);
      setTimeout(() => {
        loadingBar.classList.add('-in');
      }, loadingBarAnimateDelay);
    }

    /**
     * Remove the image slider loading bar
     */
    destroyImageSliderLoadingBar() {
      const loadingBar = this.productBlockImageContainer.querySelector('.loading-bar');
      if (loadingBar) {
        loadingBar.remove();
      }
    }

    /**
     * When the window is resized, check if image quality needs updating and if so destroy
     * the sliders (which re-init when needed)
     */
    handleWindowResize() {
      if (this.imageWidth && this.productBlock.clientWidth > this.imageWidth) {
        for (let i = 0; i < this.widths.length; i++) {
          if (this.widths[i] >= this.productBlock.clientWidth && this.widths[i] > this.imageWidth) {
            this.destroyImageSlider();
            break;
          }
        }
      }
    }

    handlePageHide() {
      this.mouseLeaveImageContainerHandler.call(this);
    }

    /**
    * Bind various listeners
    */
    bindEvents() {
      this.focusSwatchHandler = this.handleMouseEnterSwatch.bind(this);
      this.mouseEnterSwatchHandler = theme.debounce(this.handleMouseEnterSwatch.bind(this), 150);
      this.mouseLeaveSwatchHandler = theme.debounce(this.handleMouseLeaveSwatch.bind(this), 150);
      this.touchDeviceClickHandler = this.handleClickSwatch.bind(this);
      this.mouseEnterProductBlockHandler = this.handleMouseEnterProductBlock.bind(this);
      this.mouseEnterImageContainerHandler = this.handleEnterImageContainer.bind(this);
      this.mouseLeaveImageContainerHandler = this.handleLeaveImageContainer.bind(this);
      this.windowResizeHandler = theme.debounce(this.handleWindowResize.bind(this));
      this.pageHideHandler = this.handlePageHide.bind(this);

      this.productBlock.querySelectorAll('.cc-swatches a').forEach((swatch) => {
        swatch.addEventListener('mouseenter', this.mouseEnterSwatchHandler);
        swatch.addEventListener('focus', this.focusSwatchHandler);

        this.swatches.push(swatch);

        if (theme.device.isTouch()) {
          swatch.addEventListener('click', this.touchDeviceClickHandler);
        }
      });

      if (this.swatchesContainer) {
        this.swatchesContainer.addEventListener('mouseleave', this.mouseLeaveSwatchHandler);
      }

      if (window.innerWidth >= 768 || Shopify.designMode) {
        this.productBlock.addEventListener('mouseenter', this.mouseEnterProductBlockHandler);
        this.imageContainer.addEventListener('mouseenter', this.mouseEnterImageContainerHandler);
        this.imageContainer.addEventListener('mouseleave', this.mouseLeaveImageContainerHandler);
      }
      window.addEventListener('resize', this.windowResizeHandler);
      window.addEventListener('pagehide', this.pageHideHandler);
    }

    /**
     * Destroy the listeners
     */
    destroy() {
      this.swatches.forEach((swatch) => {
        swatch.removeEventListener('mouseenter', this.mouseEnterSwatchHandler);
        swatch.removeEventListener('click', this.touchDeviceClickHandler);
      });
      this.productBlock.removeEventListener('mouseenter', this.mouseEnterProductBlockHandler);
      this.productBlock.removeEventListener('mouseenter', this.mouseEnterImageContainerHandler);
      this.productBlock.removeEventListener('mouseleave', this.mouseLeaveImageContainerHandler);
      window.removeEventListener('resize', this.windowResizeHandler);
      window.removeEventListener('pagehide', this.pageHideHandler);

      if (this.swatchesContainer) {
        this.swatchesContainer.removeEventListener('mouseleave', this.mouseLeaveSwatchHandler);
      }
    }
  }

  class ProductBlock extends ccComponent {
    constructor() {let name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'product-block';let cssSelector = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : `.cc-${name}:not(.cc-initialized)`;
      super(name, cssSelector);
    }

    init(container) {
      super.init(container);
      this.registerInstance(container, new ProductBlockInstance(container));
    }

    destroy(container) {
      this.destroyInstance(container);
      super.destroy(container);
    }
  }

  new ProductBlock();
  ;

  /*================ Sections ================*/
  theme.HeaderSection = new function () {
    let c;
    let currentScrollTop = 0;
    const default_threshold = 100;
    const $announcementBar = $('.cc-announcement');

    handleScroll = function (nav, positioning, opacity) {
      if (opacity === 'opaque_on_scroll' || opacity === 'opaque_on_scroll_alt') {
        if ($(window).scrollTop() < 100) {
          nav.bar.turnOpaque(false);
        } else {
          nav.bar.turnOpaque(true);
        }
      } else if (opacity !== 'opaque') {
        nav.bar.turnOpaque(false);
      }

      var scrollTop = $(window).scrollTop();

      if ((positioning === 'peek' || nav.bar.isAnnouncementBar() && positioning == "sticky") && scrollTop > 100) {
        currentScrollTop = scrollTop;

        if (positioning != "sticky") {
          if (c < currentScrollTop && scrollTop > default_threshold) {
            nav.bar.hide(true);
          } else if (c > currentScrollTop && !(scrollTop <= 50)) {
            nav.bar.hide(false);
          }
        }

        c = currentScrollTop;

      } else {
        nav.bar.hide(false);
      }

      if ((positioning == "sticky" || positioning == "peek") && $announcementBar.length > 0) {
        if (scrollTop <= 50) {
          nav.bar.hideAnnouncement(false);
        } else {
          nav.bar.hideAnnouncement(true);
        }
      }
    };

    this.onSectionLoad = function (target) {
      theme.addControlPaddingToModal();
      $('body').toggleClass('modal-active', $('.theme-modal.reveal').length > 0);
      $('#page-menu a', target).attr('tabindex', '-1');
      $('#page-menu .main-nav li:has(ul)', target).addClass('has-children');
      $('#page-menu.nav-uses-modal .main-nav li.has-children > a', target).append('<span class="arr">' + theme.icons.chevronRight + '</span>');
      $('.disclosure', target).each(function () {
        $(this).data('disclosure', new theme.Disclosure($(this)));
      });

      const nav = new theme.Nav();
      const positioning = nav.bar.getPositionSetting();
      const opacity = nav.bar.getOpacitySetting();

      if (opacity === "opaque") {
        $('body').addClass('nav-opaque');
      } else {
        $('body').removeClass('nav-opaque');
      }

      if (positioning === "inline") {
        $('body').addClass('nav-inline');
      } else {
        $('body').removeClass('nav-inline');
      }

      if (opacity !== 'opaque') {
        $('body').addClass('nav-transparent');
      } else {
        $('body').removeClass('nav-transparent');
      }

      if (nav.bar.isAnnouncementBar()) {
        $('body').addClass('showing-announcement');
      } else {
        $('body').removeClass('showing-announcement');
      }

      if (opacity === 'opaque_on_scroll' || opacity === 'opaque_on_scroll_alt' || positioning === 'peek' || nav.bar.isAnnouncementBar()) {
        currentScrollTop = 0;
        $(window).on('throttled-scroll.nav', function () {
          handleScroll(nav, positioning, opacity);
        });
      }

      $(document).on('click.video-section', '.video-container__play', function () {
        if (theme.viewport.isXs()) {
          nav.bar.fadeOut(true);
        }
      });

      $(document).on('click.video-section', '.video-container__stop', function () {
        if (theme.viewport.isXs()) {
          nav.bar.fadeOut(false);
        }
      });

      // Keep the logo width equal to toolbar width
      if (nav.bar.hasInlineLinks() && nav.bar.hasLocalization()) {
        const $logo = $('.logo', target);
        const $toolbarRight = $('.nav-right-side', target);

        function doNavResizeEvents() {
          if (theme.viewport.isXlg() && $toolbarRight.width() > $logo.width()) {
            $logo.css('width', $toolbarRight.outerWidth() - 20 + 'px');
          } else {
            $logo.css('width', '');
          }
        }

        $(window).on('debouncedresize.headerSection doNavResizeEvents.headerSection', doNavResizeEvents).trigger('doNavResizeEvents');

        const event = new CustomEvent("cc-header-updated");
        window.dispatchEvent(event);
      }

      //Lazy load nav promo images
      setTimeout(function () {
        $('.lazyload--manual', target).removeClass('lazyload--manual').addClass('lazyload');
      }, 5000);

      theme.checkViewportFillers();
      theme.assessAltLogo();
      $(window).trigger('cc-header-updated');
    };

    this.onSectionUnload = function (target) {
      $('.disclosure', target).each(function () {
        $(this).data('disclosure').unload();
      });
      $(window).off('throttled-scroll.nav');
      $(window).off('headerSection');
      $(document).on('click.video-section');
    };
  }();

  theme.FooterSection = new function () {
    this.onSectionLoad = function (container) {
      this.footerSectionElem = container.parentElement;

      $('.disclosure', container).each(function () {
        $(this).data('disclosure', new theme.Disclosure($(this)));
      });

      // Observe changes to the disclosure toggles
      this.observer = new MutationObserver(this.functions.observeMutation.bind(this));
      container.querySelectorAll('.disclosure__toggle').forEach((disclosureToggle) => {
        this.observer.observe(disclosureToggle, { attributes: true });
      });
    };

    this.onSectionUnload = function (container) {
      $('.disclosure', container).each(function () {
        $(this).data('disclosure').unload();
      });

      this.observer.disconnect();
    };

    this.functions = {
      observeMutation: function (mutations) {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes" && mutation.attributeName === "aria-expanded") {
            this.footerSectionElem.classList.toggle('disclosure--open',
            mutation.target.getAttribute('aria-expanded') === 'true');
          }
        });
      }
    };
  }();

  theme.SlideshowSection = new function () {
    this.onSectionLoad = function (target) {
      theme.initContentSlider(target);
      $(window).trigger('slideshowfillheight');
      theme.checkViewportFillers();
      theme.assessAltLogo();
    };

    this.onSectionUnload = function (target) {
      $('.slick-slider', target).slick('unslick').off('init');
      $(window).off('.slideshowSection');
    };

    this.onBlockSelect = function (target) {
      $(target).closest('.slick-slider').
      slick('slickGoTo', $(target).data('slick-index')).
      slick('slickPause');
    };

    this.onBlockDeselect = function (target) {
      $(target).closest('.slick-slider').
      slick('slickPlay');
    };
  }();

  theme.FeaturedBlogSection = new function () {
    this.onSectionLoad = function (target) {
      if ($('.carousel-blog', target).length) {
        const $swiperCont = $('.swiper-container', target);
        if ($swiperCont.length === 1) {
          theme.initProductSlider($swiperCont, true);
        }
      }

      if ($('.slideshow-blog', target).length) {
        theme.initContentSlider(target, function (slide) {
          $('.slideshow-blog__titles__active', target).removeClass('slideshow-blog__titles__active');
          $(`[data-go-to-slide="${slide}"]`, target).parent().addClass('slideshow-blog__titles__active');
        });

        const $slideshowTitles = $('.slideshow-blog__titles', target);

        if ($('.slideshow[data-title-navigation="true"]', target).length) {
          function checkTitleNavHeight() {
            if (theme.viewport.isSm()) {
              $('.overlay-type .inner', target).css('padding-bottom', $slideshowTitles.height() + 50 + 'px');
            } else {
              $('.overlay-type .inner', target).removeAttr('style');
            }
          }
          checkTitleNavHeight();
          $(window).on('debouncedresize.titleNavHeight', checkTitleNavHeight);

          $('[data-go-to-slide]', target).on('click', function () {
            const slideNum = $(this).data('go-to-slide');
            $('.slideshow', target).slick('slickGoTo', slideNum).slick('slickPause');
            $('.slideshow-blog', target).addClass('slideshow--paused');;

            return false;
          });

          $('[data-go-to-slide]:first', target).parent().addClass('slideshow-blog__titles__active');
        }

        $(window).trigger('slideshowfillheight');
      }

      theme.checkViewportFillers();
      theme.assessAltLogo();
    };

    this.onSectionUnload = function (target) {
      $('.slick-slider', target).slick('unslick').off('init');
      $(window).off('debouncedresize.titleNavHeight');
      $('[data-go-to-slide]', target).off('click');
    };
  }();

  theme.ImageWithTextOverlay = new function () {
    var _ = this;
    _.checkTextOverImageHeights = function () {
      $('[data-section-type="image-with-text-overlay"], [data-nested-section-type="image-with-text-overlay"]').each(function () {
        var $imageContainer = $('.rimage-outer-wrapper', this);
        var imageHeight = $('.rimage-wrapper', this).outerHeight();
        var textVerticalPadding = parseInt($('.overlay', this).css('padding-top'));
        var textHeight = $('.overlay__content', this).height() + textVerticalPadding * 2;
        if (textHeight > imageHeight + 2) {// +2 for rounding errors
          $imageContainer.css('height', textHeight);
        } else {
          $imageContainer.css('height', '');
        }
      });
    };

    this.onSectionLoad = function (target) {
      $(window).off('.imageWithTextOverlaySection');
      if ($('.overlay__content', target).length) {
        $(_.checkTextOverImageHeights);
        $(window).on('debouncedresize.imageWithTextOverlaySection', _.checkTextOverImageHeights);
      }
      theme.checkViewportFillers();
    };

    this.onSectionUnload = function (target) {
      $(window).off('.imageWithTextOverlaySection');
    };
  }();

  theme.ImageBesideImageSection = new function () {
    var _ = this;
    _.checkTextOverImageHeights = function () {
      $('.image-beside-image__image').each(function () {
        var $imageContainer = $('.rimage-outer-wrapper', this);
        var imageHeight = $('.rimage-wrapper', this).outerHeight();
        var textVerticalPadding = parseInt($('.overlay', this).css('padding-top'));
        var textHeight = $('.overlay__content', this).height() + textVerticalPadding * 2;
        if (textHeight > imageHeight + 2) {// +2 for rounding errors
          $imageContainer.css('height', textHeight);
        } else {
          $imageContainer.css('height', '');
        }
      });
    };

    this.onSectionLoad = function (target) {
      $(window).off('.imageBesideImageSection');
      if ($('.overlay__content', target).length) {
        $(_.checkTextOverImageHeights);
        $(window).on('debouncedresize.imageBesideImageSection', _.checkTextOverImageHeights);
      }
      theme.checkViewportFillers();
    };

    this.onSectionUnload = function (target) {
      $(window).off('.imageBesideImageSection');
    };
  }();

  theme.ProductTemplateSection = new function () {
    const nav = theme.Nav();
    let galleries = {};

    this.onSectionLoad = function (target) {let isQuickbuy = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      const sectionUniqueId = new Date().getTime();
      $(target).attr('data-section-id', sectionUniqueId);

      const isFeaturedProduct = $(target).data('is-featured-product') || false;

      /// Init store availability if applicable
      if (!isFeaturedProduct && !isQuickbuy && $('[data-store-availability-container]', target).length) {
        this.storeAvailability = new theme.StoreAvailability($('[data-store-availability-container]', target)[0]);
      }

      // header assessment first (affects gallery height)
      theme.checkViewportFillers();
      theme.assessAltLogo();

      if (nav.bar.isCurrentlyOpaque() && !isFeaturedProduct && !isQuickbuy) {
        $('body').removeClass('header-section-overlap');
      }

      /// Product page upper gallery
      const $gallery = $('.theme-gallery', target);
      if ($gallery.length > 0) {
        galleries[sectionUniqueId] = new theme.ProductMediaGallery(
        $gallery, $('.theme-gallery-thumb', target), isFeaturedProduct, isQuickbuy, sectionUniqueId);
      }

      if (!isFeaturedProduct) {
        const $stickyAddToCart = $('.product-area__add-to-cart-xs', target);
        let stickyAddToCartInitialised = !$stickyAddToCart.length;
        let stickyAddToCartIsUnstuck = false;
        const productSection = $('.section-product-template')[0];

        /// Work out the tallest product tab and compensate the height of the details area
        /// (for position:sticky to work in this case, it needs a fixed height).
        function resizeProductDetails() {
          if (theme.viewport.isXs()) {
            if (!stickyAddToCartInitialised && !isQuickbuy) {
              $(window).on('throttled-scroll.sticky-add-to-cart', function () {
                if (productSection.getBoundingClientRect().bottom < $(window).outerHeight()) {
                  if (!stickyAddToCartIsUnstuck) {
                    $stickyAddToCart.addClass('-out');
                    stickyAddToCartIsUnstuck = true;
                  }
                } else {
                  if (stickyAddToCartIsUnstuck) {
                    $stickyAddToCart.removeClass('-out');
                    stickyAddToCartIsUnstuck = false;
                  }
                }
              });

              $('.product-area__add-to-cart-xs button', target).on('click', function (e) {
                const btnSubmit = document.querySelector('.product-detail__form button[type="submit"]');
                // Using 'click' instead of 'submit' to get the form default errors
                btnSubmit.click();
              });

              stickyAddToCartInitialised = true;
            }
          }
        }

        $(window).on(`debouncedresizewidth.productDetails${sectionUniqueId}`, resizeProductDetails);
        $(window).on(`cc-header-updated.productDetails${sectionUniqueId}`, resizeProductDetails);
        $(window).on(`shopify:section:reorder.productDetails${sectionUniqueId}`, resizeProductDetails);
        resizeProductDetails();
      }

      /// Boxed-options (do before initProductOptions - which applies classes to these boxes)
      theme.convertOptionsToBoxes(target);

      /// Product options
      theme.OptionManager.initProductOptions($(target));

      /// Visual style of dropdowns
      $('select:not(.original-selector)').selectReplace().closest('.selector-wrapper').addClass('has-pretty-select');

      /// Size chart
      $('.size-chart-link', target).on('click', function () {
        $.colorbox({
          inline: true,
          fixed: true,
          maxHeight: "80%",
          href: '#size-chart-content > .size-chart',
          onOpen: () => {
            theme.viewport.scroll.lock();
          },
          onClosed: () => {
            theme.viewport.scroll.unlock();
          }
        });
        return false;
      });

      // Keep colour swatches updated
      $(window).on(`cc-variant-updated.product-swatches${sectionUniqueId}`, (e, args) => {
        const $swatchesContainer = $('.cc-swatches', target);
        if ($swatchesContainer.length) {
          $swatchesContainer.find('.cc-swatches__label').remove();
          $swatchesContainer.find('label').append(`<span class="cc-swatches__label">${$swatchesContainer.find('.active').text()}</span>`);
        }
      });

      /// Trigger the animations
      theme.initAnimateOnScroll();
      theme.checkViewportFillers();
      theme.initShopifyPaymentButtons($(target));
    };

    this.onSectionUnload = function (target, isQuickbuy) {
      const sectionUniqueId = $(target).attr('data-section-id');

      if (!isQuickbuy) {
        $(window).off('throttled-scroll.sticky-add-to-cart');
      }

      $(window).off(`.productDetails${sectionUniqueId}`);
      $(window).off(`cc-variant-updated.product-swatches${sectionUniqueId}`);
      $('.spr-container', target).off('click');
      $('.theme-gallery-thumb', target).off('click');
      $('.size-chart-link', target).off('click');
      $('.product-area__add-to-cart-xs button', target).off('click');

      theme.OptionManager.unloadProductOptions($(target));

      if (galleries[sectionUniqueId]) {
        galleries[sectionUniqueId].destroy();
      } else {
        console.warn('No galleries found');
      }

      if (this.storeAvailability && !isQuickbuy) {
        this.storeAvailability.onSectionUnload();
      }
    };
  }();

  theme.FilterManager = new function () {
    this.onSectionLoad = function (container) {
      this.namespace = theme.namespaceFromSection(container);
      this.$container = $(container);

      // ajax filter & sort
      if (this.$container.data('ajax-filtering')) {
        // ajax load on link click
        this.$container.on('click' + this.namespace, '.pagination a,.active-filter-controls a', this.functions.ajaxLoadLink.bind(this));

        // ajax load form submission
        this.$container.on('change' + this.namespace + ' submit' + this.namespace, '#FacetsForm',
        theme.debounce(this.functions.ajaxLoadForm.bind(this), 700));

        // handle back button
        this.registerEventListener(window, 'popstate', this.functions.ajaxPopState.bind(this));
      } else {
        this.$container.on('change' + this.namespace, '#FacetsForm', this.functions.submitForm);
      }

      // click on the mobile 'show filters' button
      this.$container.on('click' + this.namespace, '[data-show-filter]', this.functions.toggleFilter.bind(this));

      // the search query is updated
      this.$container.on('submit' + this.namespace, '#search-page-form', this.functions.updateSearchQuery.bind(this));

      theme.loadInfiniteScroll(container);
      this.functions.refreshSelects();
    };

    this.onSectionUnload = function (container) {
      this.$container.off(this.namespace);
      $(window).off(this.namespace);
      $(document).off(this.namespace);
      theme.unloadInfiniteScroll();
    };

    this.functions = {
      submitForm: function (e) {
        e.currentTarget.submit();
      },

      updateSearchQuery: function (e) {
        const $form = this.$container.find('#FacetsForm');
        if ($form.length) {
          e.preventDefault();
          $form.find('[name="q"]').val($(e.currentTarget).find('[name="q"]').val());

          if (this.$container.data('ajax-filtering')) {
            const ajaxLoadForm = this.functions.ajaxLoadForm.bind(this);
            ajaxLoadForm({
              type: null,
              currentTarget: $form[0]
            });
          } else {
            $form.submit();
          }
        }
      },

      toggleFilter: function () {
        const $filterBtn = $('[data-show-filter]', this.$container);
        const $productFilter = $('.cc-product-filter', this.$container);
        const nav = theme.Nav();

        if ($productFilter.hasClass('-in')) {
          $filterBtn.text($filterBtn.data('open-text'));
          nav.bar.fadeOut(false);
        } else {
          $filterBtn.text($filterBtn.data('close-text'));
          nav.bar.fadeOut(true);
        }

        $productFilter.toggleClass('-in');

        return false;
      },

      ajaxLoadLink: function (evt) {
        evt.preventDefault();
        this.functions.ajaxLoadUrl.call(this, $(evt.currentTarget).attr('href'));
      },

      ajaxLoadForm: function (evt) {
        if (evt.type === 'submit') {
          evt.preventDefault();
        }

        let queryVals = [];
        evt.currentTarget.querySelectorAll('input, select').forEach((input) => {
          if (
          (input.type !== 'checkbox' && input.type !== 'radio' || input.checked // is an active input value
          ) && input.value !== '' // has a value
          ) {
            // if no value, check for the default and include
            if (input.value === '' && input.dataset.currentValue) {
              queryVals.push([input.name, encodeURIComponent(input.dataset.currentValue)]);
            } else {
              queryVals.push([input.name, encodeURIComponent(input.value)]);
            }
          }
        });

        evt.currentTarget.querySelectorAll('[data-current-value]').forEach((input) => {
          input.setAttribute('value', input.dataset.currentValue);
        });
        const data = new FormData(evt.currentTarget);
        const queryString = new URLSearchParams(data).toString();
        this.functions.ajaxLoadUrl.call(this, '?' + queryString);
      },

      ajaxPopState: function (event) {
        this.functions.ajaxLoadUrl.call(this, document.location.href, true);
      },

      initFilterResults: function () {
        theme.loadInfiniteScroll(this.container);
        theme.inlineVideos.init(this.container);

        // init scroll animations
        theme.initAnimateOnScroll();

        // init theme components
        const $components = this.$container.closest('[data-components]');
        if ($components.length) {
          const components = $components.data('components').split(',');
          components.forEach(function (component) {
            $(document).trigger('cc:component:load', [component, $components[0]]);
          }.bind(this));
        }
      },

      refreshSelects: function () {
        $('select:not(.original-selector)', this.$container).selectReplace().closest('.selector-wrapper').addClass('has-pretty-select');
      },

      ajaxLoadUrl: function (url, noPushState) {
        const _this = this;

        if (!noPushState) {
          // update url history
          var fullUrl = url;
          if (fullUrl.slice(0, 1) === '/') {
            fullUrl = window.location.protocol + '//' + window.location.host + fullUrl;
          }
          window.history.pushState({ path: fullUrl }, '', fullUrl);
        }

        // start fetching URL
        let refreshContainerSelector = '[data-ajax-container]',
          $ajaxContainers = this.$container.find(refreshContainerSelector);

        // loading state
        $ajaxContainers.addClass('cc-product-filter-container--loading');
        $ajaxContainers.find('.product-list').append(`<span class="loading" aria-label="${theme.strings.loading}">${theme.icons.loading} </span>`);
        theme.unloadInfiniteScroll(this.$container);
        theme.inlineVideos.destroy(this.$container);

        // fetch content
        if (this.currentAjaxLoadUrlFetch) {
          this.currentAjaxLoadUrlFetch.abort();
        }

        this.currentAjaxLoadUrlFetch = $.get(url, function (data) {
          this.currentAjaxLoadUrlFetch = null;

          // save active element
          if (document.activeElement) {
            this.activeElementId = document.activeElement.id;
          }

          // replace contents
          const $newAjaxContainers = $(`<div>${data}</div>`).find(refreshContainerSelector);
          $newAjaxContainers.each(function (index) {
            const $newAjaxContainer = $(this);

            // preserve accordion state
            $($ajaxContainers[index]).find('.cc-accordion-item').each(function () {
              const accordionIndex = $(this).closest('.cc-accordion').index();
              if ($(this).hasClass('is-open')) {
                $newAjaxContainer.find(`.cc-accordion:nth-child(${accordionIndex + 1}) .cc-accordion-item`).addClass('is-open').attr('open', '');
              } else {
                $newAjaxContainer.find(`.cc-accordion:nth-child(${accordionIndex + 1}) .cc-accordion-item`).removeClass('is-open').removeAttr('open');
              }
            });

            // maintain mobile filter menu state
            if ($('.cc-product-filter', _this.$container).length && $('.cc-product-filter', _this.$container).hasClass('-in')) {
              $newAjaxContainer.find('.cc-product-filter').addClass('-in');
            }

            $($ajaxContainers[index]).html($newAjaxContainer.html());
            _this.functions.refreshSelects();
          });

          // init js
          this.functions.initFilterResults.call(this);

          //Update the mobile 'Close filters' button text
          const $filterSidebar = $('.cc-product-filter', _this.$container);
          const $filterBtn = $('[data-show-filter]', _this.$container);
          if ($filterSidebar.length && $filterSidebar.hasClass('-in')) {
            let buttonText;
            let resultCount = $('.product-list', _this.$container).data('result-count');

            if (resultCount === 1) {
              buttonText = $filterBtn.data('result-count-text-singular').replace("[x]", resultCount);
            } else {
              buttonText = $filterBtn.data('result-count-text').replace("[x]", resultCount);
            }

            $filterBtn.text(buttonText);
          }

          // remove loading state
          $ajaxContainers.removeClass('cc-product-filter-container--loading');

          // restore active element
          if (this.activeElementId) {
            let el = document.getElementById(this.activeElementId);
            if (el) {
              el.focus();
            }
          }

          const $resultContainer = $('[data-ajax-scroll-to]:first', this.$container);
          if ($(window).scrollTop() - 200 > $resultContainer.offset().top) {
            theme.viewport.scroll.to($resultContainer, -1, 25);
          }
        }.bind(this));
      }
    };
  }();

  theme.ListCollectionsSection = new function () {
    this.onSectionLoad = function (target) {
    };
  }();

  theme.BlogTemplateSection = new function () {
    this.onSectionLoad = function (target) {
      /// Visual style of dropdowns
      $('select').selectReplace();

      theme.allowRTEFullWidthImages(target);
    };
  }();

  theme.ArticleTemplateSection = new function () {
    this.onSectionLoad = function (target) {
      theme.checkViewportFillers();
      theme.assessAltLogo();
      theme.allowRTEFullWidthImages(target);
    };
  }();

  theme.CartTemplateSection = new function () {
    this.onSectionLoad = function (target) {
      theme.cartNoteMonitor.load($('#cartform [name="note"]', target));

      // terms and conditions checkbox
      if ($('#cartform input#terms', target).length > 0) {
        $(document).on('click.cartTemplateSection', '#cartform [name="checkout"]:submit, .additional-checkout-buttons :submit, .additional-checkout-buttons input[type=image], a[href="/checkout"]', function () {
          if ($('#cartform input#terms:checked').length == 0) {
            alert(theme.strings.cartConfirmation);
            return false;
          }
        });
      }
    };

    this.onSectionUnload = function (target) {
      theme.cartNoteMonitor.unload($('#cartform [name="note"]', target));
      $(document).off('.cartTemplateSection');
    };
  }();

  theme.CollectionListSection = new function () {
    this.onSectionLoad = function (target) {
      const $swiperCont = $('.swiper-container', target);
      if ($swiperCont.length === 1) {
        theme.initProductSlider($swiperCont);
      }
    };
  }();

  theme.FeaturedCollectionSection = new function () {
    this.onSectionLoad = function (target) {
      const $swiperCont = $('.swiper-container', target);
      if ($swiperCont.length === 1) {
        theme.initProductSlider($swiperCont);
      }
    };
  }();

  theme.ProductRecommendations = new function () {
    this.onSectionLoad = function (container) {
      // Look for an element with class 'product-recommendations'
      var productRecommendationsSection = document.querySelector(".product-recommendations");

      if (productRecommendationsSection === null) {return;}

      // Create request and submit it using Ajax
      var request = new XMLHttpRequest();
      request.open("GET", productRecommendationsSection.dataset.url, true);
      request.onload = function () {
        if (request.status >= 200 && request.status < 300) {
          var container = document.createElement("div");
          container.innerHTML = request.response;
          productRecommendationsSection.innerHTML = container.querySelector(".product-recommendations").innerHTML;
          theme.initAnimateOnScroll();

          const $swiperCont = $('.section-product-recommendations .swiper-container');

          if ($swiperCont.length === 1) {
            theme.initProductSlider($swiperCont);
            setTimeout(() => {
              theme.inlineVideos.init(productRecommendationsSection.parentElement);
              new ProductBlock();
            }, 500);
          } else {
            console.warn('Unable to find .section-product-recommendations');
          }
        }
      };
      request.send();

    };

    this.onSectionUnload = function (container) {
      theme.inlineVideos.destroy(container);
    };
  }();

  theme.GallerySection = new function () {
    this.onSectionLoad = function (container) {
      var $carouselGallery = $('.gallery--mobile-carousel', container);
      if ($carouselGallery.length) {
        var assessCarouselFunction = function () {
          var isCarousel = $carouselGallery.hasClass('slick-slider'),
            shouldShowCarousel = theme.viewport.isXs();

          if (!shouldShowCarousel) {
            $('.lazyload--manual', $carouselGallery).removeClass('lazyload--manual').addClass('lazyload');
          }

          if (isCarousel && !shouldShowCarousel) {
            // Destroy carousel

            // - unload slick
            $carouselGallery.slick('unslick').off('init');
            $carouselGallery.removeAttr('data-transition');
            $carouselGallery.removeClass('slideshow');
            $carouselGallery.find('a, .gallery__item').removeAttr('tabindex').removeAttr('role');

            // - re-row items
            var rowLimit = $carouselGallery.data('grid');
            var $currentRow = null;
            $carouselGallery.find('.gallery__item').each(function (index) {
              if (index % rowLimit === 0) {
                $currentRow = $('<div class="gallery__row">').appendTo($carouselGallery);
              }
              $(this).appendTo($currentRow);
            });
          } else if (!isCarousel && shouldShowCarousel) {
            // Create carousel
            $carouselGallery.find('[data-cc-animate]').removeAttr('data-cc-animate');

            // - de-row items
            $carouselGallery.find('.gallery__item').appendTo($carouselGallery).addClass('slide');
            $carouselGallery.find('.gallery__row').remove();
            $carouselGallery.attr('data-transition', 'slide');
            $carouselGallery.addClass('slideshow');

            // - init carousel
            $carouselGallery.on('init', function () {
              $('.lazyload--manual', this).removeClass('lazyload--manual').addClass('lazyload');
            }).slick({
              autoplay: false,
              fade: false,
              speed: 600,
              infinite: true,
              useTransform: true,
              arrows: false,
              dots: true,
              cssEase: 'cubic-bezier(0.25, 1, 0.5, 1)',
              customPaging: function (slider, i) {
                return `<button class="custom-dot" type="button" data-role="none" role="button" tabindex="0">` +
                `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 30 30" xml:space="preserve">` +
                `<circle class="circle-one" cx="15" cy="15" r="13" />` +
                `<circle class="circle-two" cx="15" cy="15" r="13" />` +
                `</svg>` +
                `</button>`;
              }
            }).on('beforeChange', function (event, slick, currentSlide, nextSlide) {
              let $outgoingSlide = $(slick.$slides.get(currentSlide));
              $outgoingSlide.addClass('slick--leaving');
            }).on('afterChange', function (event, slick, currentSlide) {
              $(slick.$slides).filter('.slick--leaving').removeClass('slick--leaving');
            });
          }
        };

        assessCarouselFunction();
        $(window).on('debouncedresize.themeSection' + container.id, assessCarouselFunction);
      }
    };

    this.onSectionUnload = function (container) {
      $(window).off('.themeSection' + container.id);
      $('.slick-slider', container).each(function () {
        $(this).slick('unslick').off('init');
      });
    };

    this.onBlockSelect = function (block) {
      $(block).closest('.slick-slider').each(function () {
        $(this).slick('slickGoTo', $(this).data('slick-index')).slick('slickPause');
      });
    };

    this.onBlockDeselect = function (block) {
      $(block).closest('.slick-slider').each(function () {
        $(this).slick('slickPlay');
      });
    };
  }();

  theme.TestimonialsSection = new function () {
    let scrollax;

    this.onSectionLoad = function (container) {
      if (theme.settings.animationEnabledDesktop && theme.viewport.isSm()) {
        scrollax = new Scrollax(window).init();
      }
    };

    this.onSectionUnload = function (container) {
      if (scrollax && scrollax.Scrollax) {
        scrollax.Scrollax('destroy');
      }
    };
  }();

  theme.AccordionSection = new function () {
    this.onSectionLoad = function (container) {
      const event = new CustomEvent("cc-accordion-load");
      window.dispatchEvent(event);
    };

    this.onBlockSelect = function (container) {
      const accordionElem = container.querySelector('.cc-accordion-item:not(.is-open) .cc-accordion-item__title');
      if (accordionElem) {
        accordionElem.click();
      }
    };

    this.onSectionUnload = function (container) {
      const event = new CustomEvent("cc-accordion-unload");
      window.dispatchEvent(event);
    };
  }();

  theme.FaqSection = new function () {
    this.onSectionLoad = function (container) {
      this.intersectionObserver;
      this.namespace = theme.namespaceFromSection(container);
      this.container = container;
      this.pageContent = document.getElementById('page-content');
      this.sidebar = document.getElementById('faq-sidebar');
      this.accordions = this.pageContent.querySelectorAll('.cc-accordion-item__title');
      this.isScrolling = false;

      this.classNames = {
        questionContainerHidden: 'hidden'
      };

      //Init the FAQs area css classes
      this.functions.initFaqSections.call(this);
      window.addEventListener("shopify:section:load", this.functions.delayedInitFaqSections.bind(this));
      window.addEventListener("shopify:section:unload", this.functions.delayedInitFaqSections.bind(this));
      window.addEventListener("shopify:section:reorder", this.functions.initFaqSections.bind(this));

      //Init the search input
      this.searchInput = this.container.querySelector('#faq-search__input');
      if (this.searchInput) {
        this.registerEventListener(this.searchInput, 'change', this.functions.performSearch.bind(this));
        this.registerEventListener(this.searchInput, 'keyup', this.functions.performSearch.bind(this));
        this.registerEventListener(this.searchInput, 'paste', this.functions.performSearch.bind(this));
      }

      //Init the sidebar
      if (this.container.dataset.sidebarEnabled === "true") {
        this.functions.initSidebar.call(this);
        window.addEventListener("resize", this.functions.debounceUpdateSidebarPosition);
        window.addEventListener("shopify:section:load", this.functions.delayedInitSidebar.bind(this));
        window.addEventListener("shopify:section:unload", this.functions.delayedInitSidebar.bind(this));
        window.addEventListener("shopify:section:reorder", this.functions.initSidebar.bind(this));

        //Everytime an accordion is opened, reposition the sidebar
        this.accordions.forEach((accordion) => {
          accordion.addEventListener('click', this.functions.debounceUpdateSidebarPosition);
        });

        //Add css class to the body to indicate the sidebar is enabled
        document.body.classList.add('faq-sidebar-enabled');
      }

    };

    this.onSectionUnload = function (container) {
      //Destroy the sidebar
      if (this.container.dataset.sidebarEnabled === "true") {
        window.removeEventListener("resize", this.functions.debounceUpdateSidebarPosition);
        window.removeEventListener("shopify:section:load", this.functions.delayedInitSidebar);
        window.removeEventListener("shopify:section:unload", this.functions.delayedInitSidebar);
        window.removeEventListener("shopify:section:reorder", this.functions.initSidebar);
        document.body.classList.remove('faq-sidebar-enabled');
      }

      //Destroy the FAQs area
      window.removeEventListener("shopify:section:load", this.functions.delayedInitFaqSections);
      window.removeEventListener("shopify:section:unload", this.functions.delayedInitFaqSections);
      window.removeEventListener("shopify:section:reorder", this.functions.initFaqSections);
      document.querySelectorAll('.section-faq-accordion').forEach((section) => {
        section.classList.remove('section-faq-accordion');
      });

      //Unobserve intersections
      if (this.intersectionObserver) {
        this.pageContent.querySelectorAll('.section-faq-accordion h2 a').forEach(
        (accordion) => this.intersectionObserver.unobserve(accordion));
      }

      //Remove click bind from accordions
      this.accordions.forEach((accordion) => {
        accordion.removeEventListener('click', this.functions.updateSidebarPosition);
      });

      //Remove active search
      this.pageContent.classList.remove('faq-search-active');
    };

    this.functions = {
      //Add css classes to the consecutive accordion sections that follow the FAQ section
      initFaqSections: function () {
        //Remove the class
        this.pageContent.querySelectorAll('.section-faq-accordion').forEach((section) => section.classList.remove('section-faq-accordion'));

        //Re-add the class
        let foundFaqSection = false,foundNonAccordionSection = false;
        this.pageContent.querySelectorAll('.shopify-section').forEach((section) => {
          if (!foundFaqSection) {
            if (section.classList.contains('section-faq')) {
              foundFaqSection = true;
            }
          } else {
            if (section.classList.contains('section-accordion') && foundNonAccordionSection === false) {
              section.classList.add('section-faq-accordion');
            } else {
              foundNonAccordionSection = true;
            }
          }
        });
      },

      //Delay the init of the FAQs until sections have finished loading/unloading
      delayedInitFaqSections: function () {
        setTimeout(this.functions.initFaqSections.bind(this), 10);
      },

      //Handles search
      performSearch: function () {
        // defer to avoid input lag
        setTimeout((() => {
          const splitValue = this.searchInput.value.toLowerCase().split(' ');
          const questionContainers = this.pageContent.querySelectorAll('.section-faq-accordion .cc-accordion');

          // sanitise terms
          let terms = [];
          splitValue.forEach((t) => {
            if (t.length > 0) {
              terms.push(t);
            }
          });

          // add css to indicate whether a search is active
          if (terms.length > 0) {
            this.pageContent.classList.add('faq-search-active');
          } else {
            this.pageContent.classList.remove('faq-search-active');
          }

          // reset the found count
          const accordionSections = this.pageContent.querySelectorAll('.section-faq-accordion');
          if (accordionSections) {
            accordionSections.forEach((accordionSection) => {
              accordionSection.classList.remove('faq-first-answer');
              if (terms.length > 0) {
                accordionSection.dataset.foundCount = '0';
              } else {
                accordionSection.removeAttribute('data-found-count');
              }
            });
          }

          // search
          let noResults = true;
          questionContainers.forEach(((questionContainer) => {
            let foundCount = 0;
            if (terms.length) {
              let termFound = false;
              const matchContent = questionContainer.textContent.toLowerCase();
              terms.forEach((term) => {
                if (matchContent.includes(term)) {
                  if (noResults) {
                    questionContainer.closest('.section-accordion').classList.add('faq-first-answer');
                  }

                  termFound = true;
                  noResults = false;
                }
              });
              if (termFound) {
                questionContainer.classList.remove(this.classNames.questionContainerHidden);
                foundCount++;
              } else {
                questionContainer.classList.add(this.classNames.questionContainerHidden);
              }
            } else {
              questionContainer.classList.remove(this.classNames.questionContainerHidden);
            }

            // Update the found count of the section
            const sectionElem = questionContainer.closest('.section-accordion');
            sectionElem.dataset.foundCount = parseInt(sectionElem.dataset.foundCount) + foundCount;
          }).bind(this));

          //Show/hide the no results message
          if (noResults && terms.length) {
            this.container.classList.add('faq-no-results');
          } else {
            this.container.classList.remove('faq-no-results');
          }

          // Update the sidebar active links
          if (this.container.dataset.sidebarEnabled === "true") {
            const activeSidebar = this.sidebar.querySelector('.faq-sidebar--active');
            if (activeSidebar) {
              activeSidebar.classList.remove('faq-sidebar--active');
            }

            this.sidebar.querySelectorAll('a').forEach((link) => {
              const id = link.getAttribute('href').replace('#', '');
              const anchorElem = document.getElementById(id);
              if (anchorElem) {
                if (anchorElem.offsetParent === null) {
                  link.classList.add('faq-sidebar--disabled');
                } else {
                  link.classList.remove('faq-sidebar--disabled');

                  if (!this.sidebar.querySelector('.faq-sidebar--active')) {
                    link.classList.add('faq-sidebar--active');
                  }
                }
              }
            });
            this.functions.updateSidebarPosition();
          }

        }).bind(this), 10);
      },

      //Init the sticky sidebar
      initSidebar: function () {
        //Build the HTML of the sidebar from the FAQ accordion headings
        let anchorHtml = "";
        this.pageContent.querySelectorAll('.section-faq-accordion .section-heading h2').forEach((heading, index) => {
          const label = heading.innerText;
          const anchor = "faq-" + JSON.stringify(label.toLowerCase()).replace(/\W/g, '');
          heading.innerHTML = `<a id="${anchor}"></a>${label}`;
          anchorHtml += `<li><a href="#${anchor}" ${index === 0 ? 'class="faq-sidebar--active"' : ''}>${label}</a></li>`;
        });

        // Append the sidebar HTML
        const nav = new theme.Nav();
        const top = nav.bar.hasStickySetting() ? nav.bar.height() + 50 : 50;

        this.sidebar.innerHTML =
        `<div class="faq-sidebar__inner" style="top: ${parseInt(top)}px">
          ${this.container.dataset.sidebarTitle ? '<h3>' + this.container.dataset.sidebarTitle + '</h3>' : ''}
          <ol>${anchorHtml}</ol>
        </div>`;

        //Bind click events to each anchor in the sidebar
        this.sidebar.querySelectorAll('a').forEach((anchor) => {
          this.registerEventListener(anchor, 'click', this.functions.handleIndexClick.bind(this));
        });

        //Observe current quick link
        if ('IntersectionObserver' in window) {
          this.intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !this.isScrolling) {
                this.sidebar.querySelectorAll('a').forEach((link) => {
                  if (link.getAttribute('href').replace('#', '') ===
                  entry.target.getAttribute('id')) {
                    link.classList.add('faq-sidebar--active');
                  } else {
                    link.classList.remove('faq-sidebar--active');
                  }
                });
              }
            });
          }, {
            rootMargin: '0px 0px -70%'
          });

          this.pageContent.querySelectorAll('.section-faq-accordion h2 a').forEach(
          (accordion) => this.intersectionObserver.observe(accordion));
        }

        this.functions.updateSidebarPosition();
      },

      //Delay the init of the sidebar until sections have finished loading/unloading
      delayedInitSidebar: function () {
        setTimeout(this.functions.initSidebar.bind(this), 20);
      },

      //Calculates the position of the sidebar
      updateSidebarPosition: function () {
        const sidebar = document.getElementById('faq-sidebar');
        const faqSection = document.querySelector('.section-faq');
        let foundFaqSection = false,firstNonAccordionSection = null;
        if (faqSection) {
          // Find the section that terminates the FAQ area
          document.querySelectorAll('#page-content .shopify-section').forEach((section) => {
            if (!foundFaqSection) {
              if (section.classList.contains('section-faq')) {
                foundFaqSection = true;
              }
            } else if (firstNonAccordionSection === null && !section.classList.contains('section-accordion')) {
              firstNonAccordionSection = section;
            }
          });

          if (!firstNonAccordionSection) {
            firstNonAccordionSection = document.querySelector('.section-footer');
          }

          const faqSectionTop = faqSection.getBoundingClientRect().top + document.documentElement.scrollTop;
          let bodyPaddingTop = window.getComputedStyle(document.body).getPropertyValue("padding-top");
          bodyPaddingTop = parseInt(bodyPaddingTop.replace('px', ''));
          sidebar.style.top = faqSectionTop - bodyPaddingTop + 'px';

          if (firstNonAccordionSection) {
            const firstNonAccordionSectionTop = firstNonAccordionSection.getBoundingClientRect().top + document.documentElement.scrollTop;
            sidebar.style.height = firstNonAccordionSectionTop - faqSectionTop + 'px';

            const sidebarInner = sidebar.querySelector('.faq-sidebar__inner');
            if (sidebarInner) {
              sidebarInner.style.maxHeight = firstNonAccordionSectionTop - faqSectionTop - 100 + 'px';
            }
          }
        }
      },

      debounceUpdateSidebarPosition: theme.debounce(() => this.functions.updateSidebarPosition),

      handleIndexClick: function (e) {
        e.preventDefault();

        //Highlight the relevant index immediately
        const activeSidebar = this.sidebar.querySelector('.faq-sidebar--active');
        if (activeSidebar) {
          activeSidebar.classList.remove('faq-sidebar--active');
        }
        e.target.classList.add('faq-sidebar--active');

        this.isScrolling = true;
        theme.viewport.scroll.to(e.currentTarget.getAttribute('href'), -1, 50, () => {
          this.isScrolling = false;
        });
      }
    };
  }();

  theme.ScrollingBannerSection = new function () {
    this.onSectionLoad = function (target) {
      document.fonts.ready.then(() => target.querySelector('.marquee').classList.add('marquee--animate'));
    };
  }();


  jQuery(function ($) {
    lazySizesConfig.minSize = 200;
    const nav = theme.Nav();

    /// Visual style of dropdowns
    $('select:not(.original-selector)').selectReplace().closest('.selector-wrapper').addClass('has-pretty-select');

    /// General-purpose lightbox
    $('a[rel=lightbox]').colorbox();

    /// Galleries (only on large screens)
    if (theme.viewport.isSm()) {
      $('a[rel="gallery"]').colorbox({ rel: 'gallery' });
    }

    /// Translations for colorbox
    $.extend($.colorbox.settings, {
      previous: theme.strings.colorBoxPrevious,
      next: theme.strings.colorBoxNext,
      close: theme.icons.close
    });

    /// Image-links
    $('.rte a img').closest('a').addClass('contains-img');

    /// Slideshow fills viewport
    theme.lastViewportWidth = 0;
    $(window).on('debouncedresize slideshowfillheight', function (e) {
      // if only height changed, don't do anything, to avoid issue with viewport-size-change on mobile-scroll
      if (e.type == 'debouncedresize' && theme.lastViewportWidth == $(window).width()) {
        return;
      }

      // set height of slideshows
      var desiredHeight = $(window).height();

      if (nav.bar.isAnnouncementBar()) {
        desiredHeight -= nav.bar.heightOfAnnouncementBar();
      }
      $('.slideshow.fill-viewport, .slideshow.fill-viewport .slide').css('min-height', desiredHeight);

      // check for content that must be contained
      $('.slideshow.fill-viewport').each(function () {
        var inner = 0;
        $(this).find('.slide').each(function () {
          var t = 0;
          $('.fill-viewport__contain', this).each(function () {
            t += $(this).outerHeight(true);
          });
          if (inner < t) {
            inner = t;
          }
        });
        if (inner > desiredHeight) {
          $(this).css('min-height', inner);
          $('.slide', this).css('min-height', inner);
        }
      });

      theme.lastViewportWidth = $(window).width();

      // bump down any header-overlap areas to cater for announcements
      if ($('body.header-section-overlap').length && nav.bar.isAnnouncementBar()) {
        $('#page-content').css('margin-top', nav.bar.heightOfAnnouncementBar());
      } else {
        $('#page-content').css('margin-top', '');
      }
    });

    /// Some states are dependent on scroll position
    $(window).on('scroll assessFeatureHeaders', function () {
      var scrollTop = $(window).scrollTop();
      var appearenceBuffer = 60;
      var windowBottom = scrollTop + $(window).height() - appearenceBuffer;

      $('body').toggleClass('scrolled-down', scrollTop > 0);

      theme.assessAltLogo();

      $('.feature-header:not(.feature-header--visible)').filter(function () {
        var offset = $(this).offset().top;
        var height = $(this).outerHeight();
        return offset + height >= scrollTop && offset <= windowBottom;
      }).addClass('feature-header--visible');
    });

    /// Side up and remove
    $.fn.slideUpAndRemove = function () {let speed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 200;
      $(this).each(function () {
        $(this).slideUp(speed, function () {
          $(this).remove();
        });
      });
    };

    /// Overlay menu nav
    let previousNavRoutes = ['_root'];

    updateNavCtas = function () {
      let trimmedTitle = previousNavRoutes[previousNavRoutes.length - 1];
      let $ctasToShow = $(`#page-menu .nav-ctas__container[data-for-nav-item="${trimmedTitle}"]:hidden`);

      if ($ctasToShow.length > 0) {
        if ($('#page-menu .nav-ctas__container:visible').length) {
          $('#page-menu .nav-ctas__container:visible').fadeOut(drilldownTransSpeed, function () {
            $ctasToShow.fadeIn(drilldownTransSpeed);
          });
        } else {
          setTimeout(function () {
            $ctasToShow.fadeIn(drilldownTransSpeed);
          }, drilldownTransSpeed);
        }
      } else {
        $('#page-menu .nav-ctas__container:visible').fadeOut(drilldownTransSpeed);
      }
    };

    //Drill down
    var drilldownTransSpeed = 250;
    $(document).on('click', '#page-menu.nav-uses-modal .main-nav li.has-children > a', function () {
      let trimmedTitle = $(this).text().replace(/^\s\s*/, '').replace(/\s\s*$/, '').toLowerCase();
      previousNavRoutes.push(trimmedTitle);

      //- Links
      var $content = $('<div class="container growth-area"/>').append($(this).siblings('ul').clone().wrap(
      `<div class="nav-body main-nav growth-area"/>`).parent());

      //- Title, in its own menu row, using subnav style for the other links
      var $menuList = $content.find('.main-nav > ul').wrap('<li/>').parent().wrap('<ul/>').parent();
      if (theme.strings.back.length > 0) {
        $menuList.prepend(`<li class="main-nav__back" data-nav-title="${trimmedTitle}"><a href="#" data-revert-back><span class="arr arr--left">${theme.icons.chevronLeft}</span>${theme.strings.back}</a></li>`);
      }

      //Hide current & show new
      var $containers = $('#page-menu > .inner > .nav-container > .container:not(.inactive)');
      $containers.addClass('inactive').fadeOut(drilldownTransSpeed, function () {
        $content.hide().insertAfter($containers.last()).fadeIn(drilldownTransSpeed);
        $content.closest('.theme-modal').focus(); // add focus for keyboard scrolling
      });

      updateNavCtas();

      //Hide the footer links
      $('#page-menu > .inner > .nav-container > .nav-footer-links').fadeOut(drilldownTransSpeed);

      return false;
    });

    //Drill back up
    $(document).on('click', '#page-menu.nav-uses-modal a[data-revert-back]', function () {
      previousNavRoutes.pop();
      updateNavCtas();

      $('#page-menu.nav-uses-modal > .inner > .nav-container > .container:not(.inactive)').fadeOutAndRemove(drilldownTransSpeed, function () {
        var $menuToShow = $('#page-menu.nav-uses-modal > .inner > .nav-container > .container.inactive:last');
        $menuToShow.removeClass('inactive').fadeIn(drilldownTransSpeed);

        if ($menuToShow.data('root-nav')) {
          $('#page-menu > .inner > .nav-container > .nav-footer-links').fadeIn(drilldownTransSpeed);
        }
      });
      return false;
    });

    //Close and reset nav
    $(document).on('reset-modal', '#page-menu.nav-uses-modal', function () {
      closeThemeModal();
      setTimeout(function () {
        $('#page-menu.nav-uses-modal > .inner > .nav-container > .container').removeClass('inactive').show().slice(1).remove();
      }, 300); // Delay to match transition on .theme-modal.reveal
      return false;
    }).on('click', 'a[data-reset-and-close]', function () {
      $('#page-menu.nav-uses-modal').trigger('reset-modal');
      return false;
    });


    /// Inline nav links

    //Handle expanding nav
    theme.lastHoverInteractionTimestamp = -1;
    $(document).on('click keydown', '.multi-level-nav .nav-rows .contains-children > a', function (e) {
      if (e.type == 'click' || e.key == 'Enter') {
        $(this).parent().find('ul:first').slideToggle(300);
        return false;
      }
    });

    $(document).on(theme.device.isTouch() ? 'click forceopen forceclose' : 'forceopen forceclose', '.multi-level-nav .contains-mega-menu a.has-children', function (e) {
      $('.nav-ctas__cta .lazyload--manual').removeClass('lazyload--manual').addClass('lazyload');

      // skip column headings
      if ($(this).hasClass('column-title')) {
        return true;
      }

      var navAnimSpeed = 200;

      // check if mouse + click events occurred in same event chain
      var thisInteractionTimestamp = Date.now();
      if (e.type == 'click' && thisInteractionTimestamp - theme.lastHoverInteractionTimestamp < 500) {
        return false;
      }
      if (e.type == 'forceopen' || e.type == 'forceclose') {
        theme.lastHoverInteractionTimestamp = thisInteractionTimestamp;
      }

      //Set some useful vars
      var $tierEl = $(this).closest('[class^="tier-"]');
      var $tierCont = $tierEl.parent();
      var targetTierNum = parseInt($tierEl.attr('class').split('-')[1]) + 1;
      var targetTierClass = 'tier-' + targetTierNum;

      ///Remove nav for all tiers higher than this one (unless we're opening on same level on hover)
      if (e.type != 'forceopen') {
        $tierCont.children().each(function () {
          if (parseInt($(this).attr('class').split('-')[1]) >= targetTierNum) {
            if (e.type == 'forceclose') {
              $(this).removeClass('tier-appeared');
              var $this = $(this);
              theme.hoverRemoveTierTimeoutId = setTimeout(function () {
                $this.remove();
              }, 260);
            } else {
              $(this).slideUpAndRemove(navAnimSpeed);
            }
          }
        });
      }

      //Are we expanding or collapsing
      if ($(this).hasClass('expanded') && e.type != 'forceopen') {
        //Collapsing. Reset state
        $(this).removeClass('expanded').removeAttr('aria-expanded').removeAttr('aria-controls');
      } else {
        ///Show nav
        //Reset other nav items at this level
        $tierEl.find('a.expanded').removeClass('expanded').removeAttr('aria-expanded');
        clearTimeout(theme.hoverRemoveTierTimeoutId);

        //If next tier div doesn't exist, make it
        var $targetTierEl = $tierCont.children('.' + targetTierClass);
        if ($targetTierEl.length == 0) {
          $targetTierEl = $('<div />').addClass(targetTierClass).attr('id', 'menu-' + targetTierClass).appendTo($tierCont);
          if (navAnimSpeed > 0) {
            // new tier, start at 0 height
            $targetTierEl.css('height', '0px');
          }
        } else {
          if (navAnimSpeed > 0) {
            // tier exists, fix its height before replacing contents
            $targetTierEl.css('height', $targetTierEl.height() + 'px');
          }
        }
        // populate new tier
        $targetTierEl.empty().stop(true, false).append($(this).siblings('ul').clone().attr('style', ''));
        if (navAnimSpeed > 0) {
          // transition to correct height, then clear height css
          $targetTierEl.animate(
          {
            height: $targetTierEl.children().outerHeight()
          },
          navAnimSpeed,
          function () {
            $(this).css('height', '');
          });

        }
        // add class after reflow, for any transitions
        setTimeout(function () {
          $targetTierEl.addClass('tier-appeared');
        }, 10);
        //Mark as expanded
        $(this).addClass('expanded').attr('aria-expanded', 'true').attr('aria-controls', 'menu-' + targetTierClass);
        $('body').addClass('nav-mega-open');
      }
      return false;
    });

    /// Expanding nav on hover
    theme.closeOpenMenuItem = function () {
      $('body').removeClass('nav-mega-open');
      $('.multi-level-nav.reveal-on-hover .has-children.expanded').trigger('forceclose');
    };

    $(document).on('mouseenter mouseleave', '.multi-level-nav.reveal-on-hover .tier-1 .contains-mega-menu', function (e) {
      if (theme.viewport.isSm()) {
        clearTimeout(theme.closeOpenMenuItemTimeoutId);
        if (e.type == 'mouseenter') {
          $(this).children('a').trigger('forceopen');
        } else {
          theme.closeOpenMenuItemTimeoutId = setTimeout(theme.closeOpenMenuItem, 200);
        }
      }
    });

    $(document).on('mouseleave', '.multi-level-nav.reveal-on-hover .tier-appeared', function (e) {
      if (theme.viewport.isSm()) {
        clearTimeout(theme.closeOpenMenuItemTimeoutId);
        theme.closeOpenMenuItemTimeoutId = setTimeout(theme.closeOpenMenuItem, 50);
      }
    });

    $(document).on('mouseenter', '.multi-level-nav.reveal-on-hover .tier-2, .multi-level-nav.reveal-on-hover .tier-3', function (e) {
      if (theme.viewport.isSm()) {
        clearTimeout(theme.closeOpenMenuItemTimeoutId);
      }
    });

    // Keyboard access
    $(document).on('keydown', '.multi-level-nav .contains-children > a.has-children', function (e) {
      if (e.key == 'Enter') {
        if ($(this).parent().hasClass('contains-mega-menu')) {
          if ($(this).attr('aria-expanded') == 'true') {
            theme.closeOpenMenuItem();
          } else {
            $(this).trigger('forceopen');
          }
        } else {
          $(this).parent().toggleClass('reveal-child');
        }
        return false;
      }
    });

    function isPageScrollin() {
      return $('#page-content').outerHeight() > $(window).height();
    }

    /// Modal windows
    var removeModalTimeoutID = -1;
    var closeModalDelay = 300;
    window.closeThemeModal = function (immediate, callbackFn) {
      $('a[data-modal-toggle].active').removeClass('active');

      var $modal = $('.theme-modal.reveal');

      $modal.removeClass('reveal').addClass('unreveal');

      if ($('html.supports-transforms').length && (typeof immediate == 'undefined' || !immediate)) {
        removeModalTimeoutID = setTimeout(function () {
          $('body').removeClass('modal-active');
          $('body, #page-content, #site-control').css('padding-right', '');
        }, closeModalDelay); // Delay to match transition on .theme-modal.reveal
      } else {
        $('body').removeClass('modal-active');
        $('body, #site-control').css('padding-right', '');
      }

      // tabindex
      $modal.find('a').attr('tabindex', '-1');

      if (immediate) {
        $('body').removeAttr('data-modal-id');
      } else {
        setTimeout(function () {
          $('body').removeAttr('data-modal-id');
        }, 200);
      }

      $(window).trigger('ccModalClosing');

      setTimeout(function () {
        $('body').removeClass('modal-closing');

        if ($modal.attr('id') === 'quick-buy-modal') {
          $modal.remove();
        }

        if (callbackFn) {
          callbackFn();
        }

        $(window).trigger('ccModalClosed');
      }, 300);

      $('#search-modal').removeClass('-in');
    };

    //Show arbitrary content in modal window
    window.showThemeModal = function (el, id, callbackFn) {
      //Close current
      closeThemeModal(true);
      //Remove any existing temporary modals
      $('.theme-modal.temp').remove();
      theme.Nav().bar.hide(false);
      //Actually add to the page
      var $el = $(el);
      $el.appendTo('body');
      setTimeout(function () {
        $el.addClass('reveal');
      }, 10);
      theme.addControlPaddingToModal();
      const scrollbarWidth = $.scrollBarWidth();
      //When body is under a modal & has scrollbar, it is not allowed to scroll,
      //so we overflow:hidden it and add a padding the same size as the scrollbar
      if (isPageScrollin()) {
        $('#page-content, #site-control').css('padding-right', scrollbarWidth);
      }
      //Set page state
      $('body').addClass('modal-active modal-opening');

      if (id) {
        $('body').attr('data-modal-id', id);
      }

      setTimeout(function () {
        if ($('.theme-modal:visible [data-modal-close]').length) {
          $('.theme-modal:visible [data-modal-close]').focus();
        }

        $('body').removeClass('modal-opening');
      }, 300);

      //Compensate for an 'always visible' scrollbar
      if (scrollbarWidth > 0) {
        $('.theme-modal:visible').addClass('scrollbar-visible');
      }

      if (callbackFn) {
        callbackFn($el);
      }
    };

    //Show existing modal container hidden on page
    window.showInPageModal = function ($target) {
      $target.removeClass('unreveal').addClass('reveal');
      theme.addControlPaddingToModal();
      var $inputs = $target.find('.focus-me'); //Any inputs to highlight?

      $(this).addClass('active');
      //When body is under a modal, it is not allowed to scroll, so we need this to keep it the same width
      if (isPageScrollin()) {
        $('body, #site-control').css('padding-right', $.scrollBarWidth());
      }
      $('body').addClass('modal-active modal-opening').attr('data-modal-id', $target.attr('id'));
      $('a[tabindex]', $target).removeAttr('tabindex');

      if ($inputs.length == 0) {
        $target.closest('.theme-modal').focus(); // add focus for keyboard scrolling
      } else {
        if (theme.viewport.isSm()) {
          $inputs.focus();
        }
      }

      if ($target.attr('id') === "search-modal") {
        setTimeout(function () {
          $('#search-modal').addClass('-in');
        }, 400);
      }

      setTimeout(function () {
        $('body').removeClass('modal-opening');
      }, 400);
    };

    $(document).on('click', 'body:not(.modal-active) a[data-modal-toggle]', function (e) {
      e.preventDefault();
      window.showInPageModal($($(this).data('modal-toggle')));
    });

    //Close modal on escape keypress
    $(document).on('keyup', function (e) {
      if (e.which == 27) {
        closeThemeModal();
      }
    });
    //Close modal button
    $(document).on('click', 'body.modal-active a[data-modal-close]', function () {
      closeThemeModal();
      return false;
    });
    //Click outside container to close modal
    $(document).on('click', '.theme-modal', function (e) {
      if (e.target == this) {
        closeThemeModal();

        //Trigger any reset events (e.g. in drilldown nav)
        $(this).trigger('reset-modal');
        return false;
      }
    });
    //Switch to a different modal
    $(document).on('click', 'body.modal-active a[data-modal-toggle]', function () {
      closeThemeModal(true);
      $(this).click();
      return false;
    });

    $(document).on('click', '.site-control a[data-modal-nav-toggle]', function () {
      if ($('body.modal-active').length) {
        closeThemeModal(true);
        setTimeout(function () {
          $('#page-menu .crumbs a:first').trigger('click');
        }, 305); // after modal fade-out
      } else {
        $('.nav-ctas__cta .lazyload--manual').removeClass('lazyload--manual').addClass('lazyload');
        window.showInPageModal($('#page-menu'));
      }
      return false;
    });

    //Immmediately select contents when focussing on some inputs
    $(document).on('focusin click', 'input.select-on-focus', function () {
      $(this).select();
    }).on('mouseup', 'input.select-on-focus', function (e) {
      e.preventDefault(); //Prevent mouseup killing select()
    });

    //Textareas increase size as you type
    $('#template textarea').each(function () {$(this).autogrow({ animate: false, onInitialize: true });});

    $(document).on('click', '.quantity-wrapper [data-quantity]', function () {
      var adj = $(this).data('quantity') == 'up' ? 1 : -1;
      var $qty = $(this).closest('.quantity-wrapper').find('[name=quantity]');
      $qty.val(Math.max(1, parseInt($qty.val()) + adj));
      return false;
    });

    /// Redirection dropdowns
    $(document).on('change', 'select.redirecter', function () {
      window.location = $(this).val();
    });

    theme.getUrlParameter = function (name) {
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    /// Scroll to the newsletter when necessary
    const formType = theme.getUrlParameter('form_type');
    if (theme.getUrlParameter('customer_posted') || formType && formType === 'customer') {
      if (window.location.hash && window.location.hash === "footer_newsletter_signup") {
        setTimeout(() => {
          $('html,body').animate({
            scrollTop: $('#footer_newsletter_signup').offset().top - 100
          }, 1000);
        }, 100);
      }
    }

    /// Detect android for 100vh fix
    if (navigator.userAgent.toLowerCase().indexOf("android") > -1) {
      $('html').addClass('os-android');
    }

    /// Bind checkout button clicks
    $(document).on('click', '[data-cc-checkout-button]', function (e) {
      if ($('#cc-checkout-form').length) {
        $('#cc-checkout-form').submit();
        return false;
      } else {
        console.warn('Unable to find form with id cc-checkout-form');
      }
    });

    /// Bind pseudo-page-to-page animation event
    $(document).on('click', '[data-cc-animate-click]', function (e) {
      if (theme.settings.animationEnabledDesktop && theme.viewport.isSm() ||
      theme.settings.animationEnabledMobile && theme.viewport.isXs()) {
        if ((window.location.hostname === this.hostname || !this.hostname.length) &&
        $(this).attr('href').length > 0 &&
        $(this).attr('href')[0] !== '#') {
          e.preventDefault();

          const isAnimationFast = $('body').hasClass('animation-speed-fast');
          const pageNavigateDelay = isAnimationFast ? 100 : 200;
          const loaderVisibleDuration = isAnimationFast ? 800 : 1300;
          const $veil = $('#cc-veil');
          const isLoadingAnimation = $veil.hasClass('cc-veil--animate');
          const url = $(this).attr('href');

          $('body').append(`<link rel="prefetch" href="${url}">`);

          $veil.addClass('-in');

          if (isLoadingAnimation) {
            setTimeout(() => {
              $veil.addClass('cc-veil--animate--in').addClass('cc-veil--animate--running');
            }, pageNavigateDelay + 100);
          }

          setTimeout(() => {
            $veil.removeClass('cc-veil--animate--in');
            window.location.href = url;
          }, isLoadingAnimation ? loaderVisibleDuration : pageNavigateDelay);

          //Failsafe - remove the veil after a few second just in case
          setTimeout(() => {
            $('#cc-veil').removeClass('-in');
          }, 8000);

          return false;
        }
      }
    });

    // Process lazy loaded images on page load
    setTimeout(lazySizes.autoSizer.checkElems, 1000);

    /// Watch for tabbing
    function handleFirstTab(e) {
      if (e.keyCode === 9) {// 9 == tab
        $('body').addClass('user-is-tabbing');
        window.removeEventListener('keydown', handleFirstTab);
      }
    }
    window.addEventListener('keydown', handleFirstTab);

    //Hide the footer on the challenge page
    if (document.querySelector('.shopify-challenge__container')) {
      document.getElementById('shopify-section-footer').style.display = 'none';
    }

    if (theme.device.isTouch()) {
      document.getElementsByTagName('html')[0].classList.add('touch');
    }

    //Remove the scroll animation from the first element for new users
    const firstSection = document.body.querySelector('.template-index #page-content .shopify-section:first-child [data-cc-animate]');
    if (firstSection && LocalStorageUtil.get('is_first_visit') === null) {
      firstSection.removeAttribute('data-cc-animate');
    }
    LocalStorageUtil.set('is_first_visit', 'false');

    ///Init stuff
    $(document).on('shopify:section:reorder', function (e) {
      setTimeout(theme.init, 500);
    });

    $(document).on('shopify:section:load', function (e) {
      /// Image-links inside any rte block
      $('.rte a img', e.target).closest('a').addClass('contains-img');

      /// Feature-sized headers have a little fluff
      if ($('.feature-header', e.target).length) {
        $(window).trigger('assessFeatureHeaders');
      }

      /// Init any inline videos
      theme.inlineVideos.init(e.target);

      theme.init();
    }); // end of shopify:section:load

    $(document).on('shopify:section:unload', function (e) {
      /// Unload any inline videos
      theme.inlineVideos.destroy(e.target);

      setTimeout(() => {
        theme.init();
      }, 0);
    });

    //Theme resize events
    $(window).on('debouncedresizewidth', theme.windowResize);

    //Broadcast an event when the screen changes between Xs and Sm
    if (window.matchMedia) {
      const mq = window.matchMedia('(min-width: 768px)');
      if (mq.addEventListener) {
        mq.addEventListener('change', (event) => {
          const customEvent = new CustomEvent("cc-mobile-viewport-size-change");
          window.dispatchEvent(customEvent);
        });
      }
    }

    //Init the theme
    $(function () {
      theme.init();
      $(window).trigger('slideshowfillheight');
      $(window).trigger('assessFeatureHeaders');
    });

    /// Register all sections
    const deferredLoadViewportExcess = 1200;
    theme.Sections.init();
    theme.Sections.register('header', theme.HeaderSection, { deferredLoad: false });
    theme.Sections.register('footer', theme.FooterSection, { deferredLoadViewportExcess });
    theme.Sections.register('slideshow', theme.SlideshowSection, { deferredLoadViewportExcess });
    theme.Sections.register('video', theme.VideoManager, { deferredLoadViewportExcess });
    theme.Sections.register('background-video', theme.VideoManager, { deferredLoadViewportExcess });
    theme.Sections.register('image-with-text-overlay', theme.ImageWithTextOverlay, { deferredLoadViewportExcess });
    theme.Sections.register('image-beside-image', theme.ImageBesideImageSection, { deferredLoadViewportExcess });
    theme.Sections.register('featured-collection', theme.FeaturedCollectionSection, { deferredLoadViewportExcess });
    theme.Sections.register('collection-list', theme.CollectionListSection, { deferredLoadViewportExcess });
    theme.Sections.register('featured-blog', theme.FeaturedBlogSection, { deferredLoadViewportExcess });
    theme.Sections.register('product-template', theme.ProductTemplateSection, { deferredLoadViewportExcess: 200 });
    theme.Sections.register('collection-template', theme.FilterManager, { deferredLoad: false });
    theme.Sections.register('blog-template', theme.BlogTemplateSection, { deferredLoad: false });
    theme.Sections.register('article-template', theme.ArticleTemplateSection, { deferredLoad: false });
    theme.Sections.register('list-collections', theme.ListCollectionsSection, { deferredLoadViewportExcess });
    theme.Sections.register('cart-template', theme.CartTemplateSection, { deferredLoad: false });
    theme.Sections.register('product-recommendations', theme.ProductRecommendations, { deferredLoadViewportExcess });
    theme.Sections.register('gallery', theme.GallerySection, { deferredLoadViewportExcess });
    theme.Sections.register('testimonials', theme.TestimonialsSection, { deferredLoadViewportExcess });
    theme.Sections.register('accordion', theme.AccordionSection, { deferredLoadViewportExcess });
    theme.Sections.register('faq', theme.FaqSection, { deferredLoadViewportExcess });
    theme.Sections.register('search-template', theme.FilterManager, { deferredLoad: false });
    theme.Sections.register('scrolling-banner', theme.ScrollingBannerSection, { deferredLoadViewportExcess });
  });


  //Register dynamically pulled in sections
  $(function ($) {
    if (cc.sections.length) {
      cc.sections.forEach((section) => {
        try {
          let data = {};
          if (typeof section.deferredLoad !== 'undefined') {
            data.deferredLoad = section.deferredLoad;
          }
          if (typeof section.deferredLoadViewportExcess !== 'undefined') {
            data.deferredLoadViewportExcess = section.deferredLoadViewportExcess;
          }
          theme.Sections.register(section.name, section.section, data);
        } catch (err) {
          console.error(`Unable to register section ${section.name}.`, err);
        }
      });
    } else {
      console.warn('Barry: No common sections have been registered.');
    }
  });

})(theme.jQuery);  
/* Built with Barry v1.0.8 */