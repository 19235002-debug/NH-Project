<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterBeast extends Model
{
    protected $table = 'master_beasts';
    public $timestamps = false;

    protected $fillable = [
        'id', 'num_tails', 'name', 'icon', 'skills',
        'chapter', 'stage', 'cost', 'item_id', 'role_id', 'level'
    ];

    public function getSkillIdsAttribute(): array
    {
        return array_map('intval', array_filter(explode('|', $this->skills)));
    }

    public function jutsus()
    {
        return MasterJutsu::whereIn('id', $this->skill_ids)->get();
    }
}
