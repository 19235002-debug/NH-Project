<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerNinja extends Model
{
    protected $table = 'player_ninjas';
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'ninja_id', 'level', 'exp', 'is_main', 'deploy_slot',
        'jutsu_slot_1', 'jutsu_slot_2', 'jutsu_slot_3', 'jutsu_slot_4', 'jutsu_slot_5',
        'summon_jutsu_id', 'biju_jutsu_id',
        'hp_growth', 'atk_growth', 'def_growth', 'speed_growth'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function master()
    {
        return $this->belongsTo(MasterNinja::class, 'ninja_id');
    }

    public function jutsu1()
    {
        return $this->belongsTo(MasterJutsu::class, 'jutsu_slot_1');
    }

    public function jutsu2()
    {
        return $this->belongsTo(MasterJutsu::class, 'jutsu_slot_2');
    }

    public function jutsu3()
    {
        return $this->belongsTo(MasterJutsu::class, 'jutsu_slot_3');
    }

    public function jutsu4()
    {
        return $this->belongsTo(MasterJutsu::class, 'jutsu_slot_4');
    }

    public function jutsu5()
    {
        return $this->belongsTo(MasterJutsu::class, 'jutsu_slot_5');
    }

    public function summonJutsu()
    {
        return $this->belongsTo(MasterJutsu::class, 'summon_jutsu_id');
    }

    public function bijuJutsu()
    {
        return $this->belongsTo(MasterJutsu::class, 'biju_jutsu_id');
    }

    // Calculated dynamic combat stats based on level
    public function getAtkAttribute(): int
    {
        $base = $this->master ? (int)$this->master->base_atk : 100;
        return $base + (($this->level - 1) * 15);
    }

    public function getDefAttribute(): int
    {
        $base = $this->master ? (int)$this->master->base_def : 80;
        return $base + (($this->level - 1) * 12);
    }

    public function getHpAttribute(): int
    {
        $base = $this->master ? (int)$this->master->base_hp : 500;
        return $base + (($this->level - 1) * 45);
    }

    public function getSpeedAttribute(): int
    {
        $base = $this->master ? (int)$this->master->base_speed : 90;
        return $base + (($this->level - 1) * 8);
    }

    public function getCombatPowerAttribute(): int
    {
        return $this->atk + $this->def + (int)($this->hp / 5) + $this->speed;
    }

    public function isDeployed(): bool
    {
        return in_array($this->is_main, [1, 2, 3]);
    }

    public function getSlotNameAttribute(): ?string
    {
        return match ((int)$this->is_main) {
            1 => 'Slot 1 (Leader)',
            2 => 'Slot 2 (Mid)',
            3 => 'Slot 3 (Rear)',
            default => null,
        };
    }
}

