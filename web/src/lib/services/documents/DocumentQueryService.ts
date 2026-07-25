import { adminDb } from '@/lib/firebase-admin';

export interface SearchParams {
  q?: string;
  type?: string;
  client?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
}

export interface SearchResult {
  documents: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class DocumentQueryService {
  /**
   * Search documents with fallback logic for multi-field prefix search.
   */
  static async searchDocuments(params: SearchParams): Promise<SearchResult> {
    const {
      q,
      type,
      client,
      from,
      to,
      sort = 'createdAt',
      order = 'desc',
      limit = 20,
      cursor,
    } = params;

    let baseQuery: any = adminDb.collection('documents').where('isDeleted', '==', false);

    if (type && type !== 'all') {
      baseQuery = baseQuery.where('template_type', '==', type);
    }
    if (client) {
      baseQuery = baseQuery.where('content.client_name', '==', client);
    }
    if (from) {
      baseQuery = baseQuery.where('createdAt', '>=', from);
    }
    if (to) {
      baseQuery = baseQuery.where('createdAt', '<=', to);
    }

    // Apply sorting
    if (!q) {
      // If no prefix search, we sort by the requested field
      baseQuery = baseQuery.orderBy(sort, order);
    } else {
      // If we have a prefix search, Firestore REQUIRES the first orderBy to be the field with the inequality filter.
      // So we cannot sort by `createdAt` if we are searching by `project_name` natively via query unless they are the same.
      // However, the fallback logic will handle ordering the fields appropriately.
    }

    let docs: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = false;

    // Helper to run a query with cursor
    const executeQuery = async (query: any) => {
      let finalQuery = query;
      if (cursor) {
        // Since cursor is the document ID in this simple implementation, we can fetch the doc snap.
        // But passing doc ID alone requires us to fetch the doc snap first.
        const cursorDoc = await adminDb.collection('documents').doc(cursor).get();
        if (cursorDoc.exists) {
          finalQuery = finalQuery.startAfter(cursorDoc);
        }
      }
      finalQuery = finalQuery.limit(limit);
      const snap = await finalQuery.get();
      
      if (snap.empty) return { docs: [], nextCursor: null, hasMore: false };

      const resultDocs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      const hasMoreResults = snap.docs.length === limit;
      const nextC = hasMoreResults ? snap.docs[snap.docs.length - 1].id : null;
      
      // If we did a prefix search, the result won't be ordered by `sort` param automatically
      // because Firestore forces order by the inequality field. We can do an in-memory sort here.
      if (q) {
         resultDocs.sort((a: any, b: any) => {
           const valA = a[sort] || '';
           const valB = b[sort] || '';
           if (valA < valB) return order === 'asc' ? -1 : 1;
           if (valA > valB) return order === 'asc' ? 1 : -1;
           return 0;
         });
      }

      return { docs: resultDocs, nextCursor: nextC, hasMore: hasMoreResults };
    };

    if (q) {
      const searchTerm = q; // keep original case for case-sensitive DBs, though prefix is usually case-sensitive in Firestore.
      
      // We will try fields in order: project_name, content.client_name, content.invoice_number, content.title
      const searchFields = [
        'project_name',
        'content.client_name',
        'content.invoice_number',
        'content.title'
      ];

      for (const field of searchFields) {
        let qQuery = baseQuery
          .where(field, '>=', searchTerm)
          .where(field, '<=', searchTerm + '\uf8ff')
          .orderBy(field, 'asc'); // Firestore requires this

        const result = await executeQuery(qQuery);
        if (result.docs.length > 0) {
          docs = result.docs;
          nextCursor = result.nextCursor;
          hasMore = result.hasMore;
          break; // Stop at the first field that yields results
        }
      }
    } else {
      // Normal fetch without search term
      const result = await executeQuery(baseQuery);
      docs = result.docs;
      nextCursor = result.nextCursor;
      hasMore = result.hasMore;
    }

    return { documents: docs, nextCursor, hasMore };
  }
}
