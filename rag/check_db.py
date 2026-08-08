import sys
sys.path.append('rag')
from retrieval import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# Chunks per act
cur.execute('SELECT a."shortName", COUNT(c.id) as cnt FROM "LegalChunk" c LEFT JOIN "Act" a ON c."actId" = a.id GROUP BY a."shortName";')
print('Chunks per Act:')
for r in cur.fetchall():
    print(' ', dict(r))

# FTS column
cur.execute('SELECT COUNT(*) as total, COUNT(fts) as with_fts FROM "LegalChunk";')
r = dict(cur.fetchone())
print('FTS populated:', r)

# Embedding column
cur.execute('SELECT COUNT(*) as total, COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_emb FROM "LegalChunk";')
r = dict(cur.fetchone())
print('Embeddings:', r)

conn.close()
