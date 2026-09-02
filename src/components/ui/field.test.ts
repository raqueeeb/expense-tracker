import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, Input } from "./index";

/**
 * Field renders the validation message in a separate <p> from the control it
 * describes. Without aria-describedby the two are unrelated as far as assistive
 * technology is concerned: a screen reader user tabbing into the field is told
 * its label but never why it was rejected. The id was being computed and
 * rendered but never referenced, so the association silently did not exist.
 *
 * These render the real component to static markup rather than asserting on
 * source, so they check the contract a browser actually sees.
 */
const render = (props: Parameters<typeof Field>[0]) => renderToStaticMarkup(createElement(Field, props));

describe("Field accessibility", () => {
  it("links the error message to the control and marks it invalid", () => {
    const html = render({
      label: "Amount",
      htmlFor: "amount",
      error: ["Amount must be greater than zero"],
      children: createElement(Input, { id: "amount" }),
    });

    expect(html).toContain('id="amount-error"');
    expect(html).toContain('aria-describedby="amount-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("links the hint when there is no error", () => {
    const html = render({
      label: "Password",
      htmlFor: "password",
      hint: "At least 8 characters.",
      children: createElement(Input, { id: "password" }),
    });

    expect(html).toContain('id="password-hint"');
    expect(html).toContain('aria-describedby="password-hint"');
    expect(html).not.toContain("aria-invalid");
  });

  it("prefers the error over the hint once validation fails", () => {
    const html = render({
      label: "Password",
      htmlFor: "password",
      hint: "At least 8 characters.",
      error: ["Password must be at least 8 characters"],
      children: createElement(Input, { id: "password" }),
    });

    expect(html).toContain('aria-describedby="password-error"');
    expect(html).not.toContain('id="password-hint"');
  });

  it("keeps the control usable when it is not a single element", () => {
    const html = render({
      label: "Range",
      htmlFor: "range",
      children: "plain text child",
    });

    expect(html).toContain("plain text child");
  });

  it("renders the label bound to the control id", () => {
    const html = render({
      label: "Description",
      htmlFor: "description",
      children: createElement(Input, { id: "description" }),
    });

    expect(html).toContain('for="description"');
  });
});
