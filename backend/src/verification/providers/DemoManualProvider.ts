import { sandboxResult, type VerificationInput, type VerificationProvider, type VerificationResult } from "../types";

export class DemoManualProvider implements VerificationProvider {
  readonly method = "MANUAL" as const;
  readonly providerName = "DemoManualProvider";

  verify(_input: VerificationInput): VerificationResult {
    return sandboxResult({
      method: this.method,
      provider: this.providerName,
      status: "MANUAL_REVIEW",
      summary:
        "No automated sandbox lookup was performed. This requirement is configured for manual review and is not a compliance decision.",
    });
  }
}
