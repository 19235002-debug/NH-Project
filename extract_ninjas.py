import json
import re

ninjas = {}
with open('database.sql', 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'INSERT INTO `master_ninjas`' in line:
            pattern = re.compile(r"\((\d+),'((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)',(\d+),'((?:[^'\\]|\\.)*)',(\d+),'((?:[^'\\]|\\.)*)',(\d+),(\d+),(\d+),(\d+),(\d+)")
            for m in pattern.finditer(line):
                nid, name, res, qual, grade, chakra, chakra_name, hp, atk, defe, spd, jutsu = m.groups()
                name = name.replace(r"\'", "'")
                res = res.replace(r"\'", "'")
                # Format: [name, quality, xmlfile, [chakra], hp, attack, def, speed, special_jutsu]
                ninjas[str(nid)] = [
                    name,
                    int(qual),
                    res,
                    [int(chakra)],
                    int(hp),
                    int(atk),
                    int(defe),
                    int(spd),
                    int(jutsu)
                ]

print('Total extracted ninjas:', len(ninjas))
print('170 (Ashura):', ninjas.get('170'))
print('199 (Fukasaku):', ninjas.get('199'))
print('17 (Naruto):', ninjas.get('17'))
print('9 (Konoha Guard):', ninjas.get('9'))

with open('master_ninjas_compact.json', 'w', encoding='utf-8') as out:
    json.dump(ninjas, out, indent=2)

print('Updated master_ninjas_compact.json successfully!')
