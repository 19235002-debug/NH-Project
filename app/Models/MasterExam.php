<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterExam extends Model
{
    protected $table = 'master_exams';
    protected $primaryKey = 'floor';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'floor', 'title', 'enemy_name', 'enemy_ninja_id',
        'difficulty', 'reward_silver', 'reward_gold', 'reward_exp'
    ];

    public function enemy()
    {
        return $this->belongsTo(MasterNinja::class, 'enemy_ninja_id', 'id');
    }
}
