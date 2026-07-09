import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSubmissionUrl,
  formatWhatsAppSubmissionMessage,
  resolveQrSvgElement,
} from "./examCredentials";

describe("examCredentials utils", () => {
  it("builds submission URL from id", () => {
    assert.equal(
      buildSubmissionUrl("A7K9QF", "https://gabarito.example.com"),
      "https://gabarito.example.com/submissao/A7K9QF",
    );
  });

  it("formats WhatsApp submission message", () => {
    const message = formatWhatsAppSubmissionMessage({
      examTitle: "Prova de Física",
      submissionId: "A7K9QF",
      origin: "https://gabarito.example.com",
    });

    assert.match(message, /Prova de Física/);
    assert.match(message, /Comprovante de submissão: A7K9QF/);
    assert.match(
      message,
      /https:\/\/gabarito\.example\.com\/submissao\/A7K9QF/,
    );
    assert.match(message, /Guarde este comprovante/);
  });

  it("resolveQrSvgElement returns SVG element directly", () => {
    const svg = {
      tagName: "svg",
    } as unknown as SVGSVGElement;

    assert.equal(resolveQrSvgElement(svg), svg);
  });

  it("resolveQrSvgElement finds SVG inside container", () => {
    const svg = { tagName: "svg" } as unknown as SVGSVGElement;
    const container = {
      querySelector: (selector: string) => (selector === "svg" ? svg : null),
    } as unknown as HTMLElement;

    assert.equal(resolveQrSvgElement(container), svg);
  });

  it("resolveQrSvgElement returns null when SVG is missing", () => {
    const container = {
      querySelector: () => null,
    } as unknown as HTMLElement;

    assert.equal(resolveQrSvgElement(null), null);
    assert.equal(resolveQrSvgElement(container), null);
  });
});
