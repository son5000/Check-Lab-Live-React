"use client";

import { useEffect } from "react";
import { translateText } from "@/app/layouts/helpers/localization";

const TRANSLATABLE_ATTRIBUTES = [
  "aria-label",
  "aria-valuetext",
  "alt",
  "placeholder",
  "title",
];

const SKIP_TRANSLATION_SELECTOR =
  "script, style, noscript, template, textarea, code, pre, [data-checklab-i18n='off']";

const textNodeOriginals = new WeakMap();

export function useLanguageTranslator(language) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    let isApplyingTranslations = false;

    const applyTranslations = (root) => {
      isApplyingTranslations = true;
      translateTree(root, language);
      isApplyingTranslations = false;
    };

    applyTranslations(document.documentElement);

    const observer = new MutationObserver((mutations) => {
      if (isApplyingTranslations) {
        return;
      }

      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target, language);
          continue;
        }

        if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target, language);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          translateTree(node, language);
        });
      }
    });

    observer.observe(document.documentElement, {
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language]);
}

function translateTree(root, language) {
  if (!root) {
    return;
  }

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    if (shouldSkipElement(root)) {
      return;
    }
    translateElementAttributes(root, language);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return shouldSkipElement(node)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        }

        const parentElement = node.parentElement;
        if (!parentElement || shouldSkipElement(parentElement)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      translateTextNode(currentNode, language);
    } else {
      translateElementAttributes(currentNode, language);
    }
    currentNode = walker.nextNode();
  }
}

function translateTextNode(node, language) {
  const currentText = node.nodeValue ?? "";
  const previousOriginalText = textNodeOriginals.get(node);
  const previousTranslatedText = previousOriginalText
    ? translateText(previousOriginalText, "en")
    : undefined;

  const nextOriginalText =
    !previousOriginalText ||
    (language === "en" &&
      /[가-힣]/.test(currentText) &&
      currentText !== previousTranslatedText)
      ? currentText
      : previousOriginalText;

  textNodeOriginals.set(node, nextOriginalText);

  const nextText = language === "en"
    ? translateText(nextOriginalText, language)
    : nextOriginalText;

  if (currentText !== nextText) {
    node.nodeValue = nextText;
  }
}

function translateElementAttributes(element, language) {
  if (!element?.getAttribute) {
    return;
  }

  TRANSLATABLE_ATTRIBUTES.forEach((attributeName) => {
    if (!element.hasAttribute(attributeName)) {
      return;
    }

    const originalAttributeName = getOriginalAttributeName(attributeName);
    const currentValue = element.getAttribute(attributeName) ?? "";
    const storedOriginalValue = element.getAttribute(originalAttributeName);
    const storedTranslatedValue = storedOriginalValue
      ? translateText(storedOriginalValue, "en")
      : undefined;

    const nextOriginalValue =
      !storedOriginalValue ||
      (language === "en" &&
        /[가-힣]/.test(currentValue) &&
        currentValue !== storedTranslatedValue)
        ? currentValue
        : storedOriginalValue;

    element.setAttribute(originalAttributeName, nextOriginalValue);

    const nextValue = language === "en"
      ? translateText(nextOriginalValue, language)
      : nextOriginalValue;

    if (currentValue !== nextValue) {
      element.setAttribute(attributeName, nextValue);
    }
  });
}

function getOriginalAttributeName(attributeName) {
  return `data-checklab-i18n-original-${attributeName}`;
}

function shouldSkipElement(element) {
  return Boolean(element.closest?.(SKIP_TRANSLATION_SELECTOR));
}
