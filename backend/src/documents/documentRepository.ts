import { getDb } from "../db/client";

export type DocumentRecord = {
  id: number;
  applicationId: number;
  requirementId: number;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicDocument = {
  id: number;
  requirementId: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

type DocumentRow = {
  id: number;
  application_id: number;
  requirement_id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
};

const documentSelect = `
  SELECT
    id,
    application_id,
    requirement_id,
    original_filename,
    stored_filename,
    mime_type,
    file_size,
    storage_path,
    created_at,
    updated_at
  FROM application_documents
`;

function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    requirementId: row.requirement_id,
    originalFilename: row.original_filename,
    storedFilename: row.stored_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicDocument(document: DocumentRecord): PublicDocument {
  return {
    id: document.id,
    requirementId: document.requirementId,
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    createdAt: document.createdAt,
  };
}

export function listDocumentsForApplication(applicationId: number): DocumentRecord[] {
  const rows = getDb()
    .prepare(`${documentSelect} WHERE application_id = ? ORDER BY id ASC`)
    .all(applicationId) as DocumentRow[];

  return rows.map(mapDocument);
}

export function findDocumentForApplication(
  applicationId: number,
  documentId: number
): DocumentRecord | null {
  const row = getDb()
    .prepare(`${documentSelect} WHERE id = ? AND application_id = ? LIMIT 1`)
    .get(documentId, applicationId) as DocumentRow | undefined;

  return row ? mapDocument(row) : null;
}

export function createDocument(input: {
  applicationId: number;
  requirementId: number;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
}): DocumentRecord {
  const result = getDb()
    .prepare(
      `INSERT INTO application_documents (
         application_id,
         requirement_id,
         original_filename,
         stored_filename,
         mime_type,
         file_size,
         storage_path
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.applicationId,
      input.requirementId,
      input.originalFilename,
      input.storedFilename,
      input.mimeType,
      input.fileSize,
      input.storagePath
    );

  const created = findDocumentForApplication(input.applicationId, Number(result.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to load created document");
  }

  return created;
}

export function deleteDocument(applicationId: number, documentId: number): DocumentRecord | null {
  const existing = findDocumentForApplication(applicationId, documentId);
  if (!existing) {
    return null;
  }

  getDb()
    .prepare(`DELETE FROM application_documents WHERE id = ? AND application_id = ?`)
    .run(documentId, applicationId);

  return existing;
}
