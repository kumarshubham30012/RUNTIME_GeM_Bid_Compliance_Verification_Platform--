import { lookupDemoGst } from "../demoDatabase";
import { sandboxResult, type VerificationInput, type VerificationProvider, type VerificationResult } from "../types";

export class DemoGSTProvider implements VerificationProvider {
  readonly method = "GST" as const;
  readonly providerName = "DemoGSTProvider";

  verify(input: VerificationInput): VerificationResult {
    if (!input.gstin.trim()) {
      return sandboxResult({
        method: this.method,
        provider: this.providerName,
        status: "INSUFFICIENT_DATA",
        summary: "No GSTIN is stored on this application, so the demo GST lookup was not run.",
      });
    }

    const record = lookupDemoGst(input.gstin);
    if (!record) {
      return sandboxResult({
        method: this.method,
        provider: this.providerName,
        status: "NOT_FOUND",
        summary: "No matching record exists in the local demo GST registry.",
        data: { gstin: input.gstin.trim().toUpperCase() },
      });
    }

    return sandboxResult({
      method: this.method,
      provider: this.providerName,
      status: "VERIFIED",
      summary: "Demo GST lookup completed against the local sandbox registry. This is not a government GST check.",
      data: { ...record },
    });
  }
}
