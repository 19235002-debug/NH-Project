<?php
/**
 * Authentic Game Data Ingestion Script
 * Ingests 100% of authentic game data directly from APK extracted tables:
 * - Role.js (220 Ninjas)
 * - Skill.js (349 Jutsus)
 * - Exam.js (151 Exam Floors)
 * - Level.js (151 Levels)
 * - Item.js (203 Items)
 * - Accessory.js (172 Accessories)
 * - Material.js (227 Materials)
 * - Beast.js (9 Tailed Beasts)
 * - Adventure.js (844 Stages)
 * - RoleGroup.js (262 Combos)
 * - QualityRef.js (8 Tiers)
 * - Building.js (17 Buildings)
 * - Const.js (70 Constants)
 * - Shop.js (524 Shop Items)
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

function parseTableFile(string $tableName): array {
    $filePath = __DIR__ . '/../apk_workspace/extracted_tables/assets/UI/tables/' . $tableName . '.js';
    if (!file_exists($filePath)) {
        throw new Exception("Table file not found: " . $filePath);
    }

    $text = file_get_contents($filePath);
    $eq = strpos($text, '=');
    if ($eq === false) return [];

    $start = strpos($text, '[', $eq);
    $end = strrpos($text, ']');
    if ($start === false || $end === false) return [];

    $json = substr($text, $start, $end - $start + 1);
    $data = json_decode($json, true);
    if ($data === null) {
        $clean = preg_replace('/,\s*\]/', ']', $json);
        $clean = preg_replace('/,\s*\}/', '}', $clean);
        $data = json_decode($clean, true);
    }

    return $data ?: [];
}

function qualityToGrade(int $quality): string {
    return match($quality) {
        1 => 'D',
        2 => 'C',
        3 => 'B',
        4 => 'A',
        5 => 'S',
        6 => 'SS',
        7 => 'SSS',
        8 => 'UR',
        default => 'D'
    };
}

function chakraToElement(int $chakra): string {
    return match($chakra) {
        1 => 'Fire',
        2 => 'Wind',
        3 => 'Lightning',
        4 => 'Earth',
        5 => 'Water',
        default => 'None'
    };
}

function runAuthenticIngestion(): array {
    $pdo = Database::getConnection();
    $driver = Database::getDriver();
    $stats = [];

    // Ensure utf8mb4 on MySQL
    if ($driver === 'mysql') {
        $pdo->exec("SET NAMES utf8mb4");
    }

    // 1. Recreate master tables with complete authentic schema
    $masterTables = [
        'master_ninjas', 'master_jutsus', 'master_exams', 'master_levels',
        'master_items', 'master_accessories', 'master_materials', 'master_beasts',
        'master_adventures', 'master_role_groups', 'master_quality_refs',
        'master_buildings', 'master_game_constants', 'master_shops'
    ];
    foreach ($masterTables as $t) {
        $pdo->exec("DROP TABLE IF EXISTS `$t`");
    }

    if ($driver === 'mysql') {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `master_ninjas` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `xmlfile` VARCHAR(100) NULL,
                `quality` INT NOT NULL DEFAULT 1,
                `grade` VARCHAR(10) NOT NULL DEFAULT 'D',
                `chakra_type` INT NOT NULL DEFAULT 0,
                `element` VARCHAR(20) NOT NULL DEFAULT 'None',
                `base_hp` INT NOT NULL DEFAULT 100,
                `base_atk` INT NOT NULL DEFAULT 20,
                `base_def` INT NOT NULL DEFAULT 15,
                `base_speed` INT NOT NULL DEFAULT 20,
                `special_jutsu_id` INT NOT NULL DEFAULT 0,
                `learnable_jutsus` TEXT NULL,
                `pos_top` INT NOT NULL DEFAULT 0,
                `pos_bottom` INT NOT NULL DEFAULT 0,
                `pos_left` INT NOT NULL DEFAULT 0,
                `pos_right` INT NOT NULL DEFAULT 0,
                `home_bg` INT NOT NULL DEFAULT 1,
                `description` TEXT NULL,
                `gacha_available` TINYINT NOT NULL DEFAULT 1,
                `image_url` VARCHAR(255) NULL,
                `title` VARCHAR(100) NOT NULL DEFAULT 'Shinobi'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_jutsus` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `description` TEXT NULL,
                `desc_dmg` VARCHAR(100) NULL,
                `desc_turn` INT NOT NULL DEFAULT 0,
                `probability` INT NOT NULL DEFAULT 20,
                `turn_limit` INT NOT NULL DEFAULT 0,
                `when_trigger` INT NOT NULL DEFAULT 2,
                `quality` INT NOT NULL DEFAULT 1,
                `grade` VARCHAR(10) NOT NULL DEFAULT 'D',
                `category` VARCHAR(30) NOT NULL DEFAULT 'Ninjutsu',
                `act_type` VARCHAR(30) NULL,
                `alter_target` TEXT NULL,
                `icon` VARCHAR(100) NULL,
                `chakra_type` INT NOT NULL DEFAULT 0,
                `element` VARCHAR(20) NOT NULL DEFAULT 'None',
                `timeline_ready` VARCHAR(150) NULL,
                `timeline_run` VARCHAR(150) NULL,
                `timeline_hit` VARCHAR(150) NULL,
                `effect_ready` VARCHAR(150) NULL,
                `effect_run` VARCHAR(150) NULL,
                `effect_b` VARCHAR(150) NULL,
                `refine_cost` INT NOT NULL DEFAULT 0,
                `trigger_rate` DECIMAL(4,2) NOT NULL DEFAULT 0.30,
                `damage_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.50,
                `effect_type` VARCHAR(50) NOT NULL DEFAULT 'none',
                `effect_value` INT NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_exams` (
                `id` INT PRIMARY KEY,
                `enemy_role_id` INT NOT NULL,
                `enemy_level` INT NOT NULL,
                `reward_exp` INT NOT NULL DEFAULT 0,
                `reward_rxp` INT NOT NULL DEFAULT 0,
                `reward_silver` INT NOT NULL DEFAULT 0,
                `drop_rate` FLOAT NOT NULL DEFAULT 0,
                `group_id` INT NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS `master_levels` (
                `level` INT PRIMARY KEY,
                `player_exp` INT NOT NULL,
                `ninja_rxp` INT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS `master_items` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `icon` VARCHAR(100) NULL,
                `tip` TEXT NULL,
                `category` INT NOT NULL DEFAULT 1,
                `sell_price` VARCHAR(100) NULL,
                `stack_max` INT NOT NULL DEFAULT 99,
                `level_req` INT NOT NULL DEFAULT 1,
                `quality` INT NOT NULL DEFAULT 1,
                `use_conditions` TEXT NULL,
                `use_effects` TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_accessories` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `icon` VARCHAR(100) NULL,
                `tip` TEXT NULL,
                `category` INT NOT NULL DEFAULT 1,
                `quality` INT NOT NULL DEFAULT 1,
                `grade` VARCHAR(10) NOT NULL DEFAULT 'D',
                `def_val` INT NOT NULL DEFAULT 0,
                `level_req` INT NOT NULL DEFAULT 1,
                `price` VARCHAR(100) NULL,
                `sell_price` VARCHAR(100) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_materials` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `icon` VARCHAR(100) NULL,
                `tip` TEXT NULL,
                `category` INT NOT NULL DEFAULT 1,
                `quality` INT NOT NULL DEFAULT 1,
                `price` VARCHAR(100) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_beasts` (
                `id` INT PRIMARY KEY,
                `num_tails` INT NOT NULL,
                `name` VARCHAR(100) NOT NULL,
                `icon` VARCHAR(100) NULL,
                `skills` VARCHAR(255) NULL,
                `chapter` VARCHAR(100) NULL,
                `stage` VARCHAR(100) NULL,
                `cost` INT NOT NULL DEFAULT 10,
                `item_id` INT NOT NULL DEFAULT 0,
                `role_id` INT NOT NULL DEFAULT 0,
                `level` INT NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_adventures` (
                `id` INT PRIMARY KEY,
                `type` INT NOT NULL DEFAULT 1,
                `chapter` INT NOT NULL DEFAULT 1,
                `stage` INT NOT NULL DEFAULT 1,
                `stage_label` INT NOT NULL DEFAULT 0,
                `energy_cost` INT NOT NULL DEFAULT 5,
                `bg` VARCHAR(100) NULL,
                `description` VARCHAR(255) NULL,
                `enemy` VARCHAR(100) NULL,
                `enemy_level` VARCHAR(50) NULL,
                `exp` INT NOT NULL DEFAULT 0,
                `rxp` INT NOT NULL DEFAULT 0,
                `silver` INT NOT NULL DEFAULT 0,
                `first_item` VARCHAR(100) NULL,
                `item_group` INT NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_role_groups` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `description` TEXT NULL,
                `roles` VARCHAR(100) NOT NULL,
                `skill_id` INT NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_quality_refs` (
                `id` INT PRIMARY KEY,
                `grade` VARCHAR(10) NOT NULL,
                `fight` INT NOT NULL DEFAULT 0,
                `ecsilver` INT NOT NULL DEFAULT 0,
                `merge_rate` INT NOT NULL DEFAULT 0,
                `merge_silver` INT NOT NULL DEFAULT 0,
                `merge_gold` INT NOT NULL DEFAULT 0,
                `raw_json` TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_buildings` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `icon` VARCHAR(100) NULL,
                `description` TEXT NULL,
                `produce` VARCHAR(100) NULL,
                `cd` VARCHAR(100) NULL,
                `up_level` VARCHAR(100) NULL,
                `func_cost` VARCHAR(100) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_game_constants` (
                `name` VARCHAR(100) PRIMARY KEY,
                `value` VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS `master_shops` (
                `onlyid` INT PRIMARY KEY,
                `shop_type` INT NOT NULL,
                `item_id` INT NOT NULL,
                `num` INT NOT NULL DEFAULT 1,
                `price` VARCHAR(100) NOT NULL,
                `order_idx` INT NOT NULL DEFAULT 0,
                `page` INT NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } else {
        // SQLite Schema
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS master_ninjas (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                xmlfile TEXT,
                quality INTEGER NOT NULL DEFAULT 1,
                grade TEXT NOT NULL DEFAULT 'D',
                chakra_type INTEGER NOT NULL DEFAULT 0,
                element TEXT NOT NULL DEFAULT 'None',
                base_hp INTEGER NOT NULL DEFAULT 100,
                base_atk INTEGER NOT NULL DEFAULT 20,
                base_def INTEGER NOT NULL DEFAULT 15,
                base_speed INTEGER NOT NULL DEFAULT 20,
                special_jutsu_id INTEGER NOT NULL DEFAULT 0,
                learnable_jutsus TEXT,
                pos_top INTEGER NOT NULL DEFAULT 0,
                pos_bottom INTEGER NOT NULL DEFAULT 0,
                pos_left INTEGER NOT NULL DEFAULT 0,
                pos_right INTEGER NOT NULL DEFAULT 0,
                home_bg INTEGER NOT NULL DEFAULT 1,
                description TEXT,
                gacha_available INTEGER NOT NULL DEFAULT 1,
                image_url TEXT,
                title TEXT NOT NULL DEFAULT 'Shinobi'
            );

            CREATE TABLE IF NOT EXISTS master_jutsus (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                desc_dmg TEXT,
                desc_turn INTEGER NOT NULL DEFAULT 0,
                probability INTEGER NOT NULL DEFAULT 20,
                turn_limit INTEGER NOT NULL DEFAULT 0,
                when_trigger INTEGER NOT NULL DEFAULT 2,
                quality INTEGER NOT NULL DEFAULT 1,
                grade TEXT NOT NULL DEFAULT 'D',
                category TEXT NOT NULL DEFAULT 'Ninjutsu',
                act_type TEXT,
                alter_target TEXT,
                icon TEXT,
                chakra_type INTEGER NOT NULL DEFAULT 0,
                element TEXT NOT NULL DEFAULT 'None',
                timeline_ready TEXT,
                timeline_run TEXT,
                timeline_hit TEXT,
                effect_ready TEXT,
                effect_run TEXT,
                effect_b TEXT,
                refine_cost INTEGER NOT NULL DEFAULT 0,
                trigger_rate REAL NOT NULL DEFAULT 0.30,
                damage_multiplier REAL NOT NULL DEFAULT 1.50,
                effect_type TEXT NOT NULL DEFAULT 'none',
                effect_value INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS master_exams (
                id INTEGER PRIMARY KEY,
                enemy_role_id INTEGER NOT NULL,
                enemy_level INTEGER NOT NULL,
                reward_exp INTEGER NOT NULL DEFAULT 0,
                reward_rxp INTEGER NOT NULL DEFAULT 0,
                reward_silver INTEGER NOT NULL DEFAULT 0,
                drop_rate REAL NOT NULL DEFAULT 0,
                group_id INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS master_levels (
                level INTEGER PRIMARY KEY,
                player_exp INTEGER NOT NULL,
                ninja_rxp INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS master_items (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                tip TEXT,
                category INTEGER NOT NULL DEFAULT 1,
                sell_price TEXT,
                stack_max INTEGER NOT NULL DEFAULT 99,
                level_req INTEGER NOT NULL DEFAULT 1,
                quality INTEGER NOT NULL DEFAULT 1,
                use_conditions TEXT,
                use_effects TEXT
            );

            CREATE TABLE IF NOT EXISTS master_accessories (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                tip TEXT,
                category INTEGER NOT NULL DEFAULT 1,
                quality INTEGER NOT NULL DEFAULT 1,
                grade TEXT NOT NULL DEFAULT 'D',
                def_val INTEGER NOT NULL DEFAULT 0,
                level_req INTEGER NOT NULL DEFAULT 1,
                price TEXT,
                sell_price TEXT
            );

            CREATE TABLE IF NOT EXISTS master_materials (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                tip TEXT,
                category INTEGER NOT NULL DEFAULT 1,
                quality INTEGER NOT NULL DEFAULT 1,
                price TEXT
            );

            CREATE TABLE IF NOT EXISTS master_beasts (
                id INTEGER PRIMARY KEY,
                num_tails INTEGER NOT NULL,
                name TEXT NOT NULL,
                icon TEXT,
                skills TEXT,
                chapter TEXT,
                stage TEXT,
                cost INTEGER NOT NULL DEFAULT 10,
                item_id INTEGER NOT NULL DEFAULT 0,
                role_id INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS master_adventures (
                id INTEGER PRIMARY KEY,
                type INTEGER NOT NULL DEFAULT 1,
                chapter INTEGER NOT NULL DEFAULT 1,
                stage INTEGER NOT NULL DEFAULT 1,
                stage_label INTEGER NOT NULL DEFAULT 0,
                energy_cost INTEGER NOT NULL DEFAULT 5,
                bg TEXT,
                description TEXT,
                enemy TEXT,
                enemy_level TEXT,
                exp INTEGER NOT NULL DEFAULT 0,
                rxp INTEGER NOT NULL DEFAULT 0,
                silver INTEGER NOT NULL DEFAULT 0,
                first_item TEXT,
                item_group INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS master_role_groups (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                roles TEXT NOT NULL,
                skill_id INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS master_quality_refs (
                id INTEGER PRIMARY KEY,
                grade TEXT NOT NULL,
                fight INTEGER NOT NULL DEFAULT 0,
                ecsilver INTEGER NOT NULL DEFAULT 0,
                merge_rate INTEGER NOT NULL DEFAULT 0,
                merge_silver INTEGER NOT NULL DEFAULT 0,
                merge_gold INTEGER NOT NULL DEFAULT 0,
                raw_json TEXT
            );

            CREATE TABLE IF NOT EXISTS master_buildings (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                description TEXT,
                produce TEXT,
                cd TEXT,
                up_level TEXT,
                func_cost TEXT
            );

            CREATE TABLE IF NOT EXISTS master_game_constants (
                name TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS master_shops (
                onlyid INTEGER PRIMARY KEY,
                shop_type INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                num INTEGER NOT NULL DEFAULT 1,
                price TEXT NOT NULL,
                order_idx INTEGER NOT NULL DEFAULT 0,
                page INTEGER NOT NULL DEFAULT 1
            );
        ");
    }

    $pdo->beginTransaction();
    try {
        // --- 1. Ingest Role.js (220 authentic Ninjas) ---
        $roles = parseTableFile('Role');
        $ninjaSql = ($driver === 'mysql')
            ? "INSERT INTO master_ninjas (id, name, xmlfile, quality, grade, chakra_type, element, base_hp, base_atk, base_def, base_speed, special_jutsu_id, learnable_jutsus, pos_top, pos_bottom, pos_left, pos_right, home_bg, description, gacha_available, image_url, title)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), xmlfile=VALUES(xmlfile), quality=VALUES(quality), grade=VALUES(grade), chakra_type=VALUES(chakra_type), element=VALUES(element), base_hp=VALUES(base_hp), base_atk=VALUES(base_atk), base_def=VALUES(base_def), base_speed=VALUES(base_speed), special_jutsu_id=VALUES(special_jutsu_id), learnable_jutsus=VALUES(learnable_jutsus), pos_top=VALUES(pos_top), pos_bottom=VALUES(pos_bottom), pos_left=VALUES(pos_left), pos_right=VALUES(pos_right), home_bg=VALUES(home_bg), description=VALUES(description), gacha_available=VALUES(gacha_available), image_url=VALUES(image_url), title=VALUES(title)"
            : "INSERT OR REPLACE INTO master_ninjas (id, name, xmlfile, quality, grade, chakra_type, element, base_hp, base_atk, base_def, base_speed, special_jutsu_id, learnable_jutsus, pos_top, pos_bottom, pos_left, pos_right, home_bg, description, gacha_available, image_url, title)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmtNinja = $pdo->prepare($ninjaSql);
        foreach ($roles as $r) {
            $q = (int)($r['quality'] ?? 1);
            $grade = qualityToGrade($q);
            $chk = (int)($r['chakra'] ?? 0);
            $element = chakraToElement($chk);
            $img = ($r['xmlfile'] ?? 'ninja') . '.png';
            $title = $grade . '-Rank Shinobi';

            $stmtNinja->execute([
                (int)$r['id'],
                $r['alt'] ?? 'Unknown Ninja',
                $r['xmlfile'] ?? '',
                $q,
                $grade,
                $chk,
                $element,
                (int)($r['hp'] ?? 300),
                (int)($r['att'] ?? 50),
                (int)($r['def'] ?? 50),
                (int)($r['agi'] ?? 50),
                (int)($r['skill'] ?? 0),
                $r['eskill'] ?? '',
                (int)($r['top'] ?? 0),
                (int)($r['bottom'] ?? 0),
                (int)($r['left'] ?? 0),
                (int)($r['right'] ?? 0),
                (int)($r['home'] ?? 1),
                $r['desc'] ?? '',
                (int)($r['gacha'] ?? 1),
                $img,
                $title
            ]);
        }
        $stats['master_ninjas'] = count($roles);

        // --- 2. Ingest Skill.js (349 authentic Jutsus) ---
        $skills = parseTableFile('Skill');
        $skillSql = ($driver === 'mysql')
            ? "INSERT INTO master_jutsus (id, name, description, desc_dmg, desc_turn, probability, turn_limit, when_trigger, quality, grade, category, act_type, alter_target, icon, chakra_type, element, timeline_ready, timeline_run, timeline_hit, effect_ready, effect_run, effect_b, refine_cost, trigger_rate, damage_multiplier, effect_type, effect_value)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), desc_dmg=VALUES(desc_dmg), desc_turn=VALUES(desc_turn), probability=VALUES(probability), turn_limit=VALUES(turn_limit), when_trigger=VALUES(when_trigger), quality=VALUES(quality), grade=VALUES(grade), category=VALUES(category), act_type=VALUES(act_type), alter_target=VALUES(alter_target), icon=VALUES(icon), chakra_type=VALUES(chakra_type), element=VALUES(element), timeline_ready=VALUES(timeline_ready), timeline_run=VALUES(timeline_run), timeline_hit=VALUES(timeline_hit), effect_ready=VALUES(effect_ready), effect_run=VALUES(effect_run), effect_b=VALUES(effect_b), refine_cost=VALUES(refine_cost), trigger_rate=VALUES(trigger_rate), damage_multiplier=VALUES(damage_multiplier), effect_type=VALUES(effect_type), effect_value=VALUES(effect_value)"
            : "INSERT OR REPLACE INTO master_jutsus (id, name, description, desc_dmg, desc_turn, probability, turn_limit, when_trigger, quality, grade, category, act_type, alter_target, icon, chakra_type, element, timeline_ready, timeline_run, timeline_hit, effect_ready, effect_run, effect_b, refine_cost, trigger_rate, damage_multiplier, effect_type, effect_value)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmtSkill = $pdo->prepare($skillSql);
        foreach ($skills as $s) {
            $q = (int)($s['quality'] ?? 1);
            $grade = qualityToGrade($q);
            $chk = (int)($s['chakra'] ?? 0);
            $element = chakraToElement($chk);

            // Compute damage multiplier from descDmg string (e.g. '240%Strength' -> 2.4)
            $dmgMultiplier = 1.5;
            if (!empty($s['descDmg']) && preg_match('/(\d+)%/', $s['descDmg'], $m)) {
                $dmgMultiplier = ((float)$m[1]) / 100.0;
            }

            // Determine status effect type from alterTarget
            $effType = 'none';
            $effVal = 0;
            $alter = $s['alterTarget'] ?? '';
            if (str_contains($alter, 'ban_action')) {
                $effType = 'stun';
                $effVal = 1;
            } elseif (str_contains($alter, 'type=3')) {
                $effType = 'burn';
                $effVal = 100;
            } elseif (str_contains($alter, 'type=2')) {
                $effType = 'armor_break';
                $effVal = 30;
            }

            $catName = match((int)($s['type'] ?? 0)) {
                1 => 'Taijutsu',
                2 => 'Genjutsu',
                3 => 'Forbidden Jutsu',
                default => 'Ninjutsu'
            };

            $prob = (int)($s['probability'] ?? 20);
            $triggerRate = max(0.05, min(1.0, $prob / 100.0));

            $stmtSkill->execute([
                (int)$s['id'],
                $s['alt'] ?? 'Secret Jutsu',
                $s['desc'] ?? '',
                $s['descDmg'] ?? '',
                (int)($s['descTurn'] ?? 0),
                $prob,
                (int)($s['limit'] ?? 0),
                (int)($s['when'] ?? 2),
                $q,
                $grade,
                $catName,
                (string)($s['actType'] ?? '1'),
                $alter,
                $s['icon'] ?? '',
                $chk,
                $element,
                $s['timelineAReady'] ?? '',
                $s['timelineARun'] ?? '',
                $s['timelineAHit'] ?? '',
                $s['effectAReady'] ?? '',
                $s['effectARun'] ?? '',
                $s['effectB'] ?? '',
                (int)($s['refinecost'] ?? 0),
                $triggerRate,
                $dmgMultiplier,
                $effType,
                $effVal
            ]);
        }
        $stats['master_jutsus'] = count($skills);

        // --- 3. Ingest Exam.js (151 authentic Exam Floors) ---
        $exams = parseTableFile('Exam');
        $examSql = ($driver === 'mysql')
            ? "INSERT INTO master_exams (id, enemy_role_id, enemy_level, reward_exp, reward_rxp, reward_silver, drop_rate, group_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE enemy_role_id=VALUES(enemy_role_id), enemy_level=VALUES(enemy_level), reward_exp=VALUES(reward_exp), reward_rxp=VALUES(reward_rxp), reward_silver=VALUES(reward_silver), drop_rate=VALUES(drop_rate), group_id=VALUES(group_id)"
            : "INSERT OR REPLACE INTO master_exams (id, enemy_role_id, enemy_level, reward_exp, reward_rxp, reward_silver, drop_rate, group_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmtExam = $pdo->prepare($examSql);
        foreach ($exams as $e) {
            $stmtExam->execute([
                (int)$e['id'],
                (int)$e['rid'],
                (int)$e['level'],
                (int)($e['exp'] ?? 0),
                (int)($e['rxp'] ?? 0),
                (int)($e['silver'] ?? 0),
                (float)($e['rate'] ?? 0.0),
                (int)($e['groupId'] ?? 0)
            ]);
        }
        $stats['master_exams'] = count($exams);

        // --- 4. Ingest Level.js (151 authentic Level Curves) ---
        $levels = parseTableFile('Level');
        $lvlSql = ($driver === 'mysql')
            ? "INSERT INTO master_levels (level, player_exp, ninja_rxp)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE player_exp=VALUES(player_exp), ninja_rxp=VALUES(ninja_rxp)"
            : "INSERT OR REPLACE INTO master_levels (level, player_exp, ninja_rxp)
               VALUES (?, ?, ?)";
        $stmtLvl = $pdo->prepare($lvlSql);
        foreach ($levels as $l) {
            $stmtLvl->execute([
                (int)$l['lv'],
                (int)($l['exp'] ?? 0),
                (int)($l['rxp'] ?? 0)
            ]);
        }
        $stats['master_levels'] = count($levels);

        // --- 5. Ingest Item.js (203 authentic Items) ---
        $items = parseTableFile('Item');
        $itemSql = ($driver === 'mysql')
            ? "INSERT INTO master_items (id, name, icon, tip, category, sell_price, stack_max, level_req, quality, use_conditions, use_effects)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), tip=VALUES(tip), category=VALUES(category), sell_price=VALUES(sell_price), stack_max=VALUES(stack_max), level_req=VALUES(level_req), quality=VALUES(quality), use_conditions=VALUES(use_conditions), use_effects=VALUES(use_effects)"
            : "INSERT OR REPLACE INTO master_items (id, name, icon, tip, category, sell_price, stack_max, level_req, quality, use_conditions, use_effects)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtItem = $pdo->prepare($itemSql);
        foreach ($items as $it) {
            $stmtItem->execute([
                (int)$it['id'],
                $it['alt'] ?? 'Item',
                $it['icon'] ?? '',
                $it['tip'] ?? '',
                (int)($it['category'] ?? 1),
                $it['sell'] ?? '',
                (int)($it['stackmax'] ?? 99),
                (int)($it['level'] ?? 1),
                (int)($it['quality'] ?? 1),
                $it['useConditons'] ?? '',
                $it['useEffects'] ?? ''
            ]);
        }
        $stats['master_items'] = count($items);

        // --- 6. Ingest Accessory.js (172 authentic Accessories) ---
        $accessories = parseTableFile('Accessory');
        $accSql = ($driver === 'mysql')
            ? "INSERT INTO master_accessories (id, name, icon, tip, category, quality, grade, def_val, level_req, price, sell_price)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), tip=VALUES(tip), category=VALUES(category), quality=VALUES(quality), grade=VALUES(grade), def_val=VALUES(def_val), level_req=VALUES(level_req), price=VALUES(price), sell_price=VALUES(sell_price)"
            : "INSERT OR REPLACE INTO master_accessories (id, name, icon, tip, category, quality, grade, def_val, level_req, price, sell_price)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtAcc = $pdo->prepare($accSql);
        foreach ($accessories as $a) {
            $q = (int)($a['quality'] ?? 1);
            $stmtAcc->execute([
                (int)$a['id'],
                $a['alt'] ?? 'Gear',
                $a['icon'] ?? '',
                $a['tip'] ?? '',
                (int)($a['category'] ?? 1),
                $q,
                qualityToGrade($q),
                (int)($a['def'] ?? 0),
                (int)($a['level'] ?? 1),
                $a['price'] ?? '',
                $a['sell'] ?? ''
            ]);
        }
        $stats['master_accessories'] = count($accessories);

        // --- 7. Ingest Material.js (227 authentic Materials) ---
        $materials = parseTableFile('Material');
        $matSql = ($driver === 'mysql')
            ? "INSERT INTO master_materials (id, name, icon, tip, category, quality, price)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), tip=VALUES(tip), category=VALUES(category), quality=VALUES(quality), price=VALUES(price)"
            : "INSERT OR REPLACE INTO master_materials (id, name, icon, tip, category, quality, price)
               VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmtMat = $pdo->prepare($matSql);
        foreach ($materials as $m) {
            $stmtMat->execute([
                (int)$m['id'],
                $m['alt'] ?? 'Material',
                $m['icon'] ?? '',
                $m['tip'] ?? '',
                (int)($m['category'] ?? 1),
                (int)($m['quality'] ?? 1),
                $m['price'] ?? ''
            ]);
        }
        $stats['master_materials'] = count($materials);

        // --- 8. Ingest Beast.js (9 authentic Bijuu) ---
        $beasts = parseTableFile('Beast');
        $beastSql = ($driver === 'mysql')
            ? "INSERT INTO master_beasts (id, num_tails, name, icon, skills, chapter, stage, cost, item_id, role_id, level)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE num_tails=VALUES(num_tails), name=VALUES(name), icon=VALUES(icon), skills=VALUES(skills), chapter=VALUES(chapter), stage=VALUES(stage), cost=VALUES(cost), item_id=VALUES(item_id), role_id=VALUES(role_id), level=VALUES(level)"
            : "INSERT OR REPLACE INTO master_beasts (id, num_tails, name, icon, skills, chapter, stage, cost, item_id, role_id, level)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtBeast = $pdo->prepare($beastSql);
        foreach ($beasts as $b) {
            $stmtBeast->execute([
                (int)$b['id'],
                (int)($b['num'] ?? 1),
                $b['name'] ?? 'Tailed Beast',
                $b['icon'] ?? '',
                $b['skills'] ?? '',
                (string)($b['chapter'] ?? ''),
                (string)($b['stage'] ?? ''),
                (int)($b['cost'] ?? 10),
                (int)($b['itemId'] ?? 0),
                (int)($b['role'] ?? 0),
                (int)($b['level'] ?? 1)
            ]);
        }
        $stats['master_beasts'] = count($beasts);

        // --- 9. Ingest Adventure.js (844 authentic Stages) ---
        $adventures = parseTableFile('Adventure');
        $advSql = ($driver === 'mysql')
            ? "INSERT INTO master_adventures (id, type, chapter, stage, stage_label, energy_cost, bg, description, enemy, enemy_level, exp, rxp, silver, first_item, item_group)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE type=VALUES(type), chapter=VALUES(chapter), stage=VALUES(stage), stage_label=VALUES(stage_label), energy_cost=VALUES(energy_cost), bg=VALUES(bg), description=VALUES(description), enemy=VALUES(enemy), enemy_level=VALUES(enemy_level), exp=VALUES(exp), rxp=VALUES(rxp), silver=VALUES(silver), first_item=VALUES(first_item), item_group=VALUES(item_group)"
            : "INSERT OR REPLACE INTO master_adventures (id, type, chapter, stage, stage_label, energy_cost, bg, description, enemy, enemy_level, exp, rxp, silver, first_item, item_group)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtAdv = $pdo->prepare($advSql);
        foreach ($adventures as $adv) {
            $stmtAdv->execute([
                (int)$adv['id'],
                (int)($adv['type'] ?? 1),
                (int)($adv['chapter'] ?? 1),
                (int)($adv['stage'] ?? 1),
                (int)($adv['stageLabel'] ?? 0),
                (int)($adv['energy'] ?? 5),
                $adv['bg'] ?? '',
                $adv['desc'] ?? '',
                $adv['enemy'] ?? '',
                $adv['level'] ?? '1',
                (int)($adv['exp'] ?? 0),
                (int)($adv['rxp'] ?? 0),
                (int)($adv['silver'] ?? 0),
                $adv['firstItem'] ?? '',
                (int)($adv['itemGroup'] ?? 0)
            ]);
        }
        $stats['master_adventures'] = count($adventures);

        // --- 10. Ingest RoleGroup.js (262 authentic Ninja Combos) ---
        $roleGroups = parseTableFile('RoleGroup');
        $rgSql = ($driver === 'mysql')
            ? "INSERT INTO master_role_groups (id, name, description, roles, skill_id)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), roles=VALUES(roles), skill_id=VALUES(skill_id)"
            : "INSERT OR REPLACE INTO master_role_groups (id, name, description, roles, skill_id)
               VALUES (?, ?, ?, ?, ?)";
        $stmtRg = $pdo->prepare($rgSql);
        foreach ($roleGroups as $rg) {
            $stmtRg->execute([
                (int)$rg['id'],
                $rg['name'] ?? '',
                $rg['desc'] ?? '',
                (string)($rg['roles'] ?? ''),
                (int)($rg['skill'] ?? 0)
            ]);
        }
        $stats['master_role_groups'] = count($roleGroups);

        // --- 11. Ingest QualityRef.js (8 authentic Tiers) ---
        $qualities = parseTableFile('QualityRef');
        $qSql = ($driver === 'mysql')
            ? "INSERT INTO master_quality_refs (id, grade, fight, ecsilver, merge_rate, merge_silver, merge_gold, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE grade=VALUES(grade), fight=VALUES(fight), ecsilver=VALUES(ecsilver), merge_rate=VALUES(merge_rate), merge_silver=VALUES(merge_silver), merge_gold=VALUES(merge_gold), raw_json=VALUES(raw_json)"
            : "INSERT OR REPLACE INTO master_quality_refs (id, grade, fight, ecsilver, merge_rate, merge_silver, merge_gold, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtQ = $pdo->prepare($qSql);
        foreach ($qualities as $q) {
            $qid = (int)$q['id'];
            $stmtQ->execute([
                $qid,
                qualityToGrade($qid),
                (int)($q['fight'] ?? 0),
                (int)($q['ecsilver'] ?? 0),
                (int)($q['mergeRate'] ?? 0),
                (int)($q['mergeSilver'] ?? 0),
                (int)($q['mergeGold'] ?? 0),
                json_encode($q)
            ]);
        }
        $stats['master_quality_refs'] = count($qualities);

        // --- 12. Ingest Building.js (17 authentic Village Buildings) ---
        $buildings = parseTableFile('Building');
        $bldSql = ($driver === 'mysql')
            ? "INSERT INTO master_buildings (id, name, icon, description, produce, cd, up_level, func_cost)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), description=VALUES(description), produce=VALUES(produce), cd=VALUES(cd), up_level=VALUES(up_level), func_cost=VALUES(func_cost)"
            : "INSERT OR REPLACE INTO master_buildings (id, name, icon, description, produce, cd, up_level, func_cost)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmtBld = $pdo->prepare($bldSql);
        foreach ($buildings as $b) {
            $stmtBld->execute([
                (int)$b['id'],
                $b['name'] ?? '',
                $b['icon'] ?? '',
                $b['desc'] ?? '',
                $b['produce'] ?? '',
                (string)($b['cd'] ?? ''),
                (string)($b['upLevel'] ?? ''),
                $b['funcCost'] ?? ''
            ]);
        }
        $stats['master_buildings'] = count($buildings);

        // --- 13. Ingest Const.js (70 authentic Constants) ---
        $constants = parseTableFile('Const');
        $cSql = ($driver === 'mysql')
            ? "INSERT INTO master_game_constants (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value=VALUES(value)"
            : "INSERT OR REPLACE INTO master_game_constants (name, value) VALUES (?, ?)";
        $stmtC = $pdo->prepare($cSql);
        foreach ($constants as $c) {
            $stmtC->execute([
                $c['name'],
                (string)$c['value']
            ]);
        }
        $stats['master_game_constants'] = count($constants);

        // --- 14. Ingest Shop.js (524 authentic Shop items) ---
        $shops = parseTableFile('Shop');
        $sSql = ($driver === 'mysql')
            ? "INSERT INTO master_shops (onlyid, shop_type, item_id, num, price, order_idx, page)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE shop_type=VALUES(shop_type), item_id=VALUES(item_id), num=VALUES(num), price=VALUES(price), order_idx=VALUES(order_idx), page=VALUES(page)"
            : "INSERT OR REPLACE INTO master_shops (onlyid, shop_type, item_id, num, price, order_idx, page)
               VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmtShop = $pdo->prepare($sSql);
        foreach ($shops as $sh) {
            $stmtShop->execute([
                (int)$sh['onlyid'],
                (int)$sh['shopType'],
                (int)$sh['id'],
                (int)($sh['num'] ?? 1),
                $sh['price'] ?? '',
                (int)($sh['order'] ?? 0),
                (int)($sh['page'] ?? 1)
            ]);
        }
        $stats['master_shops'] = count($shops);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    return [
        'driver' => $driver,
        'records_inserted' => $stats,
        'total_tables' => count($stats),
        'total_records' => array_sum($stats)
    ];
}

if (php_sapi_name() === 'cli' || basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'import_all_authentic_data.php') {
    $res = runAuthenticIngestion();
    if (php_sapi_name() === 'cli') {
        echo "=== AUTHENTIC GAME DATA INGESTION COMPLETE ===" . PHP_EOL;
        echo "Driver: " . $res['driver'] . PHP_EOL;
        foreach ($res['records_inserted'] as $tbl => $cnt) {
            echo sprintf("  - %-25s: %4d records\n", $tbl, $cnt);
        }
        echo "Total authentic records ingested: " . $res['total_records'] . PHP_EOL;
    } else {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $res]);
    }
}
