import json
import pymysql
import os

arm_dir = 'extracted_patch/armatures/resXML-iphonehd'
available_arms = set([f[:-4].lower() for f in os.listdir(arm_dir) if f.endswith('.png')])

with open('master_ninjas_compact.json', 'r', encoding='utf-8') as f:
    mn = json.load(f)

# Connect to DB
conn = pymysql.connect(host='127.0.0.1', user='root', password='', database='ninja_heroes')
cur = conn.cursor()
cur.execute('SELECT id, name, quality, grade, xmlfile, special_jutsu_id FROM master_ninjas')
db_ninjas = {row[0]: row for row in cur.fetchall()}

exact_mappings = {
    150: 'shinki',
    152: 'uchihashin',
    153: 'itachiedotensei',
    154: 'sasukewanderer',
    155: 'narutothelast',
    156: 'daemon',
    157: 'eida',
    158: 'urashikikarma',
    160: 'shisui',
    161: 'codenolimiter',
    163: 'konohamarusarutobi',
    164: 'toneri',
    165: 'toneritenseigan',
    166: 'shikamaruhokage',
    167: 'guijiao',
    168: 'tsunadesage',
    169: 'kimimarocursed',
    170: 'ashuraotsusuki',
    171: 'indraotsusuki',
    172: 'minatokyuubi',
    173: 'baryonnaruto',
    174: 'kurotsuchi',
    177: 'tayuyacursed',
    178: 'mitsuki',
    180: 'kakashihokage',
    181: 'chojuromizukage',
    182: 'primeisshiki',
    184: 'hidan',
    185: 'kidomarucursed',
    186: 'sakonukoncursed',
    187: 'primehagoromo',
    188: 'primekaguya',
    189: 'whitemaskobito',
    190: 'tentailsobito',
    191: 'borutotimeskip',
    192: 'byakugankaguya',
    193: 'kawakikarma',
    194: 'mangekyousarada',
    195: 'nagatoedotensei',
    196: 'sakumohatake',
    197: 'mightduy',
    198: 'himawaritimeskip',
    199: 'fukasaku',
    200: 'mamushishinju',
    201: 'matsurishinju',
    202: 'ryushinju',
    203: 'hidarishinju',
    204: 'jurashinju',
    205: 'hikariuchiha',
    206: 'nanashiuchiha',
    207: 'merz',
    208: 'sasukewanderer',
    209: 'narutoashuramode',
    210: 'retokazekage',
    211: 'chinobasemode',
    212: 'daemon',
    213: 'uzumakiashina',
    214: 'chocoakimichi',
    215: 'chozaakimichi',
    216: 'toneritenseigan',
    217: 'mitsukitimeskip',
    218: 'hidarishinju',
    219: 'jurashinju',
    220: 'tobiramaedotensei'
}

valid_map = {}
for nid, arm in exact_mappings.items():
    ninja_info = db_ninjas.get(nid)
    ninja_name = ninja_info[1] if ninja_info else 'Unknown'
    
    target_arm = arm
    if target_arm not in available_arms:
        matches = [a for a in available_arms if target_arm in a or a in target_arm]
        if matches:
            target_arm = matches[0]
            print(f'Fuzzy matched {arm} -> {target_arm} for ID {nid} ({ninja_name})')
        else:
            print(f'NOT FOUND: {arm} for ID {nid} ({ninja_name})')
            continue
    valid_map[nid] = target_arm
    print(f'MATCH: ID {nid} ({ninja_name}) -> {target_arm}')

print(f'\nTotal valid mapped ninjas: {len(valid_map)}')

# Update master_ninjas_compact.json
for nid, arm in valid_map.items():
    snid = str(nid)
    if snid in mn:
        mn[snid][2] = arm

with open('master_ninjas_compact.json', 'w', encoding='utf-8') as f:
    json.dump(mn, f, indent=2)
print('[+] Updated master_ninjas_compact.json')

# Update MySQL
for nid, arm in valid_map.items():
    cur.execute('UPDATE master_ninjas SET xmlfile = %s WHERE id = %s', (arm, nid))
conn.commit()
conn.close()
print('[+] Updated MySQL master_ninjas')

