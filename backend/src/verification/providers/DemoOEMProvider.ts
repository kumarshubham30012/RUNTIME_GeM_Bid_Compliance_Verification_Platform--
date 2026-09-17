import { lookupDemoOem } from "../demoDatabase";
import { sandboxResult, type VerificationInput, type VerificationProvider, type VerificationResult } from "../types";

export class DemoOEMProvider implements VerificationProvider {
  readonly method = "OEM" as const;
  readonly providerName = "DemoOEMProvider";

  verify(input: VerificationInput): VerificationResult {
    if (!input.oem.trim()) {
      return sandboxResult({
        method: this.method,
        provider: this.providerName,
        status: "INSUFFICIENT_DATA",
        summary: "No OEM value is stored on this application, so the demo OEM lookup was not run.",
      });
    }

    const record = lookupDemoOem(input.oem);
    if (!record) {
      return sandboxResult({
        method: this.method,
        provider: this.providerName,
        status: "NOT_FOUND",
        summary: "No matching record exists in the local demo OEM registry.",
        data: { oemName: input.oem.trim() },
      });
    }

    return sandboxResult({
      method: this.method,
      provider: this.providerName,
      status: "VERIFIED",
      summary: "Demo OEM lookup completed against the local sandbox registry. This is not an official OEM registry check.",
      data: { ...record },
    });
  }
}
