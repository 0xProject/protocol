import React from "react";
import { render, screen, userEvent } from "../utils/test-utils";
import { Counter } from "./Counter";

describe("Counter", () => {
  test("should render button and counter text", () => {
    render(<Counter />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Inc")).toBeInTheDocument();
  });
  test("should inc result on button click", async () => {
    render(<Counter />);
    await userEvent.click(screen.getByText("Inc"));

    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
