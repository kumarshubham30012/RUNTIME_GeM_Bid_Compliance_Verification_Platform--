import { getDb } from "../db/client";
import type { EntityClassification, EntityComparison, EntityField, EntitySource, StoredEntityComparison } from "./types";

type ResultRow = {
  id: number;
  application_id: number;
  field_name: string;
  source_a: string;
  value_a: string;
  source_b: string;
  value_b: string;
  classification: string;
  confidence: number;
  reasoning: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ResultRow): StoredEntityComparison {
  return {
    id: row.id,
    applicationId: row.application_id,
    field: row.field_name as EntityField,
    sourceA: row.source_a as EntitySource,
    valueA: row.value_a,
    sourceB: row.source_b as EntitySource,
    valueB: row.value_b,
    classification: row.classification as EntityClassification,
    confidence: row.confidence,
    reasoning: row.reasoning,
    sandbox: row.source_a.endsWith("_VERIFICATION") || row.source_b.endsWith("_VERIFICATION"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listEntityResolutionResults(applicationId: number): StoredEntityComparison[] {
  const rows = getDb()
    .prepare(
      `SELECT id, application_id, field_name, source_a, value_a, source_b, value_b, classification, confidence, reasoning, created_at, updated_at
       FROM entity_resolution_results
       WHERE application_id = ?
       ORDER BY field_name ASC, source_a ASC, source_b ASC, id ASC`
    )
    .all(applicationId) as ResultRow[];

  return rows.map(mapRow);
}

export function replaceEntityResolutionResults(
  applicationId: number,
  comparisons: EntityComparison[]
): StoredEntityComparison[] {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO entity_resolution_results (
       application_id, field_name, source_a, value_a, source_b, value_b, classification, confidence, reasoning
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM entity_resolution_results WHERE application_id = ?`).run(applicationId);
    for (const comparison of comparisons) {
      insert.run(
        applicationId,
        comparison.field,
        comparison.sourceA,
        comparison.valueA,
        comparison.sourceB,
        comparison.valueB,
        comparison.classification,
        comparison.confidence,
        comparison.reasoning
      );
    }
  });

  tx();
  return listEntityResolutionResults(applicationId);
}
