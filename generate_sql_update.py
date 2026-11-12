import pymysql

conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='ninja_heroes')
cur = conn.cursor()
cur.execute('SELECT id, xmlfile FROM master_ninjas WHERE id >= 150 ORDER BY id')
sql_lines = []
for rid, xml in cur.fetchall():
    sql_lines.append(f"UPDATE master_ninjas SET xmlfile = '{xml}' WHERE id = {rid};")

with open('database/update_master_ninjas_xmlfile.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines) + '\n')

print(f"Generated {len(sql_lines)} update queries in database/update_master_ninjas_xmlfile.sql")

