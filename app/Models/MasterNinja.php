<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterNinja extends Model
{
    protected $table = 'master_ninjas';
    public $timestamps = false;

    protected $fillable = [
        'id', 'name', 'xmlfile', 'quality', 'grade',
        'chakra_type', 'element', 'base_hp', 'base_atk',
        'base_def', 'base_speed', 'special_jutsu_id',
        'description', 'gacha_available'
    ];

    public function specialJutsu()
    {
        return $this->belongsTo(MasterJutsu::class, 'special_jutsu_id', 'id');
    }
}
