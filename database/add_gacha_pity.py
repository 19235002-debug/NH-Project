import pymysql

conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='ninja_heroes', autocommit=True)
cur = conn.cursor()
cur.execute("SHOW COLUMNS FROM users LIKE 'gacha_pity'")
res = cur.fetchone()
print("Existing gacha_pity:", res)
if not res:
    cur.execute("ALTER TABLE users ADD COLUMN gacha_pity INT NOT NULL DEFAULT 0 AFTER exam_floor")
    print("Added gacha_pity to users")

cur.execute("SHOW COLUMNS FROM users LIKE 'crane_pity'")
res2 = cur.fetchone()
print("Existing crane_pity:", res2)
if not res2:
    cur.execute("ALTER TABLE users ADD COLUMN crane_pity INT NOT NULL DEFAULT 0 AFTER gacha_pity")
    print("Added crane_pity to users")

# Also check SQLite database if it exists
import os, sqlite3
sqlite_path = 'database/ninja_heroes.sqlite'
if os.path.exists(sqlite_path):
    s_conn = sqlite3.connect(sqlite_path)
    s_cur = s_conn.cursor()
    s_cur.execute("PRAGMA table_info(users)")
    cols = [col[1] for col in s_cur.fetchall()]
    if 'gacha_pity' not in cols:
        s_cur.execute("ALTER TABLE users ADD COLUMN gacha_pity INTEGER NOT NULL DEFAULT 0")
        print("Added gacha_pity to SQLite users")
    if 'crane_pity' not in cols:
        s_cur.execute("ALTER TABLE users ADD COLUMN crane_pity INTEGER NOT NULL DEFAULT 0")
        print("Added crane_pity to SQLite users")
    s_conn.commit()
    s_conn.close()

print("Migration completed!")
