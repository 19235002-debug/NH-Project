import json, re

ninjas = {}
with open('database.sql', 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'INSERT INTO `master_ninjas`' in line:
            pattern = re.compile(r"\((\d+),'((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)',(\d+),'((?:[^'\\]|\\.)*)',(\d+),'((?:[^'\\]|\\.)*)',(\d+),(\d+),(\d+),(\d+),(\d+)")
            for m in pattern.finditer(line):
                nid, name, res, qual, grade, chakra, chakra_name, hp, atk, defe, spd, jutsu = m.groups()
                name = name.replace(r"\'", "'")
                res = res.replace(r"\'", "'")
                ninjas[int(nid)] = {
                    'id': int(nid),
                    'name': name,
                    'alt': name,
                    'xmlfile': res,
                    'quality': int(qual),
                    'grade': grade,
                    'chakra': [int(chakra)],
                    'hp': int(hp),
                    'attack': int(atk),
                    'def': int(defe),
                    'speed': int(spd),
                    'special_jutsu': int(jutsu)
                }

print('Extracted ninjas count:', len(ninjas))
print('Sample 170:', ninjas.get(170))
print('Sample 199:', ninjas.get(199))
print('Sample 9:', ninjas.get(9))
with open('master_ninjas_dump.json', 'w', encoding='utf-8') as out:
    json.dump(ninjas, out, indent=2)
