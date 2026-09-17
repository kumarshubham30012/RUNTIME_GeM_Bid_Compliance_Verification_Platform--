import { sandboxResult, type VerificationInput, type VerificationProvider, type VerificationResult } from "../types";

export class DemoDocumentProvider implements VerificationProvider {
  readonly method = "DOCUMENT" as const;
  readonly providerName = "DemoDocumentProvider";

  verify(input: VerificationInput): VerificationResult {
    if (input.documents.length === 0) {
      return sandboxResult({
        method: this.method,
        provider: this.providerName,
        status: "INSUFFICIENT_DATA",
        summary: "No document is uploaded for this requirement, so the sandbox presence check was not completed.",
      });
    }

    return sandboxResult({
      method: this.method,
      provider: this.providerName,
      status: "VERIFIED",
      summary:
        "Sandbox document presence check found uploaded file metadata. This does not confirm that the document is valid.",
      data: {
        documentCount: input.documents.length,
        documents: input.documents,
      },
    });
  }
}
