import { lookupDemoUdyam } from "../demoDatabase";
import { sandboxResult, type VerificationInput, type VerificationProvider, type VerificationResult } from "../types";

export class DemoUdyamProvider implements VerificationProvider {
  readonly method = "UDYAM" as const;
  readonly providerName = "DemoUdyamProvider";

  verify(input: VerificationInput): VerificationResult {
    if (!input.udyam.trim()) {
      return sandboxResult({
        method: this.method,
        provider: this.providerName,
        status: "INSUFFICIENT_DATA",
        summary: "No Udyam number is stored on this application, so the demo Udyam lookup was not run.",
      });
    }

    const record = lookupDemoUdyam(input.udyam);
    if (!record) {
      return sandboxResult({
        method: this.method,
        provider: this.providerName,
        status: "NOT_FOUND",
        summary: "No matching record exists in the local demo Udyam registry.",
        data: { udyamNumber: input.udyam.trim().toUpperCase() },
      });
    }

    return sandboxResult({
      method: this.method,
      provider: this.providerName,
      status: "VERIFIED",
      summary:
        "Demo Udyam lookup completed against the local sandbox registry. This is not an official Udyam verification.",
      data: { ...record },
    });
  }
}
