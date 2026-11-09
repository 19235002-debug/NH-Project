#!/usr/bin/env python3
"""
Ninja Heroes / Heroes Legend Local WebSocket Game Server
Listens on 0.0.0.0:8080 with endpoint /nadsocket
Connects to MySQL `ninja_heroes` and serves player data to the Cocos2d-x game client.
"""

import sys
import os

# Vendorized pure-python modules (pymysql, websockets)
_base_dir = os.path.dirname(os.path.abspath(__file__))
_vendor_dir = os.path.join(_base_dir, 'py_modules')
if os.path.exists(_vendor_dir) and _vendor_dir not in sys.path:
    sys.path.insert(0, _vendor_dir)

import asyncio
import json
import time
import datetime
import re
import pymysql

try:
    from websockets.asyncio.server import serve
except ImportError:
    from websockets.server import serve
import websockets

# Environment & Database config
def load_env():
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('"\'')
                    if k not in os.environ:
                        os.environ[k] = v

load_env()

DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
if DB_HOST == 'localhost':
    DB_HOST = '127.0.0.1'
DB_PORT = int(os.environ.get('DB_PORT', 3306))
DB_USER = os.environ.get('DB_USERNAME', 'root')
DB_PASS = os.environ.get('DB_PASSWORD', '')
DB_NAME = os.environ.get('DB_DATABASE', 'ninja_heroes')
WS_PORT = int(os.environ.get('GAME_WS_PORT', 8080))

def get_db():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

def now_ms():
    return int(time.time() * 1000)

def get_player_full_data(user_identifier):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            user = None
            # If user_identifier is numeric, query by user id first
            if str(user_identifier).isdigit():
                cur.execute("SELECT * FROM users WHERE id = %s LIMIT 1", (int(user_identifier),))
                user = cur.fetchone()
            if not user:
                cur.execute("SELECT * FROM users WHERE username = %s OR email = %s LIMIT 1", (str(user_identifier), str(user_identifier)))
                user = cur.fetchone()
            if not user:
                # Fallback to first user in DB or default admin
                cur.execute("SELECT * FROM users ORDER BY id ASC LIMIT 1")
                user = cur.fetchone()

            if not user:
                # Default fallback user
                user = {
                    "id": 1,
                    "username": str(user_identifier) or "Shinobi",
                    "level": 50,
                    "silver": 9999999,
                    "gold": 999999,
                    "stamina": 200,
                    "avatar_ninja_id": 102
                }

            user_id = user["id"]

            # Query player ninjas
            cur.execute("""
                SELECT pn.*, mn.name as ninja_name, mn.quality, mn.grade, mn.chakra_type, mn.special_jutsu_id, mn.learnable_jutsus,
                       mn.base_hp, mn.base_atk, mn.base_def, mn.base_speed
                FROM player_ninjas pn
                JOIN master_ninjas mn ON pn.ninja_id = mn.id
                WHERE pn.user_id = %s
            """, (user_id,))
            p_ninjas = cur.fetchall()

            # If no ninjas in DB, give starter pack (Naruto, Sasuke, Madara)
            if not p_ninjas:
                default_ninja_ids = [17, 27, 102] # Naruto, Sasuke, Madara
                for nid in default_ninja_ids:
                    cur.execute("INSERT INTO player_ninjas (user_id, ninja_id, level, exp, is_main, jutsu_slot_1) VALUES (%s, %s, 50, 0, 1, 1)", (user_id, nid))
                cur.execute("""
                    SELECT pn.*, mn.name as ninja_name, mn.quality, mn.grade, mn.chakra_type, mn.special_jutsu_id, mn.learnable_jutsus,
                           mn.base_hp, mn.base_atk, mn.base_def, mn.base_speed
                    FROM player_ninjas pn
                    JOIN master_ninjas mn ON pn.ninja_id = mn.id
                    WHERE pn.user_id = %s
                """, (user_id,))
                p_ninjas = cur.fetchall()

            hero_list = []
            heros_map = {}
            mars = []
            public_heroes = {}
            total_team_power = 0

            # Track 3 combat formation slots (Slot 1, 2, 3) and 12 deploy board support slots (Slot 1..12)
            combat_slots = {1: None, 2: None, 3: None}
            deploy_slots = {i: None for i in range(1, 13)}
            used_ninja_ids = set()

            for row in p_ninjas:
                hid = int(row["id"])
                nid = int(row["ninja_id"])
                hero_list.append(hid)

                slot = int(row.get("is_main") or 0)
                if slot in [1, 2, 3] and combat_slots[slot] is None:
                    if nid not in used_ninja_ids:
                        combat_slots[slot] = hid
                        used_ninja_ids.add(nid)
                    else:
                        cur.execute("UPDATE player_ninjas SET is_main = 0 WHERE id = %s", (hid,))

                d_slot = int(row.get("deploy_slot") or 0)
                if 1 <= d_slot <= 12 and deploy_slots[d_slot] is None:
                    if nid not in used_ninja_ids:
                        deploy_slots[d_slot] = hid
                        used_ninja_ids.add(nid)
                    else:
                        cur.execute("UPDATE player_ninjas SET deploy_slot = 0 WHERE id = %s", (hid,))

                # Split learnable jutsus
                eskills = []
                if row.get("learnable_jutsus"):
                    for s in str(row["learnable_jutsus"]).split("|"):
                        if s.strip().isdigit():
                            eskills.append(int(s.strip()))

                # Collect equipped skills (4 standard, VIP 5th slot, Summon, Bijuu)
                equipped_skills = []
                for j_field in ["jutsu_slot_1", "jutsu_slot_2", "jutsu_slot_3", "jutsu_slot_4", "jutsu_slot_5", "summon_jutsu_id", "biju_jutsu_id"]:
                    val = row.get(j_field)
                    if val and int(val) > 0:
                        equipped_skills.append(int(val))

                lv = max(1, int(row.get("level", 1) or 1))
                base_hp = int(row.get("base_hp") or 300)
                base_atk = int(row.get("base_atk") or 60)
                base_def = int(row.get("base_def") or 60)
                base_spd = int(row.get("base_speed") or 60)

                hp = base_hp + (lv * 35)
                att = base_atk + (lv * 18)
                defe = base_def + (lv * 14)
                agi = base_spd + (lv * 10)
                power = int(att * 2.5 + defe * 2.0 + hp * 0.6 + agi * 1.5)

                hero_obj = {
                    "id": nid,
                    "hid": hid,
                    "name": row.get("name") or row.get("ninja_name") or "Ninja",
                    "lv": lv,
                    "exp": int(row.get("exp", 0) or 0),
                    "rxp": max(100, lv * 100),
                    "quality": int(row.get("quality", 2) or 2),
                    "chakra": [int(row.get("chakra_type") or 1)],
                    "skills": equipped_skills if equipped_skills else [1149],
                    "eskill": eskills if eskills else [1149],
                    "star": 1,
                    "costume": 0,
                    "qlv": 0,
                    "slv": 1,
                    "hp": hp,
                    "att": att,
                    "def": defe,
                    "agi": agi,
                    "power": power
                }
                heros_map[str(hid)] = hero_obj
                public_heroes[str(hid)] = {
                    "att": att,
                    "def": defe,
                    "hp": hp,
                    "agi": agi,
                    "power": power
                }

            # Build strictly 3-element mars list (slot 1, slot 2, slot 3)
            mars = [
                combat_slots[1] if combat_slots[1] else 0,
                combat_slots[2] if combat_slots[2] else 0,
                combat_slots[3] if combat_slots[3] else 0
            ]
            if mars == [0, 0, 0] and hero_list:
                mars[0] = hero_list[0]

            for m_hid in mars:
                if m_hid and str(m_hid) in heros_map:
                    total_team_power += heros_map[str(m_hid)]["power"]

            # Authentic aids list for HouYuanTuan (Deploy Board - 12 Slots)
            aids = []
            max_d_slot = 0
            for s in range(1, 13):
                if deploy_slots[s] is not None:
                    max_d_slot = s

            for s in range(1, max(max_d_slot + 1, 1)):
                if max_d_slot > 0:
                    aids.append(deploy_slots[s] if deploy_slots[s] is not None else 0)

            # Building list with cooldown tracking and daily free quota
            now_sec = int(time.time())
            today_str = datetime.datetime.now().strftime("%Y-%m-%d")
            cur.execute("SELECT id, cd FROM master_buildings")
            mb_rows = {r["id"]: r for r in cur.fetchall()}

            cur.execute("SELECT building_id, level, last_produce_time, free_draws, last_free_date FROM player_buildings WHERE user_id = %s", (user_id,))
            pb_rows = {r["building_id"]: r for r in cur.fetchall()}

            build_map = {}
            for b_id in range(1, 18):
                mb = mb_rows.get(b_id, {})
                pb = pb_rows.get(b_id, {})
                b_lv = pb.get("level", 10) or 10
                last_time = pb.get("last_produce_time", 0) or 0

                cd_sec = 0
                raw_cd = mb.get("cd") or ""
                if b_id == 2:
                    cd_sec = 600 # 10 minutes wait time between Jutsu free draws
                elif raw_cd:
                    try:
                        cd_min = int(raw_cd.split("|")[0])
                        cd_sec = cd_min * 60
                    except Exception:
                        cd_sec = 3600
                elif b_id in (1, 3):
                    cd_sec = 3600
                elif b_id in (5, 6):
                    cd_sec = 7200

                remaining_cd = 0
                if last_time > 0 and cd_sec > 0:
                    elapsed = now_sec - last_time
                    if elapsed < cd_sec:
                        remaining_cd = cd_sec - elapsed

                # Building 2 (Ninjutsu School) daily free 5x quota
                free_quota = 0
                if b_id == 2:
                    last_f_date = pb.get("last_free_date") or ""
                    if last_f_date != today_str:
                        free_quota = 5
                        cur.execute("""
                            INSERT INTO player_buildings (user_id, building_id, level, last_produce_time, free_draws, last_free_date)
                            VALUES (%s, 2, %s, %s, 5, %s)
                            ON DUPLICATE KEY UPDATE free_draws = 5, last_free_date = %s
                        """, (user_id, b_lv, last_time, today_str, today_str))
                    else:
                        free_quota = int(pb.get("free_draws") if pb.get("free_draws") is not None else 5)

                build_map[str(b_id)] = {
                    "id": b_id,
                    "lv": b_lv,
                    "state": 0,
                    "num": free_quota if b_id == 2 else 0,
                    "cd": [remaining_cd, 0, 0, 0]
                }

            data = {
                "player": {
                    "name": user["username"],
                    "userId": str(user_id),
                    "id": user_id,
                    "lv": max(int(user.get("level", 1) or 1), 1),
                    "exp": int(user.get("exp", 0) or 0),
                    "gold": int(user.get("gold", 0) or 0),
                    "silver": int(user.get("silver", 0) or 0),
                    "energy": int(user.get("stamina", 100) or 100),
                    "coin": int(user.get("coin", 0) or 0),
                    "vipLv": int(user.get("vip_level") or 0),
                    "vipExp": int(user.get("vip_exp") or 0),
                    "arenapoint": int(user.get("arena_points", 0) or 0),
                    "sbet": 0,
                    "bet": 0,
                    "giftStatus": {},
                    "giftValue": {},
                    "giftDay": 0,
                    "spoint": 0,
                    "operStatus": 0,
                    "fund": 1,
                    "mCard": 0,
                    "unlockSkillLv": 3,
                    "isOpenMonthCard": 1,
                    "isOpenGiftCode": 1,
                    "beastOpen": 1
                },
                "heros": {
                    "heroList": hero_list,
                    "heros": heros_map,
                    "hes": heros_map,
                    "mars": mars,
                    "marsLeng": 3,
                    "rings": [],
                    "ringsLeng": 9,
                    "aids": aids,
                    "currentKey": mars[0] if mars and mars[0] else (hero_list[0] if hero_list else 1),
                    "aidsTiro": len(aids) == 0,
                    "publicStats": {
                        "version": 1,
                        "teamPower": total_team_power,
                        "heroes": public_heroes
                    }
                },
                "hes": heros_map,
                "adventure": {
                    "adv": (lambda ch, st: [
                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] if c < ch else list(range(1, st + 1))
                        for c in range(1, ch + 1)
                    ])(max(int(user.get("map_chapter") or 1), 1), max(int(user.get("map_stage") or 1), 1)),
                    "maxAdv": max(int(user.get("map_chapter") or 1), 1)
                },
                "buildings": {
                    "build": build_map
                },
                "inventory": {
                    "items": []
                },
                "itemList": {
                    "list": []
                },
                "quest": {
                    "quests": []
                },
                "enterGame": {
                    "code": 1,
                    "success": True
                },
                "onboarding": {
                    "version": 1,
                    "coreCompleted": True
                }
            }
            return data
    finally:
        conn.close()

import random

def roll_grade(hut_type):
    if hut_type == 'basic':
        # D: 55%, C: 35%, B: 8.5%, A: 1.4%, S: 0.1%
        r = random.uniform(0.1, 100.0)
        if r <= 0.1: return 'S'
        if r <= 1.5: return 'A'
        if r <= 10.0: return 'B'
        if r <= 45.0: return 'C'
        return 'D'
    elif hut_type == 'advanced':
        # UR: 0.2%, SSS: 0.8%, SS: 3.0%, S: 9.0%, A: 32.0%, B: 55.0%
        r = random.uniform(0.1, 100.0)
        if r <= 0.2: return 'UR'
        if r <= 1.0: return 'SSS'
        if r <= 4.0: return 'SS'
        if r <= 13.0: return 'S'
        if r <= 45.0: return 'A'
        return 'B'
    elif hut_type == 'special_guaranteed':
        # Slot 10 of 10-combo capture: guaranteed Grade A or higher
        # UR: 1.5%, SSS: 4.5%, SS: 14.0%, S: 30.0%, A: 50.0%
        r = random.uniform(0.1, 100.0)
        if r <= 1.5: return 'UR'
        if r <= 6.0: return 'SSS'
        if r <= 20.0: return 'SS'
        if r <= 50.0: return 'S'
        return 'A'
    elif hut_type in ('crane', 'crane_10x'):
        # Authentic Catchninja.js: S (88.4%), SS (9.0%), SSS (2.0%), UR (0.6%)
        r = random.randint(1, 10000)
        if r <= 8840: return 'S'
        if r <= 9740: return 'SS'
        if r <= 9940: return 'SSS'
        return 'UR'
    return 'D'

def execute_gacha(user_identifier, hut_type):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # 1. Fetch user
            user = None
            if str(user_identifier).isdigit():
                cur.execute("SELECT * FROM users WHERE id = %s LIMIT 1", (int(user_identifier),))
                user = cur.fetchone()
            if not user:
                cur.execute("SELECT * FROM users WHERE username = %s OR email = %s LIMIT 1", (str(user_identifier), str(user_identifier)))
                user = cur.fetchone()
            if not user:
                cur.execute("SELECT * FROM users ORDER BY id ASC LIMIT 1")
                user = cur.fetchone()
            if not user:
                raise Exception("User not found.")

            user_id = user["id"]
            user_silver = int(user.get("silver", 0))
            user_gold = int(user.get("gold", 0))
            current_pity = int(user.get("gacha_pity", 0) or 0)
            current_crane_pity = int(user.get("crane_pity", 0) or 0)

            cost_silver = 0
            cost_gold = 0
            pull_count = 1
            is_crane = False
            force_ur = False

            if hut_type == 'basic':
                cost_silver = 30000
                pull_count = 1
                if user_silver < cost_silver:
                    raise Exception("Not enough Silver. Need 30,000 Silver.")
            elif hut_type == 'advanced':
                cost_gold = 298
                pull_count = 1
                if user_gold < cost_gold:
                    raise Exception("Not enough Gold. Need 298 Gold.")
            elif hut_type == 'special':
                cost_gold = 2980
                pull_count = 10
                if user_gold < cost_gold:
                    raise Exception("Not enough Gold. Need 2,980 Gold.")
            elif hut_type == 'crane':
                cost_gold = 298
                pull_count = 1
                is_crane = True
                if user_gold < cost_gold:
                    raise Exception("Not enough Gold. Need 298 Gold.")
            elif hut_type == 'crane_10x':
                cost_gold = 2980
                pull_count = 10
                is_crane = True
                if user_gold < cost_gold:
                    raise Exception("Not enough Gold. Need 2,980 Gold.")
            elif hut_type in ('raffle50', 'raffle_new50'):
                pull_count = 1
                force_ur = True
                if hut_type == 'raffle_new50':
                    is_crane = True
            else:
                raise Exception(f"Unknown hut type: {hut_type}")

            # Check if player has any ninja yet
            cur.execute("SELECT COUNT(*) as count FROM player_ninjas WHERE user_id = %s", (user_id,))
            has_ninja = cur.fetchone()["count"] > 0

            recruited_ninjas = []
            for i in range(pull_count):
                is_slot_10 = (hut_type == 'special' and i == 9)
                target_grade = 'D'

                if force_ur:
                    target_grade = 'UR'
                    if is_crane:
                        current_crane_pity = 0
                    else:
                        current_pity = 0
                elif is_crane:
                    current_crane_pity += 1
                    if current_crane_pity >= 50:
                        target_grade = 'UR'
                        current_crane_pity = 0
                    else:
                        target_grade = roll_grade('crane')
                        if target_grade == 'UR':
                            current_crane_pity = 0
                else:
                    if hut_type == 'basic':
                        target_grade = roll_grade('basic')
                    else:
                        current_pity += 1
                        if current_pity >= 50:
                            target_grade = 'UR'
                            current_pity = 0
                        elif is_slot_10:
                            target_grade = roll_grade('special_guaranteed')
                            if target_grade == 'UR':
                                current_pity = 0
                        else:
                            target_grade = roll_grade('advanced')
                            if target_grade == 'UR':
                                current_pity = 0

                cur.execute("SELECT * FROM master_ninjas WHERE grade = %s AND gacha_available = 1 ORDER BY RAND() LIMIT 1", (target_grade,))
                ninja = cur.fetchone()
                if not ninja:
                    cur.execute("SELECT * FROM master_ninjas WHERE gacha_available = 1 ORDER BY RAND() LIMIT 1")
                    ninja = cur.fetchone()

                is_main = 1 if (not has_ninja and i == 0) else 0
                cur.execute(
                    "INSERT INTO player_ninjas (user_id, ninja_id, level, exp, is_main, jutsu_slot_1) VALUES (%s, %s, 1, 0, %s, %s)",
                    (user_id, ninja["id"], is_main, ninja.get("special_jutsu_id", 1149))
                )
                p_id = cur.lastrowid
                recruited_ninjas.append({
                    "player_ninja_id": p_id,
                    "ninja_id": ninja["id"],
                    "ninja": ninja
                })

            # Deduct currency & update pity
            if is_crane:
                cur.execute("UPDATE users SET silver = silver - %s, gold = gold - %s, crane_pity = %s WHERE id = %s", (cost_silver, cost_gold, current_crane_pity, user_id))
            else:
                cur.execute("UPDATE users SET silver = silver - %s, gold = gold - %s, gacha_pity = %s WHERE id = %s", (cost_silver, cost_gold, current_pity, user_id))

            first_nid = recruited_ninjas[0]["ninja_id"]
            return {
                "success": True,
                "recruited_ninjas": recruited_ninjas,
                "first_ninja_id": first_nid,
                "count": pull_count,
                "updated_player_data": get_player_full_data(user_id)
            }
    finally:
        conn.close()

async def handler(websocket):
    client_ip = websocket.remote_address
    print(f"[+] New connection from {client_ip} path={websocket.request.path if hasattr(websocket, 'request') else 'nadsocket'}", flush=True)

    current_user = "admin"

    try:
        async for message in websocket:
            print(f"<- RECV: {message[:180]}...", flush=True)
            try:
                pkt = json.loads(message)
            except Exception as e:
                print(f"[!] JSON parse error: {e}", flush=True)
                continue

            pkt_type = pkt.get("type")

            # 1. Login packet (type: 8 = nad.LOG_IN)
            if pkt_type == 8:
                source = pkt.get("source", [])
                if isinstance(source, list) and len(source) > 0:
                    current_user = str(source[0])
                print(f"[*] Player login request for user: '{current_user}'", flush=True)

                # Send START event (type: 26 = nad.START)
                start_evt = {
                    "type": 26,
                    "source": 0,
                    "timeStamp": now_ms()
                }
                await websocket.send(json.dumps(start_evt))
                print(f"-> SENT: nad.START (type 26)", flush=True)

            # 2. Network message / CNameEvent (type: 29) or Session message (type: 28)
            elif pkt_type in (28, 29):
                c_name = pkt.get("cName", "")
                source = pkt.get("source", {})

                # Check if this is DefaultPlayerEvent or initial handshake
                if "DefaultPlayerEvent" in str(c_name) or (isinstance(source, dict) and "teamWarst" in source):
                    print(f"[*] Dispatching Player State for '{current_user}'", flush=True)

                    # 1. Send LOG_IN_SUCCESS (type: 11 = nad.LOG_IN_SUCCESS) -> dismisses loading spinner
                    succ_evt = {
                        "type": 11,
                        "source": 0,
                        "timeStamp": now_ms()
                    }
                    await websocket.send(json.dumps(succ_evt))
                    print(f"-> SENT: nad.LOG_IN_SUCCESS (type 11)", flush=True)

                    # 2. Fetch and send full player payload
                    player_data = get_player_full_data(current_user)
                    data_evt = {
                        "type": 29,
                        "source": player_data,
                        "timeStamp": now_ms()
                    }
                    await websocket.send(json.dumps(data_evt))
                    print(f"-> SENT: Player Data & EnterGame (type 29)", flush=True)

                # Check if this is a Gacha (raffle) recruitment action from client
                elif isinstance(source, dict) and any(k in source for k in ("raffle", "raffle_new", "raffle50", "raffle_new50")):
                    print(f"[*] Handling in-game Gacha action: {source}", flush=True)
                    hut_type = 'basic'
                    if "raffle" in source:
                        r_data = source["raffle"]
                        idx = r_data.get("idx", 0) if isinstance(r_data, dict) else 0
                        if idx == 0:
                            hut_type = 'basic'
                        elif idx == 1:
                            hut_type = 'advanced'
                        else:
                            hut_type = 'special' # 10-combo capture
                    elif "raffle_new" in source:
                        cr_data = source["raffle_new"]
                        idx = cr_data.get("idx", 0) if isinstance(cr_data, dict) else 0
                        hut_type = 'crane' if idx == 0 else 'crane_10x'
                    elif "raffle50" in source:
                        hut_type = 'raffle50'
                    elif "raffle_new50" in source:
                        hut_type = 'raffle_new50'

                    try:
                        g_res = execute_gacha(current_user, hut_type)
                        print(f"[+] In-game Gacha Success: {g_res['count']} ninja(s) recruited (First ID: {g_res['first_ninja_id']})", flush=True)

                        # Dismiss loading spinner
                        await websocket.send(json.dumps({"type": 11, "source": 0, "timeStamp": now_ms()}))

                        # Send operResult with param = first_ninja_id for client animation
                        oper_reply = {
                            "type": 29,
                            "source": {
                                "operResult": {
                                    "success": True,
                                    "type": 1,
                                    "param": g_res["first_ninja_id"]
                                }
                            },
                            "timeStamp": now_ms()
                        }
                        await websocket.send(json.dumps(oper_reply))

                        # Send updated player & heros state to update client UI and team in real-time
                        up_data = g_res["updated_player_data"]
                        sync_reply = {
                            "type": 29,
                            "source": {
                                "player": up_data["player"],
                                "heros": up_data["heros"]
                            },
                            "timeStamp": now_ms()
                        }
                        await websocket.send(json.dumps(sync_reply))

                    except Exception as ge:
                        print(f"[!] Gacha failed: {ge}", flush=True)
                        err_reply = {
                            "type": 29,
                            "source": {
                                "operResult": {
                                    "success": False,
                                    "type": 1,
                                    "msg": str(ge)
                                }
                            },
                            "timeStamp": now_ms()
                        }
                        await websocket.send(json.dumps(err_reply))

                elif isinstance(source, dict) and ("mars" in source or "setFighter" in source):
                    # Client formation update (3-ninja combat line-up)
                    print(f"[*] Received formation/fighter update from client: {source}", flush=True)
                    if "setFighter" in source:
                        new_mars = source.get("setFighter", {}).get("hids", [])
                    else:
                        new_mars = source.get("mars", [])

                    if isinstance(new_mars, list):
                        conn_m = get_db()
                        try:
                            with conn_m.cursor() as c_m:
                                cur_uid = 1
                                if str(current_user).isdigit():
                                    c_m.execute("SELECT id FROM users WHERE id = %s", (int(current_user),))
                                else:
                                    c_m.execute("SELECT id FROM users WHERE username = %s OR email = %s", (str(current_user), str(current_user)))
                                u_row = c_m.fetchone()
                                if u_row:
                                    cur_uid = u_row["id"]
                                
                                c_m.execute("UPDATE player_ninjas SET is_main = 0 WHERE user_id = %s", (cur_uid,))
                                seen_mars_nids = set()
                                final_mars = []
                                for idx, hid in enumerate(new_mars[:3]):
                                    if hid and int(hid) > 0:
                                        c_m.execute("SELECT ninja_id FROM player_ninjas WHERE id = %s AND user_id = %s", (int(hid), cur_uid))
                                        n_row = c_m.fetchone()
                                        if n_row and n_row["ninja_id"] not in seen_mars_nids:
                                            seen_mars_nids.add(n_row["ninja_id"])
                                            final_mars.append(int(hid))
                                            c_m.execute("UPDATE player_ninjas SET is_main = %s, deploy_slot = 0 WHERE id = %s AND user_id = %s", (idx + 1, int(hid), cur_uid))
                                        else:
                                            final_mars.append(0)
                                    else:
                                        final_mars.append(0)
                                conn_m.commit()
                        finally:
                            conn_m.close()

                    while len(final_mars) < 3:
                        final_mars.append(0)

                    reply = {
                        "type": 29,
                        "source": {
                            "operResult": {"success": True, "type": 1},
                            "heros": {"mars": final_mars[:3]}
                        },
                        "timeStamp": now_ms()
                    }
                    await websocket.send(json.dumps(reply))

                elif isinstance(source, dict) and ("aids" in source or "aidsPage" in source):
                    # Client deploy board update (HouYuanTuan 8-slot support)
                    print(f"[*] Received aids deploy update from client: {source}", flush=True)
                    new_aids = source.get("aids")
                    if not new_aids and "aidsPage" in source and isinstance(source["aidsPage"], dict):
                        new_aids = source["aidsPage"].get("aids")
                    if isinstance(new_aids, list):
                        conn_a = get_db()
                        try:
                            with conn_a.cursor() as c_a:
                                cur_uid = 1
                                if str(current_user).isdigit():
                                    c_a.execute("SELECT id FROM users WHERE id = %s", (int(current_user),))
                                else:
                                    c_a.execute("SELECT id FROM users WHERE username = %s OR email = %s", (str(current_user), str(current_user)))
                                u_row = c_a.fetchone()
                                if u_row:
                                    cur_uid = u_row["id"]

                                c_a.execute("UPDATE player_ninjas SET deploy_slot = 0 WHERE user_id = %s", (cur_uid,))
                                # Also get currently deployed ninja_ids in combat lineup (is_main > 0)
                                c_a.execute("SELECT ninja_id FROM player_ninjas WHERE user_id = %s AND is_main > 0", (cur_uid,))
                                seen_aid_nids = {r["ninja_id"] for r in c_a.fetchall()}
                                for idx, hid in enumerate(new_aids[:12]):
                                    if hid and int(hid) > 0:
                                        c_a.execute("SELECT ninja_id FROM player_ninjas WHERE id = %s AND user_id = %s", (int(hid), cur_uid))
                                        n_row = c_a.fetchone()
                                        if n_row and n_row["ninja_id"] not in seen_aid_nids:
                                            seen_aid_nids.add(n_row["ninja_id"])
                                            c_a.execute("UPDATE player_ninjas SET deploy_slot = %s, is_main = 0 WHERE id = %s AND user_id = %s", (idx + 1, int(hid), cur_uid))
                                conn_a.commit()
                        finally:
                            conn_a.close()

                    reply = {"type": 29, "source": {"operResult": {"success": True, "type": 1}}, "timeStamp": now_ms()}
                    await websocket.send(json.dumps(reply))

                elif isinstance(source, dict) and "studySkill" in source:
                    # Client Jutsu Training (Building 2 - Ninjutsu School)
                    s_info = source["studySkill"]
                    st_type = int(s_info.get("type", 0)) if isinstance(s_info, dict) else 0 # 0 = free, 1 = advanced
                    hid = int(s_info.get("hid", 0)) if isinstance(s_info, dict) else 0
                    idx = int(s_info.get("idx", 0)) if isinstance(s_info, dict) else 0
                    print(f"[*] Received studySkill: type={st_type}, hid={hid}, idx={idx} from {current_user}", flush=True)

                    conn_ss = get_db()
                    try:
                        with conn_ss.cursor() as c_ss:
                            cur_uid = 1
                            if str(current_user).isdigit():
                                c_ss.execute("SELECT * FROM users WHERE id = %s", (int(current_user),))
                            else:
                                c_ss.execute("SELECT * FROM users WHERE username = %s OR email = %s", (str(current_user), str(current_user)))
                            u_row = c_ss.fetchone()
                            if u_row:
                                cur_uid = u_row["id"]

                            now_sec = int(time.time())
                            today_str = datetime.datetime.now().strftime("%Y-%m-%d")
                            c_ss.execute("SELECT * FROM player_buildings WHERE user_id = %s AND building_id = 2", (cur_uid,))
                            pb2 = c_ss.fetchone()

                            free_draws = 5
                            last_produce = 0
                            if pb2:
                                last_produce = int(pb2.get("last_produce_time") or 0)
                                if pb2.get("last_free_date") == today_str:
                                    free_draws = int(pb2.get("free_draws") if pb2.get("free_draws") is not None else 5)
                                else:
                                    free_draws = 5

                            cd_duration = 600 # 10 minutes cooldown per free training
                            elapsed = now_sec - last_produce
                            remaining_cd = max(0, cd_duration - elapsed) if last_produce > 0 else 0

                            if st_type == 0:
                                if remaining_cd > 0:
                                    cd_min = remaining_cd // 60
                                    cd_rem_sec = remaining_cd % 60
                                    err_msg = f"Tunggu jeda: {cd_min:02d}:{cd_rem_sec:02d} sebelum latihan jutsu gratis berikutnya!"
                                    reply = {
                                        "type": 29,
                                        "source": {
                                            "operResult": {"success": False, "type": 1, "msg": err_msg}
                                        },
                                        "timeStamp": now_ms()
                                    }
                                    await websocket.send(json.dumps(reply))
                                    continue

                                if free_draws <= 0:
                                    err_msg = "Kesempatan gratis latihan jutsu hari ini sudah habis (0/5)!"
                                    reply = {
                                        "type": 29,
                                        "source": {
                                            "operResult": {"success": False, "type": 1, "msg": err_msg}
                                        },
                                        "timeStamp": now_ms()
                                    }
                                    await websocket.send(json.dumps(reply))
                                    continue

                                free_draws -= 1
                                last_produce = now_sec
                                remaining_cd = cd_duration
                                c_ss.execute("""
                                    INSERT INTO player_buildings (user_id, building_id, level, last_produce_time, free_draws, last_free_date)
                                    VALUES (%s, 2, 10, %s, %s, %s)
                                    ON DUPLICATE KEY UPDATE last_produce_time = %s, free_draws = %s, last_free_date = %s
                                """, (cur_uid, last_produce, free_draws, today_str, last_produce, free_draws, today_str))
                            else:
                                gold_cost = 50
                                cur_gold = int(u_row.get("gold") or 0)
                                if cur_gold < gold_cost:
                                    reply = {
                                        "type": 29,
                                        "source": {
                                            "operResult": {"success": False, "type": 1, "msg": "Gold tidak cukup untuk Advanced Train!"}
                                        },
                                        "timeStamp": now_ms()
                                    }
                                    await websocket.send(json.dumps(reply))
                                    continue
                                c_ss.execute("UPDATE users SET gold = gold - %s WHERE id = %s", (gold_cost, cur_uid))

                            c_ss.execute("SELECT id, name, grade FROM master_jutsus ORDER BY RAND() LIMIT 1")
                            j_skill = c_ss.fetchone()
                            new_skill_id = j_skill["id"] if j_skill else 1149

                            slot_col = f"jutsu_slot_{idx + 1}" if 0 <= idx <= 4 else "jutsu_slot_1"
                            if hid > 0:
                                c_ss.execute(f"UPDATE player_ninjas SET {slot_col} = %s WHERE id = %s AND user_id = %s", (new_skill_id, hid, cur_uid))

                            conn_ss.commit()

                            up_data = get_player_full_data(cur_uid)
                            reply = {
                                "type": 29,
                                "source": {
                                    "operResult": {
                                        "success": True,
                                        "type": 1,
                                        "msg": f"Berhasil melatih Jutsu: {j_skill['name']} ({j_skill['grade']}-Rank)!" if j_skill else "Jutsu berhasil dipelajari!"
                                    },
                                    "buildings": up_data["buildings"],
                                    "heros": up_data["heros"],
                                    "player": up_data["player"]
                                },
                                "timeStamp": now_ms()
                            }
                            await websocket.send(json.dumps(reply))
                    finally:
                        conn_ss.close()

                elif isinstance(source, dict) and "produceBuild" in source:
                    # Client building silver harvest / produce
                    build_val = source.get("produceBuild")
                    b_id = build_val.get("id", 2) if isinstance(build_val, dict) else int(build_val or 2)
                    print(f"[*] Received produceBuild for building {b_id} from client", flush=True)

                    now_sec = int(time.time())
                    is_on_cd = False
                    remaining_cd = 0
                    b_lv = 10
                    reward_silver = 2000
                    cd_sec = 3600
                    new_silver = 50000

                    conn_pb = get_db()
                    try:
                        with conn_pb.cursor() as c_pb:
                            # 1. Resolve user ID
                            cur_uid = 1
                            if str(current_user).isdigit():
                                c_pb.execute("SELECT id, silver FROM users WHERE id = %s", (int(current_user),))
                            else:
                                c_pb.execute("SELECT id, silver FROM users WHERE username = %s OR email = %s", (str(current_user), str(current_user)))
                            u_pb = c_pb.fetchone()
                            if u_pb:
                                cur_uid = u_pb["id"]
                                cur_silver = int(u_pb.get("silver") or 0)
                            else:
                                cur_silver = 50000

                            # 2. Get master building info
                            c_pb.execute("SELECT id, produce, cd FROM master_buildings WHERE id = %s", (b_id,))
                            mb_info = c_pb.fetchone()
                            if mb_info and mb_info.get("produce"):
                                m = re.search(r"silver\|(\d+)", mb_info["produce"])
                                if m:
                                    reward_silver = int(m.group(1))
                            elif b_id in (5, 6):
                                reward_silver = 4000

                            if mb_info and mb_info.get("cd"):
                                try:
                                    cd_sec = int(mb_info["cd"].split("|")[0]) * 60
                                except Exception:
                                    cd_sec = 3600
                            elif b_id in (5, 6):
                                cd_sec = 7200

                            # 3. Check cooldown in player_buildings
                            c_pb.execute("SELECT level, last_produce_time FROM player_buildings WHERE user_id = %s AND building_id = %s", (cur_uid, b_id))
                            pb_data = c_pb.fetchone()
                            last_time = pb_data.get("last_produce_time", 0) if pb_data else 0
                            b_lv = pb_data.get("level", 10) if pb_data else 10
                            elapsed = now_sec - last_time

                            if last_time > 0 and cd_sec > 0 and elapsed < cd_sec:
                                is_on_cd = True
                                remaining_cd = cd_sec - elapsed
                                new_silver = cur_silver
                            else:
                                # Cooldown passed: grant reward and save new timestamp
                                new_silver = cur_silver + reward_silver
                                c_pb.execute("UPDATE users SET silver = %s WHERE id = %s", (new_silver, cur_uid))
                                c_pb.execute("""
                                    INSERT INTO player_buildings (user_id, building_id, level, last_produce_time)
                                    VALUES (%s, %s, %s, %s)
                                    ON DUPLICATE KEY UPDATE last_produce_time = VALUES(last_produce_time)
                                """, (cur_uid, b_id, b_lv, now_sec))
                    finally:
                        conn_pb.close()

                    # 1. Dismiss network loading spinner
                    await websocket.send(json.dumps({"type": 11, "source": 0, "timeStamp": now_ms()}))

                    if is_on_cd:
                        print(f"[!] Building {b_id} harvest rejected: on cooldown ({remaining_cd}s remaining)", flush=True)
                        reply = {
                            "type": 29,
                            "source": {
                                "buildings": {
                                    "bd": {
                                        str(b_id): {
                                            "id": b_id,
                                            "lv": b_lv,
                                            "cd": [remaining_cd, 0, 0, 0]
                                        }
                                    }
                                }
                            },
                            "timeStamp": now_ms()
                        }
                        await websocket.send(json.dumps(reply))
                    else:
                        print(f"[+] Building {b_id} harvest success: +{reward_silver} silver (total: {new_silver}), cd started: {cd_sec}s", flush=True)
                        # 2. Send operResult type 9 + player silver + updated building cd
                        reply = {
                            "type": 29,
                            "source": {
                                "operResult": {
                                    "type": 9,
                                    "res": 0,
                                    "param": {
                                        "silver": reward_silver
                                    }
                                },
                                "player": {
                                    "silver": new_silver
                                },
                                "buildings": {
                                    "bd": {
                                        str(b_id): {
                                            "id": b_id,
                                            "lv": b_lv,
                                            "cd": [cd_sec, 0, 0, 0]
                                        }
                                    }
                                }
                            },
                            "timeStamp": now_ms()
                        }
                        await websocket.send(json.dumps(reply))

                else:
                    # Echo / Generic command ACK
                    print(f"[*] Handled generic command from client: {list(source.keys()) if isinstance(source, dict) else source}", flush=True)
                    # Dismiss loading spinner
                    await websocket.send(json.dumps({"type": 11, "source": 0, "timeStamp": now_ms()}))
                    reply = {
                        "type": 29,
                        "source": {
                            "operResult": {"success": True, "type": 1}
                        },
                        "timeStamp": now_ms()
                    }
                    await websocket.send(json.dumps(reply))

    except websockets.exceptions.ConnectionClosed as e:
        print(f"[-] Client {client_ip} disconnected: {e}", flush=True)
    except Exception as e:
        print(f"[!] Handler error: {e}", flush=True)

async def network_ip_monitor():
    try:
        if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sync_network.py')):
            from sync_network import get_current_local_ip, get_last_synced_ip, sync_network
            while True:
                await asyncio.sleep(15)
                curr = get_current_local_ip()
                last = get_last_synced_ip()
                if curr and last and curr != last:
                    print(f"\n[NETWORK CHANGE DETECTED] IP changed from {last} -> {curr}!", flush=True)
                    print("[*] Running background network auto-synchronizer...", flush=True)
                    try:
                        await asyncio.to_thread(sync_network, True)
                        print(f"[+] Successfully adapted to new IP: {curr}\n", flush=True)
                    except Exception as ex:
                        print(f"[!] Auto-sync error: {ex}", flush=True)
    except Exception:
        pass

async def main():
    print(f"===========================================================", flush=True)
    print(f" [*] Ninja Heroes Local Game WebSocket Server Starting...  ", flush=True)
    print(f" Database: {DB_NAME} on {DB_HOST}:{DB_PORT}                 ", flush=True)
    print(f"===========================================================", flush=True)

    # Start live network IP monitor in background
    asyncio.create_task(network_ip_monitor())

    candidate_ports = [
        int(os.environ.get('GAME_WS_PORT', 18080)),
        18080,
        28080,
        38080,
        48080,
        19001,
        6001,
        8080
    ]
    seen = set()
    ports_to_try = [p for p in candidate_ports if not (p in seen or seen.add(p))]

    server_main = None
    bound_port = None
    bound_host = None

    for host in ["127.0.0.1", "0.0.0.0"]:
        for p in ports_to_try:
            try:
                server_main = await serve(
                    handler,
                    host,
                    p,
                    compression=None,
                    ping_interval=None,
                    max_size=None
                )
                bound_port = p
                bound_host = host
                print(f"[+] Successfully listening on ws://{host}:{p}/nadsocket", flush=True)
                break
            except Exception as e:
                print(f"[i] Could not bind ws://{host}:{p}/nadsocket ({e}), trying next...", flush=True)
        if server_main:
            break

    if not server_main:
        raise RuntimeError("Failed to bind any WebSocket port on host!")

    # Write bound port to .game_port file
    port_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.game_port')
    try:
        with open(port_file, 'w', encoding='utf-8') as pf:
            pf.write(str(bound_port))
    except Exception:
        pass

    await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())

