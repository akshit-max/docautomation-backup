import { adminDb } from '@/lib/firebase-admin';

export interface SearchParams {
  q?: string;
  type?: string;
  status?: string;
  tag?: string;
  favorite?: boolean | string;
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
      status,
      tag,
      favorite,
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
    // We REMOVED the content.client_name Firestore filter here.
    // Doing it in Firestore requires a unique composite index for every combination of filters.
    // We will do it in-memory instead.
    
    if (from) {
      baseQuery = baseQuery.where('createdAt', '>=', from);
    }
    if (to) {
      baseQuery = baseQuery.where('createdAt', '<=', to);
    }

    // Always apply sorting to the base query now that we don't have Firestore inequality constraints
    baseQuery = baseQuery.orderBy(sort, order);

    let docs: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = false;

    // Helper to run a query with cursor
    const executeQuery = async (query: any) => {
      let finalQuery = query;
      if (cursor) {
        const cursorDoc = await adminDb.collection('documents').doc(cursor).get();
        if (cursorDoc.exists) {
          finalQuery = finalQuery.startAfter(cursorDoc);
        }
      }
      
      // If we are filtering by client, status, tag, favorite, or 'q' in-memory, fetch a larger batch
      const fetchLimit = (client || status || tag || favorite === 'true' || favorite === true || q) ? limit * 5 : limit;
      finalQuery = finalQuery.limit(fetchLimit);
      
      const snap = await finalQuery.get();
      
      if (snap.empty) return { docs: [], nextCursor: null, hasMore: false };

      let resultDocs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      // In-memory client filtering
      if (client) {
        const clientLower = client.toLowerCase();
        resultDocs = resultDocs.filter((doc: any) => {
           const docClient = doc.content?.client_name || '';
           return docClient.toLowerCase().includes(clientLower);
        });
      }

      // In-memory status filtering (treating missing status as Draft)
      if (status && status !== 'all') {
        resultDocs = resultDocs.filter((doc: any) => {
          const docStatus = doc.status ?? 'Draft';
          return docStatus === status;
        });
      }

      // In-memory tag filtering
      if (tag) {
        resultDocs = resultDocs.filter((doc: any) => {
          const docTags: string[] = doc.tags || [];
          return docTags.some(t => t.toLowerCase() === tag.toLowerCase());
        });
      }

      // In-memory favorite filtering
      if (favorite === 'true' || favorite === true) {
        resultDocs = resultDocs.filter((doc: any) => {
          return doc.isFavorite === true;
        });
      }

      // In-memory global search (q) filtering
      if (q) {
        const qLower = q.toLowerCase();
        resultDocs = resultDocs.filter((doc: any) => {
           const projName = (doc.project_name || '').toLowerCase();
           const clientName = (doc.content?.client_name || '').toLowerCase();
           const invoiceNum = (doc.content?.invoice_number || '').toLowerCase();
           const title = (doc.content?.title || '').toLowerCase();
           return projName.includes(qLower) || 
                  clientName.includes(qLower) || 
                  invoiceNum.includes(qLower) || 
                  title.includes(qLower);
        });
      }

      // Trim results to requested limit
      const trimmedDocs = resultDocs.slice(0, limit);
      const hasMoreResults = resultDocs.length > limit;
      const nextC = hasMoreResults ? trimmedDocs[trimmedDocs.length - 1]?.id : null;
      
      return { docs: trimmedDocs, nextCursor: nextC, hasMore: hasMoreResults };
    };

    const result = await executeQuery(baseQuery);
    docs = result.docs;
    nextCursor = result.nextCursor;
    hasMore = result.hasMore;

    return { documents: docs, nextCursor, hasMore };
  }
}
