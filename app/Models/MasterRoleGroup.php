<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterRoleGroup extends Model
{
    protected $table = 'master_role_groups';
    public $timestamps = false;

    protected $fillable = [
        'id', 'name', 'description', 'roles', 'alter_self', 'skill_id'
    ];

    public function getRoleIdsAttribute(): array
    {
        return array_map('intval', array_filter(explode('|', $this->roles)));
    }

    public function masterNinjas()
    {
        return MasterNinja::whereIn('id', $this->role_ids)->get();
    }

    public function jutsu()
    {
        return $this->belongsTo(MasterJutsu::class, 'skill_id');
    }

    public function getParsedStatsAttribute(): array
    {
        $stats = ['atk' => 0, 'def' => 0, 'hp' => 0, 'speed' => 0, 'backup_attack' => false];

        // 1. Parse authentic alter_self game ratios
        if (!empty($this->alter_self)) {
            preg_match_all('/alter\((.*?)\)/', $this->alter_self, $matches);
            foreach ($matches[1] as $clause) {
                parse_str(str_replace(',', '&', $clause), $params);
                $type = (int)($params['type'] ?? 0);
                $ratios = $params['ratios'] ?? '';

                $ratioVal = 0;
                if (str_contains($ratios, ';')) {
                    $parts = explode(';', $ratios);
                    $num = (int)end($parts);
                    $ratioVal = max(0, $num - 100);
                } elseif (is_numeric($ratios)) {
                    $ratioVal = abs((int)$ratios);
                }

                if ($type === 11) $stats['atk'] = max($stats['atk'], $ratioVal);
                if ($type === 12) $stats['def'] = max($stats['def'], $ratioVal);
                if ($type === 14) $stats['speed'] = max($stats['speed'], $ratioVal);
                if ($type === 3)  $stats['hp'] = max($stats['hp'], $ratioVal);
            }
        }

        // 2. Parse description text
        $desc = strtolower($this->description ?? '');
        if (str_contains($desc, 'backup attack') || (int)$this->skill_id > 0) {
            $stats['backup_attack'] = true;
        }

        if (preg_match('/(?:increase|increases) by (\d+)%/i', $desc, $m)) {
            $pct = (int)$m[1];
            if (str_contains($desc, 'attack')) $stats['atk'] = max($stats['atk'], $pct);
            if (str_contains($desc, 'defense')) $stats['def'] = max($stats['def'], $pct);
            if (str_contains($desc, 'hp')) $stats['hp'] = max($stats['hp'], $pct);
            if (str_contains($desc, 'agility')) $stats['speed'] = max($stats['speed'], $pct);
        }

        if (preg_match('/attack (?:increases|increase) by (\d+)%/i', $desc, $m)) {
            $stats['atk'] = max($stats['atk'], (int)$m[1]);
        }
        if (preg_match('/defense (?:increases|increase) by (\d+)%/i', $desc, $m)) {
            $stats['def'] = max($stats['def'], (int)$m[1]);
        }
        if (preg_match('/hp (?:increases|increase) by (\d+)%/i', $desc, $m)) {
            $stats['hp'] = max($stats['hp'], (int)$m[1]);
        }
        if (preg_match('/agility (?:increases|increase) by (\d+)%/i', $desc, $m)) {
            $stats['speed'] = max($stats['speed'], (int)$m[1]);
        }

        return $stats;
    }
}
