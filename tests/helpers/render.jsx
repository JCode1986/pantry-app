import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

function TestProviders({ children }) {
  return children;
}

export function renderWithProviders(ui, options = {}) {
  const user = userEvent.setup(options.userEvent);
  return {
    user,
    ...render(ui, {
      wrapper: TestProviders,
      ...options,
    }),
  };
}
