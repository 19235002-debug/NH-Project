<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerJutsu extends Model
{
    protected $table = 'player_jutsus';
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'jutsu_id', 'quantity', 'created_at'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function jutsu()
    {
        return $this->belongsTo(MasterJutsu::class, 'jutsu_id');
    }
}
