<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterJutsu extends Model
{
    protected $table = 'master_jutsus';
    public $timestamps = false;

    protected $fillable = [
        'id', 'name', 'icon', 'quality', 'grade',
        'category', 'desc_dmg', 'desc_turn', 'probability',
        'turn_limit', 'alter_target', 'chakra_type', 'element', 'description'
    ];
}
