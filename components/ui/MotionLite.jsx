"use client";

import { forwardRef } from "react";

const MOTION_ONLY_PROPS = new Set([
  "animate",
  "custom",
  "drag",
  "dragConstraints",
  "dragElastic",
  "exit",
  "initial",
  "layout",
  "layoutId",
  "transition",
  "variants",
  "whileFocus",
  "whileHover",
  "whileInView",
  "whileTap",
  "whileDrag",
]);

function stripMotionProps(props) {
  const nextProps = {};

  for (const [key, value] of Object.entries(props)) {
    if (MOTION_ONLY_PROPS.has(key)) continue;
    nextProps[key] = value;
  }

  return nextProps;
}

function createMotionElement(Tag) {
  const MotionElement = forwardRef(function MotionElement(props, ref) {
    return <Tag ref={ref} {...stripMotionProps(props)} />;
  });

  MotionElement.displayName = `MotionLite.${Tag}`;
  return MotionElement;
}

export function AnimatePresence({ children }) {
  return children;
}

export const motion = {
  article: createMotionElement("article"),
  aside: createMotionElement("aside"),
  button: createMotionElement("button"),
  div: createMotionElement("div"),
  header: createMotionElement("header"),
  li: createMotionElement("li"),
  main: createMotionElement("main"),
  p: createMotionElement("p"),
  section: createMotionElement("section"),
  ul: createMotionElement("ul"),
};
