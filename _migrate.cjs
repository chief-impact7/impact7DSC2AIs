const https = require('https');
const config = require('/Users/jongsooyi/.config/configstore/firebase-tools.json');
const accessToken = config.tokens.access_token;
const projectId = 'impact7db';
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

// --- REST API helpers ---

function firestoreRequest(method, url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else if (res.statusCode === 404) {
          resolve(null); // document not found
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${method} ${parsed.pathname}: ${data.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getDoc(docPath) {
  return firestoreRequest('GET', `${baseUrl}/${docPath}`);
}

function getMemos(docId) {
  return firestoreRequest('GET', `${baseUrl}/students/${encodeURIComponent(docId)}/memos`);
}

function createOrUpdateDoc(docPath, fields) {
  return firestoreRequest('PATCH', `${baseUrl}/${docPath}`, { fields });
}

function createMemo(parentDocId, memoFields) {
  return firestoreRequest('POST', `${baseUrl}/students/${encodeURIComponent(parentDocId)}/memos`, { fields: memoFields });
}

function deleteDoc(docPath) {
  return firestoreRequest('DELETE', `${baseUrl}/${docPath}`);
}

function createHistoryLog(fields) {
  return firestoreRequest('POST', `${baseUrl}/history_logs`, { fields });
}

function extractValue(field) {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.nullValue !== undefined) return null;
  if (field.arrayValue) return (field.arrayValue.values || []).map(extractValue);
  if (field.mapValue) {
    const obj = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) obj[k] = extractValue(v);
    return obj;
  }
  return null;
}

// --- Main migration ---

(async () => {
  try {
    console.log('=== Firestore Migration Script ===\n');

    // ============================================================
    // STEP 1: Delete 5 phone-normalization duplicates (010 → keep 10)
    // ============================================================
    console.log('--- STEP 1: Delete phone-normalization duplicates ---\n');

    const phoneDups = [
      { dup: '권용민_01020069321_10단지', keep: '권용민_1020069321_10단지' },
      { dup: '김윤서_01051510508_2단지',  keep: '김윤서_1051510508_2단지' },
      { dup: '문준영_01034484736_2단지',  keep: '문준영_1034484736_2단지' },
      { dup: '서은호_01048410006_2단지',  keep: '서은호_1048410006_2단지' },
      { dup: '윤예은_01063965734_2단지',  keep: '윤예은_1063965734_2단지' },
    ];

    for (const { dup, keep } of phoneDups) {
      console.log(`Processing duplicate: ${dup} → keep: ${keep}`);

      // Check if duplicate exists
      const dupDoc = await getDoc(`students/${encodeURIComponent(dup)}`);
      if (!dupDoc) {
        console.log(`  [SKIP] Duplicate ${dup} does not exist (already deleted?)`);
        continue;
      }

      // Check for memos in duplicate
      const memosResult = await getMemos(dup);
      const memos = (memosResult && memosResult.documents) || [];
      if (memos.length > 0) {
        console.log(`  Found ${memos.length} memos in duplicate, copying to kept doc...`);
        for (const memo of memos) {
          const memoFields = memo.fields || {};
          await createMemo(keep, memoFields);
          console.log(`    Copied memo: ${memo.name.split('/').pop()}`);
          // Delete original memo
          const memoPath = memo.name.split('/documents/')[1];
          await deleteDoc(memoPath);
          console.log(`    Deleted original memo`);
        }
      } else {
        console.log(`  No memos in duplicate`);
      }

      // Delete duplicate document
      await deleteDoc(`students/${encodeURIComponent(dup)}`);
      console.log(`  [DONE] Deleted ${dup}\n`);
    }

    // ============================================================
    // STEP 2: Merge 김윤서 3→1
    // ============================================================
    console.log('--- STEP 2: Merge 김윤서 3→1 ---\n');

    const yoonseoTarget = '김윤서_1051510508';
    const yoonseoSources = ['김윤서_1051510508_2단지', '김윤서_1030894402_2단지'];

    // Check if target already exists (idempotency)
    const existingTarget = await getDoc(`students/${encodeURIComponent(yoonseoTarget)}`);
    if (existingTarget) {
      console.log(`  [SKIP] Target ${yoonseoTarget} already exists. Skipping merge.`);
    } else {
      // Fetch both source documents
      const src1 = await getDoc(`students/${encodeURIComponent(yoonseoSources[0])}`);
      const src2 = await getDoc(`students/${encodeURIComponent(yoonseoSources[1])}`);

      if (!src1 && !src2) {
        console.log(`  [SKIP] Both sources already deleted, but target not found. Manual check needed.`);
      } else {
        const fields1 = src1 ? src1.fields || {} : {};
        const fields2 = src2 ? src2.fields || {} : {};

        // Merge enrollments from both
        const enrollments1 = (fields1.enrollments && fields1.enrollments.arrayValue && fields1.enrollments.arrayValue.values) || [];
        const enrollments2 = (fields2.enrollments && fields2.enrollments.arrayValue && fields2.enrollments.arrayValue.values) || [];
        const mergedEnrollments = [...enrollments1, ...enrollments2];

        // Build merged document: start with src1 fields, overlay specific fields from src2
        const mergedFields = { ...fields1 };

        // Merge enrollments
        mergedFields.enrollments = {
          arrayValue: {
            values: mergedEnrollments.length > 0 ? mergedEnrollments : []
          }
        };

        // Preserve parent_phone_1 from src1 (김윤서_1051510508_2단지)
        // Preserve parent_phone_2 from src2 (김윤서_1030894402_2단지)
        if (fields2.parent_phone_2) {
          mergedFields.parent_phone_2 = fields2.parent_phone_2;
        } else if (fields2.parent_phone_1) {
          // If src2 doesn't have parent_phone_2 but has parent_phone_1, use it as parent_phone_2
          mergedFields.parent_phone_2 = fields2.parent_phone_1;
        }

        // Remove branch field (new doc has no branch suffix)
        delete mergedFields.branch;

        // Create merged document
        await createOrUpdateDoc(`students/${encodeURIComponent(yoonseoTarget)}`, mergedFields);
        console.log(`  Created merged doc: ${yoonseoTarget}`);

        // Copy memos from both sources
        for (const srcId of yoonseoSources) {
          const memosResult = await getMemos(srcId);
          const memos = (memosResult && memosResult.documents) || [];
          console.log(`  Copying ${memos.length} memos from ${srcId}...`);
          for (const memo of memos) {
            await createMemo(yoonseoTarget, memo.fields || {});
            const memoPath = memo.name.split('/documents/')[1];
            await deleteDoc(memoPath);
          }
        }

        // Delete source documents
        for (const srcId of yoonseoSources) {
          const srcDoc = await getDoc(`students/${encodeURIComponent(srcId)}`);
          if (srcDoc) {
            await deleteDoc(`students/${encodeURIComponent(srcId)}`);
            console.log(`  Deleted source: ${srcId}`);
          } else {
            console.log(`  [SKIP] Source ${srcId} already deleted`);
          }
        }

        // History log for this merge
        await createHistoryLog({
          doc_id: { stringValue: yoonseoTarget },
          change_type: { stringValue: 'UPDATE' },
          before: { stringValue: `병합: ${yoonseoSources.join(', ')}` },
          after: { stringValue: `병합 완료: ${yoonseoTarget}` },
          google_login_id: { stringValue: 'system@migration' },
          timestamp: { timestampValue: new Date().toISOString() },
        });
        console.log(`  [DONE] History log added for ${yoonseoTarget}\n`);
      }
    }

    // ============================================================
    // STEP 3: Merge 2 multi-branch students
    // ============================================================
    console.log('--- STEP 3: Merge multi-branch students ---\n');

    const multiBranchMerges = [
      {
        sources: ['김유성_1074363777_10단지', '김유성_1074363777_2단지'],
        target: '김유성_1074363777',
      },
      {
        sources: ['임승찬_1026482208_10단지', '임승찬_1026482208_2단지'],
        target: '임승찬_1026482208',
      },
    ];

    for (const { sources, target } of multiBranchMerges) {
      console.log(`Merging ${sources.join(' + ')} → ${target}`);

      // Check if target already exists (idempotency)
      const existing = await getDoc(`students/${encodeURIComponent(target)}`);
      if (existing) {
        console.log(`  [SKIP] Target ${target} already exists. Skipping merge.\n`);
        continue;
      }

      // Fetch source documents
      const srcDocs = [];
      for (const srcId of sources) {
        const doc = await getDoc(`students/${encodeURIComponent(srcId)}`);
        srcDocs.push({ id: srcId, doc });
      }

      const validSources = srcDocs.filter(s => s.doc != null);
      if (validSources.length === 0) {
        console.log(`  [SKIP] No source documents found. Manual check needed.\n`);
        continue;
      }

      // Start with the first valid source's fields as base
      const mergedFields = { ...(validSources[0].doc.fields || {}) };

      // Merge enrollments from all sources
      const allEnrollments = [];
      for (const { doc } of validSources) {
        const fields = doc.fields || {};
        const enrolls = (fields.enrollments && fields.enrollments.arrayValue && fields.enrollments.arrayValue.values) || [];
        allEnrollments.push(...enrolls);
      }
      mergedFields.enrollments = {
        arrayValue: {
          values: allEnrollments.length > 0 ? allEnrollments : []
        }
      };

      // Remove branch field
      delete mergedFields.branch;

      // Create merged document
      await createOrUpdateDoc(`students/${encodeURIComponent(target)}`, mergedFields);
      console.log(`  Created merged doc: ${target}`);

      // Copy memos from all sources
      for (const srcId of sources) {
        const memosResult = await getMemos(srcId);
        const memos = (memosResult && memosResult.documents) || [];
        console.log(`  Copying ${memos.length} memos from ${srcId}...`);
        for (const memo of memos) {
          await createMemo(target, memo.fields || {});
          const memoPath = memo.name.split('/documents/')[1];
          await deleteDoc(memoPath);
        }
      }

      // Delete source documents
      for (const srcId of sources) {
        const srcDoc = await getDoc(`students/${encodeURIComponent(srcId)}`);
        if (srcDoc) {
          await deleteDoc(`students/${encodeURIComponent(srcId)}`);
          console.log(`  Deleted source: ${srcId}`);
        } else {
          console.log(`  [SKIP] Source ${srcId} already deleted`);
        }
      }

      // History log
      await createHistoryLog({
        doc_id: { stringValue: target },
        change_type: { stringValue: 'UPDATE' },
        before: { stringValue: `병합: ${sources.join(', ')}` },
        after: { stringValue: `병합 완료: ${target}` },
        google_login_id: { stringValue: 'system@migration' },
        timestamp: { timestampValue: new Date().toISOString() },
      });
      console.log(`  [DONE] History log added for ${target}\n`);
    }

    console.log('=== Migration complete ===');
  } catch (e) {
    console.error('Migration error:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
})();
